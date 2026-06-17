import type { NetworkNode, NetworkSegment, DirectedGraph, GraphEdge } from "@/types";
import { polylineLengthMeters } from "./geo";

export function buildGraph(nodes: NetworkNode[], segments: NetworkSegment[]): DirectedGraph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, GraphEdge[]>();
  const segmentsById = new Map<string, NetworkSegment>();

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
    adjacency.get(seg.fromNodeId)!.push({ to: seg.toNodeId, weight, segment: seg });
  }

  return { nodes: nodeMap, adjacency, segmentsById };
}

export function degrees(graph: DirectedGraph): {
  out: Map<string, number>;
  inn: Map<string, number>;
} {
  const out = new Map<string, number>();
  const inn = new Map<string, number>();
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
