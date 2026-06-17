import { polylineLengthMeters } from "./geo.js";

/**
 * Build a directed graph from nodes + segments.
 * Direction is strict: a segment fromNodeId -> toNodeId creates ONE directed
 * edge only. A genuinely two-way festival road is stored as two segments.
 *
 * Only segments with status === "open" become traversable edges.
 *
 * Returns:
 *   nodes:    Map<id, node>
 *   adjacency: Map<nodeId, Array<edge>>  where edge = { to, weight, segment }
 *   segmentsById: Map<id, segment>
 */
export function buildGraph(nodes, segments) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map();
  const segmentsById = new Map();
  for (const n of nodes) adjacency.set(n.id, []);

  for (const seg of segments) {
    segmentsById.set(seg.id, seg);
    if (seg.status && seg.status !== "open") continue;
    if (!nodeMap.has(seg.fromNodeId) || !nodeMap.has(seg.toNodeId)) continue;

    const weight =
      typeof seg.lengthMeters === "number" && seg.lengthMeters > 0
        ? seg.lengthMeters
        : polylineLengthMeters(seg.polyline || []);

    if (!adjacency.has(seg.fromNodeId)) adjacency.set(seg.fromNodeId, []);
    adjacency.get(seg.fromNodeId).push({
      to: seg.toNodeId,
      weight,
      segment: seg,
    });
  }

  return { nodes: nodeMap, adjacency, segmentsById };
}

/** in-degree / out-degree counts per node, over OPEN segments only. */
export function degrees(graph) {
  const out = new Map();
  const inn = new Map();
  for (const id of graph.nodes.keys()) {
    out.set(id, 0);
    inn.set(id, 0);
  }
  for (const [from, edges] of graph.adjacency) {
    out.set(from, edges.length);
    for (const e of edges) inn.set(e.to, (inn.get(e.to) || 0) + 1);
  }
  return { out, inn };
}
