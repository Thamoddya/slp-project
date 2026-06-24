import type { NetworkNode, NetworkSegment, DirectedGraph, GraphEdge, LatLng } from "@/types";
import { polylineLengthMeters, nearestOnPolyline } from "./geo";

// A junction placed within this distance of a road's traced path is treated as
// lying ON that road, so the road is virtually split there in the graph. Small
// enough to only catch nodes the admin deliberately placed on the corridor.
const SPLIT_TOLERANCE_M = 25;

function dedupe(pts: LatLng[]): LatLng[] {
  const out: LatLng[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || last.lat !== p.lat || last.lng !== p.lng) out.push(p);
  }
  return out;
}

export function buildGraph(nodes: NetworkNode[], segments: NetworkSegment[]): DirectedGraph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, GraphEdge[]>();
  const segmentsById = new Map<string, NetworkSegment>();

  for (const n of nodes) adjacency.set(n.id, []);

  const addEdge = (from: string, to: string, weight: number, segment: NetworkSegment) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push({ to, weight: Math.max(1, weight), segment });
  };

  for (const seg of segments) {
    segmentsById.set(seg.id, seg);
    if (seg.status && seg.status !== "open") continue;
    if (!nodeMap.has(seg.fromNodeId) || !nodeMap.has(seg.toNodeId)) continue;

    const poly = seg.polyline || [];
    const storedLen =
      typeof seg.lengthMeters === "number" && seg.lengthMeters > 0
        ? seg.lengthMeters
        : polylineLengthMeters(poly);

    if (poly.length < 2) {
      addEdge(seg.fromNodeId, seg.toNodeId, storedLen, seg);
      continue;
    }

    // Find junctions (other than the endpoints) that sit on this road's path.
    type Stop = { id: string; along: number; index: number; point: LatLng };
    const polyLen = polylineLengthMeters(poly);
    const vias: Stop[] = [];
    for (const n of nodes) {
      if (n.id === seg.fromNodeId || n.id === seg.toNodeId) continue;
      const r = nearestOnPolyline({ lat: n.lat, lng: n.lng }, poly);
      if (r && r.distMeters <= SPLIT_TOLERANCE_M) {
        vias.push({
          id: n.id,
          along: polyLen - (r.remainingToEndMeters || 0),
          index: r.index,
          point: { lat: r.point.lat, lng: r.point.lng },
        });
      }
    }

    // No junctions on it → keep the road as a single edge (original behaviour).
    if (vias.length === 0) {
      addEdge(seg.fromNodeId, seg.toNodeId, storedLen, seg);
      continue;
    }

    // Split the road into directed sub-edges between consecutive junctions,
    // preserving the one-way direction (from → to along the same path).
    vias.sort((a, b) => a.along - b.along);
    const stops: Stop[] = [
      { id: seg.fromNodeId, along: 0, index: -1, point: { lat: poly[0].lat, lng: poly[0].lng } },
      ...vias,
      {
        id: seg.toNodeId,
        along: polyLen,
        index: poly.length - 1,
        point: { lat: poly[poly.length - 1].lat, lng: poly[poly.length - 1].lng },
      },
    ];
    const scale = storedLen / (polyLen || 1); // keep summed weights == stored length

    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (a.id === b.id) continue;
      const subPts: LatLng[] = [a.point];
      for (let k = a.index + 1; k <= b.index; k++) subPts.push({ lat: poly[k].lat, lng: poly[k].lng });
      subPts.push(b.point);
      const sub = dedupe(subPts);
      const w = Math.max(1, (b.along - a.along) * scale);
      addEdge(a.id, b.id, w, {
        ...seg,
        fromNodeId: a.id,
        toNodeId: b.id,
        polyline: sub,
        lengthMeters: Math.round(w),
      });
    }
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
