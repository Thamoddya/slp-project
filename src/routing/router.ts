import type { NetworkNode, NetworkSegment, LatLng, RouteResult, DirectedGraph, GraphEdge } from "@/types";
import { buildGraph } from "./graph";
import { haversineMeters, nearestOnPolyline } from "./geo";

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

  const candidates: { nodeId: string; connector: number; alongMeters: number }[] = [];

  if (bestNode && bestNode.distMeters <= threshold) {
    candidates.push({ nodeId: bestNode.node.id, connector: bestNode.distMeters, alongMeters: 0 });
  }
  if (bestSeg && bestSeg.distMeters <= threshold) {
    candidates.push({
      nodeId: bestSeg.segment.toNodeId,
      connector: bestSeg.distMeters,
      alongMeters: bestSeg.remainingToEndMeters || 0,
    });
  }

  // Outside the one-way zone: pilgrims legitimately approach entry points from
  // far away, so fall back to routing from the nearest legal ENTRY node rather
  // than refusing. (Direction correctness is unaffected — the route still runs
  // strictly along the directed segments from that entry.)
  let viaEntry = false;
  if (candidates.length === 0) {
    const entries = nodes.filter((n) => n.isEntryPoint);
    if (entries.length === 0) {
      return {
        ok: false,
        reason: "far-from-network",
        entryNodeId: bestNode?.node?.id ?? null,
        snappedPoint: bestSeg?.point ?? null,
      };
    }
    for (const n of entries) {
      candidates.push({ nodeId: n.id, connector: haversineMeters(startPoint, n), alongMeters: 0 });
    }
    viaEntry = true;
  }

  let best: {
    nodeId: string;
    connector: number;
    alongMeters: number;
    path: ShortestPathResult;
    totalMeters: number;
  } | null = null;

  for (const c of candidates) {
    const path = shortestPath(graph, c.nodeId, destNodeId);
    if (!path) continue;
    const total = c.connector + c.alongMeters + path.distanceMeters;
    if (!best || total < best.totalMeters) {
      best = { ...c, path, totalMeters: total };
    }
  }

  if (!best) {
    return {
      ok: false,
      reason: "no-route",
      entryNodeId: bestNode?.node?.id ?? null,
      snappedPoint: bestSeg?.point ?? null,
    };
  }

  const polyline: LatLng[] = [];
  for (const edge of best.path.edges) {
    const seg = edge.segment;
    for (const pt of seg.polyline) {
      const last = polyline[polyline.length - 1];
      if (!last || last.lat !== pt.lat || last.lng !== pt.lng) polyline.push(pt);
    }
  }

  const distanceMeters = best.path.distanceMeters + best.alongMeters;
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
