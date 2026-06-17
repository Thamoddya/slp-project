import { buildGraph } from "./graph.js";
import { haversineMeters, nearestOnPolyline } from "./geo.js";

// Default average travel speed for ETA, in km/h. Festival traffic is slow.
export const DEFAULT_SPEED_KMH = 18;

// How far (metres) the user's GPS may be from the network and still be treated
// as "on/at it". Beyond this we tell them to head to the nearest entry point
// instead of inventing a long straight-line shortcut that ignores one-way rules.
export const SNAP_THRESHOLD_M = 300;

/**
 * Dijkstra over the directed graph. Direction is respected strictly: edges are
 * only traversed from -> to. Optional haversine A* heuristic toward the goal.
 *
 * Returns { nodePath: [nodeId...], edges: [edge...], distanceMeters } or null.
 */
export function shortestPath(graph, startNodeId, goalNodeId, { useHeuristic = true } = {}) {
  if (startNodeId === goalNodeId) {
    return { nodePath: [startNodeId], edges: [], distanceMeters: 0 };
  }
  if (!graph.nodes.has(startNodeId) || !graph.nodes.has(goalNodeId)) return null;

  const goal = graph.nodes.get(goalNodeId);
  const h = (id) => {
    if (!useHeuristic) return 0;
    const n = graph.nodes.get(id);
    return haversineMeters(n, goal);
  };

  const dist = new Map(); // gScore
  const prev = new Map(); // nodeId -> { from, edge }
  const visited = new Set();
  dist.set(startNodeId, 0);

  // Simple binary-heap-free priority queue: small graphs, linear scan is fine,
  // but we keep an array sorted-on-pop to stay O(E log V)-ish in practice.
  const open = [{ id: startNodeId, f: h(startNodeId) }];

  while (open.length) {
    // pop lowest f
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const { id } = open.splice(bi, 1)[0];
    if (visited.has(id)) continue;
    visited.add(id);

    if (id === goalNodeId) break;

    const g = dist.get(id);
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

  // reconstruct
  const edges = [];
  const nodePath = [goalNodeId];
  let cur = goalNodeId;
  while (cur !== startNodeId) {
    const step = prev.get(cur);
    if (!step) return null;
    edges.unshift(step.edge);
    nodePath.unshift(step.from);
    cur = step.from;
  }
  return { nodePath, edges, distanceMeters: dist.get(goalNodeId) };
}

/**
 * Snap an arbitrary GPS point to the routable network.
 * Returns { bestSeg, bestNode }:
 *   bestSeg  = nearest OPEN segment, with perpendicular distMeters + the
 *              forward remainingToEndMeters to its toNode (one-way safe).
 *   bestNode = globally nearest node, with straight-line distMeters.
 */
export function snapToNetwork(point, nodes, openSegments) {
  let bestSeg = null;
  for (const seg of openSegments) {
    if (!seg.polyline || seg.polyline.length < 2) continue;
    const r = nearestOnPolyline(point, seg.polyline);
    if (r && (!bestSeg || r.distMeters < bestSeg.distMeters)) {
      bestSeg = { ...r, segment: seg };
    }
  }

  let bestNode = null;
  for (const n of nodes) {
    const d = haversineMeters(point, n);
    if (!bestNode || d < bestNode.distMeters) bestNode = { node: n, distMeters: d };
  }

  return { bestSeg, bestNode };
}

/**
 * High-level route planner used by the app.
 *
 * @param {Array} nodes
 * @param {Array} segments   (all; open filtered internally)
 * @param {{lat,lng}} startPoint     raw GPS / chosen entry point
 * @param {string} destNodeId        destination node id
 * @param {object} opts { speedKmh }
 *
 * Resolution strategy for the start:
 *  - snap start point to nearest open segment; both endpoints of that segment
 *    are candidate entry nodes. Also consider the globally nearest node.
 *  - run Dijkstra from each candidate to the destination; pick the route whose
 *    (connector distance + path distance) is smallest. This keeps one-way
 *    correctness: we never assume we can travel against a segment.
 */
export function planRoute(nodes, segments, startPoint, destNodeId, opts = {}) {
  const speedKmh = opts.speedKmh || DEFAULT_SPEED_KMH;
  const openSegments = segments.filter((s) => !s.status || s.status === "open");
  const graph = buildGraph(nodes, openSegments);

  if (!graph.nodes.has(destNodeId)) {
    return { ok: false, reason: "dest-missing" };
  }

  const { bestSeg, bestNode } = snapToNetwork(startPoint, nodes, openSegments);
  const threshold = opts.snapThresholdMeters || SNAP_THRESHOLD_M;

  // Build entry candidates. Each carries:
  //   connector   = short perpendicular/straight hop from GPS onto the network
  //   alongMeters = real on-road travel already implied by the entry (counts
  //                 toward the displayed route distance)
  // We only accept candidates the user is genuinely near (connector <= threshold)
  // so we never fabricate a long straight-line shortcut that ignores one-way rules.
  const candidates = []; // { nodeId, connector, alongMeters }

  // Nearest junction — added first so it wins ties (routes start at a real node).
  if (bestNode && bestNode.distMeters <= threshold) {
    candidates.push({ nodeId: bestNode.node.id, connector: bestNode.distMeters, alongMeters: 0 });
  }
  // Mid-segment join: one-way safe — you may only proceed toward the toNode.
  if (bestSeg && bestSeg.distMeters <= threshold) {
    candidates.push({
      nodeId: bestSeg.segment.toNodeId,
      connector: bestSeg.distMeters,
      alongMeters: bestSeg.remainingToEndMeters || 0,
    });
  }

  if (candidates.length === 0) {
    // User is too far from the network — guide them to the nearest entry point.
    return {
      ok: false,
      reason: "far-from-network",
      entryNodeId: bestNode?.node?.id ?? null,
      snappedPoint: bestSeg?.point ?? null,
    };
  }

  let best = null;
  for (const c of candidates) {
    const path = shortestPath(graph, c.nodeId, destNodeId);
    if (!path) continue;
    const total = c.connector + c.alongMeters + path.distanceMeters;
    if (!best || total < best.totalMeters) {
      best = { ...c, path, totalMeters: total };
    }
  }

  if (!best) {
    // Near the network but no legal route to the destination (direction/closure).
    return {
      ok: false,
      reason: "no-route",
      entryNodeId: bestNode?.node?.id ?? null,
      snappedPoint: bestSeg?.point ?? null,
    };
  }

  // Joined polyline for display.
  const polyline = [];
  for (const edge of best.path.edges) {
    const seg = edge.segment;
    const pts = seg.fromNodeId === edge.segment.fromNodeId ? seg.polyline : seg.polyline;
    for (const pt of pts) {
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
  };
}
