import type { NetworkNode, NetworkSegment, LatLng, RouteResult, DirectedGraph, GraphEdge } from "@/types";
import { buildGraph } from "./graph";
import { haversineMeters, nearestOnPolyline, polylineLengthMeters } from "./geo";

export const DEFAULT_SPEED_KMH = 18;
export const SNAP_THRESHOLD_M = 300;

interface ShortestPathResult {
  nodePath: string[];
  edges: GraphEdge[];
  distanceMeters: number;
}

export function shortestPath(
  graph: DirectedGraph,
  startNodeId: string,
  goalNodeId: string,
  { useHeuristic = true } = {}
): ShortestPathResult | null {
  if (startNodeId === goalNodeId) {
    return { nodePath: [startNodeId], edges: [], distanceMeters: 0 };
  }
  if (!graph.nodes.has(startNodeId) || !graph.nodes.has(goalNodeId)) return null;

  const goal = graph.nodes.get(goalNodeId)!;
  const h = (id: string): number => {
    if (!useHeuristic) return 0;
    const n = graph.nodes.get(id)!;
    return haversineMeters(n, goal);
  };

  const dist = new Map<string, number>();
  const prev = new Map<string, { from: string; edge: GraphEdge }>();
  const visited = new Set<string>();
  dist.set(startNodeId, 0);

  const open: { id: string; f: number }[] = [{ id: startNodeId, f: h(startNodeId) }];

  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const { id } = open.splice(bi, 1)[0];
    if (visited.has(id)) continue;
    visited.add(id);
    if (id === goalNodeId) break;

    const g = dist.get(id)!;
    for (const edge of graph.adjacency.get(id) || []) {
      if (visited.has(edge.to)) continue;
      const cand = g + edge.weight;
      if (cand < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, cand);
        prev.set(edge.to, { from: id, edge });
        open.push({ id: edge.to, f: cand + h(edge.to) });
      }
    }
  }

  if (!dist.has(goalNodeId)) return null;

  const edges: GraphEdge[] = [];
  const nodePath = [goalNodeId];
  let cur = goalNodeId;
  while (cur !== startNodeId) {
    const step = prev.get(cur);
    if (!step) return null;
    edges.unshift(step.edge);
    nodePath.unshift(step.from);
    cur = step.from;
  }
  return { nodePath, edges, distanceMeters: dist.get(goalNodeId)! };
}

interface SnapResult {
  bestSeg: {
    point: LatLng;
    distMeters: number;
    remainingToEndMeters: number;
    segment: NetworkSegment;
  } | null;
  bestNode: { node: NetworkNode; distMeters: number } | null;
}

export function snapToNetwork(
  point: LatLng,
  nodes: NetworkNode[],
  openSegments: NetworkSegment[]
): SnapResult {
  let bestSeg: SnapResult["bestSeg"] = null;
  for (const seg of openSegments) {
    if (!seg.polyline || seg.polyline.length < 2) continue;
    const r = nearestOnPolyline(point, seg.polyline);
    if (r && (!bestSeg || r.distMeters < bestSeg.distMeters)) {
      bestSeg = { ...r, segment: seg };
    }
  }

  let bestNode: SnapResult["bestNode"] = null;
  for (const n of nodes) {
    const d = haversineMeters(point, n);
    if (!bestNode || d < bestNode.distMeters) bestNode = { node: n, distMeters: d };
  }

  return { bestSeg, bestNode };
}

export function planRoute(
  nodes: NetworkNode[],
  segments: NetworkSegment[],
  startPoint: LatLng,
  destNodeId: string,
  opts: { speedKmh?: number; snapThresholdMeters?: number } = {}
): RouteResult {
  const speedKmh = opts.speedKmh || DEFAULT_SPEED_KMH;
  const openSegments = segments.filter((s) => !s.status || s.status === "open");
  const graph = buildGraph(nodes, openSegments);

  if (!graph.nodes.has(destNodeId)) {
    return { ok: false, reason: "dest-missing" };
  }

  const { bestSeg, bestNode } = snapToNetwork(startPoint, nodes, openSegments);
  const threshold = opts.snapThresholdMeters || SNAP_THRESHOLD_M;

  type Candidate = { nodeId: string; connector: number; alongMeters: number };

  // Candidates from snapping the start onto the nearby network.
  const nearCandidates: Candidate[] = [];
  if (bestNode && bestNode.distMeters <= threshold) {
    nearCandidates.push({ nodeId: bestNode.node.id, connector: bestNode.distMeters, alongMeters: 0 });
  }
  if (bestSeg && bestSeg.distMeters <= threshold) {
    nearCandidates.push({
      nodeId: bestSeg.segment.toNodeId,
      connector: bestSeg.distMeters,
      alongMeters: bestSeg.remainingToEndMeters || 0,
    });
  }

  // Fallback candidates: every legal ENTRY node. Pilgrims legitimately approach
  // entries from outside the zone, and an entry can reach destinations that are
  // one-way "behind" the user's current position — so when the direct snap can't
  // reach the destination we route from the nearest usable entry instead.
  const entryCandidates: Candidate[] = nodes
    .filter((n) => n.isEntryPoint && n.id !== destNodeId)
    .map((n) => ({ nodeId: n.id, connector: haversineMeters(startPoint, n), alongMeters: 0 }));

  // ── Goals: ways to "arrive" at the destination ────────────────────────────
  // Normally we route to the destination node itself. But a stop can also sit
  // ON a one-way road rather than at a junction (e.g. a landmark mid-corridor).
  // In that case we route to that road's FROM junction and travel along it (a
  // legal one-way move) to the point nearest the stop.
  type Goal = { node: string; alongMeters: number; connector: number; tail?: LatLng[] };
  const destNodeObj = graph.nodes.get(destNodeId)!;
  const destPoint: LatLng = { lat: destNodeObj.lat, lng: destNodeObj.lng };
  const destThreshold = Math.max(threshold, 400);

  const goals: Goal[] = [{ node: destNodeId, alongMeters: 0, connector: 0 }];
  for (const seg of openSegments) {
    if (!seg.polyline || seg.polyline.length < 2) continue;
    if (seg.fromNodeId === destNodeId || seg.toNodeId === destNodeId) continue;
    const r = nearestOnPolyline(destPoint, seg.polyline);
    if (!r || r.distMeters > destThreshold) continue;
    const along = Math.max(0, polylineLengthMeters(seg.polyline) - (r.remainingToEndMeters || 0));
    const tail = seg.polyline.slice(0, r.index + 1).map((p) => ({ lat: p.lat, lng: p.lng }));
    tail.push({ lat: r.point.lat, lng: r.point.lng });
    goals.push({ node: seg.fromNodeId, alongMeters: along, connector: r.distMeters, tail });
  }

  type Chosen = Candidate & { path: ShortestPathResult; goal: Goal; totalMeters: number };
  const pickBest = (cands: Candidate[]): Chosen | null => {
    let chosen: Chosen | null = null;
    for (const c of cands) {
      for (const g of goals) {
        const path = shortestPath(graph, c.nodeId, g.node);
        if (!path) continue;
        const total = c.connector + c.alongMeters + path.distanceMeters + g.alongMeters + g.connector;
        if (!chosen || total < chosen.totalMeters) chosen = { ...c, path, goal: g, totalMeters: total };
      }
    }
    return chosen;
  };

  // Prefer a route from where the user actually is; otherwise route from an entry.
  let viaEntry = false;
  let best = pickBest(nearCandidates);
  if (!best) {
    best = pickBest(entryCandidates);
    viaEntry = true;
  }

  if (!best) {
    // Nothing reachable. If the user wasn't near the network at all, nudge them
    // to an entry; otherwise the destination is genuinely unreachable.
    const reason = nearCandidates.length === 0 && entryCandidates.length === 0
      ? "far-from-network"
      : "no-route";
    return {
      ok: false,
      reason,
      entryNodeId: bestNode?.node?.id ?? null,
      snappedPoint: bestSeg?.point ?? null,
    };
  }

  const polyline: LatLng[] = [];
  const pushPt = (pt: LatLng) => {
    const last = polyline[polyline.length - 1];
    if (!last || last.lat !== pt.lat || last.lng !== pt.lng) polyline.push(pt);
  };
  for (const edge of best.path.edges) {
    for (const pt of edge.segment.polyline) pushPt(pt);
  }
  // Final approach along the road the stop sits on.
  if (best.goal.tail) for (const pt of best.goal.tail) pushPt(pt);

  const distanceMeters = best.path.distanceMeters + best.alongMeters + best.goal.alongMeters;
  const etaMinutes = Math.round((distanceMeters / 1000 / speedKmh) * 60);

  return {
    ok: true,
    startNodeId: best.nodeId,
    destNodeId,
    connectorMeters: Math.round(best.connector),
    distanceMeters: Math.round(distanceMeters),
    etaMinutes,
    nodePath: best.path.nodePath,
    segments: best.path.edges.map((e) => e.segment),
    polyline,
    snappedPoint: bestSeg?.point ?? null,
    viaEntry,
  };
}
