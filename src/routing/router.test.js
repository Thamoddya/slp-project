import { describe, it, expect } from "vitest";
import { buildGraph, degrees } from "./graph.js";
import { shortestPath, planRoute } from "./router.js";
import { haversineMeters, nearestOnSegment, polylineLengthMeters } from "./geo.js";

// A tiny made-up grid near Anuradhapura. Coordinates are illustrative.
// A -- B -- C   (top row)
//      |
//      D        (below B)
const nodes = [
  { id: "A", name_en: "A", name_si: "A", lat: 8.350, lng: 80.380, isEntryPoint: true, isExitPoint: false },
  { id: "B", name_en: "B", name_si: "B", lat: 8.350, lng: 80.390 },
  { id: "C", name_en: "C", name_si: "C", lat: 8.350, lng: 80.400, isExitPoint: true },
  { id: "D", name_en: "D", name_si: "D", lat: 8.340, lng: 80.390, isExitPoint: true },
];

const seg = (id, from, to, status = "open") => ({
  id,
  fromNodeId: from,
  toNodeId: to,
  status,
  name_en: id,
  name_si: id,
  polyline: [
    { lat: nodes.find((n) => n.id === from).lat, lng: nodes.find((n) => n.id === from).lng },
    { lat: nodes.find((n) => n.id === to).lat, lng: nodes.find((n) => n.id === to).lng },
  ],
});

describe("geo", () => {
  it("haversine is symmetric and ~0 for identical points", () => {
    const a = { lat: 8.35, lng: 80.38 };
    const b = { lat: 8.36, lng: 80.39 };
    expect(haversineMeters(a, a)).toBeCloseTo(0, 5);
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 5);
  });

  it("polyline length sums segments", () => {
    const pts = [{ lat: 8.35, lng: 80.38 }, { lat: 8.35, lng: 80.39 }, { lat: 8.35, lng: 80.40 }];
    const total = polylineLengthMeters(pts);
    expect(total).toBeGreaterThan(2000);
    expect(total).toBeLessThan(2400);
  });

  it("nearestOnSegment clamps t to [0,1]", () => {
    const a = { lat: 8.35, lng: 80.38 };
    const b = { lat: 8.35, lng: 80.40 };
    const before = nearestOnSegment({ lat: 8.35, lng: 80.37 }, a, b);
    expect(before.t).toBe(0);
    const after = nearestOnSegment({ lat: 8.35, lng: 80.41 }, a, b);
    expect(after.t).toBe(1);
  });
});

describe("directed routing — one-way correctness", () => {
  it("routes forward along one-way segments", () => {
    const segments = [seg("AB", "A", "B"), seg("BC", "B", "C")];
    const g = buildGraph(nodes, segments);
    const r = shortestPath(g, "A", "C");
    expect(r).not.toBeNull();
    expect(r.nodePath).toEqual(["A", "B", "C"]);
  });

  it("REFUSES to travel against a one-way segment", () => {
    // Only A->B and B->C exist. Going C -> A must be impossible.
    const segments = [seg("AB", "A", "B"), seg("BC", "B", "C")];
    const g = buildGraph(nodes, segments);
    const r = shortestPath(g, "C", "A");
    expect(r).toBeNull();
  });

  it("uses a legal detour rather than reversing", () => {
    // A->B, B->C, and a back loop C->D->? not connecting to A means C cannot reach A.
    const segments = [seg("AB", "A", "B"), seg("BD", "B", "D"), seg("BC", "B", "C")];
    const g = buildGraph(nodes, segments);
    // A can reach D via B
    expect(shortestPath(g, "A", "D").nodePath).toEqual(["A", "B", "D"]);
    // but D cannot reach C (no outgoing edges from D)
    expect(shortestPath(g, "D", "C")).toBeNull();
  });

  it("excludes closed segments from the graph", () => {
    const segments = [seg("AB", "A", "B"), seg("BC", "B", "C", "closed")];
    const g = buildGraph(nodes, segments);
    expect(shortestPath(g, "A", "C")).toBeNull();
    expect(shortestPath(g, "A", "B").nodePath).toEqual(["A", "B"]);
  });

  it("picks the shorter of two legal paths", () => {
    // direct A->C plus longer A->B->C. Direct should win.
    const direct = seg("AC", "A", "C");
    const segments = [seg("AB", "A", "B"), seg("BC", "B", "C"), direct];
    const g = buildGraph(nodes, segments);
    const r = shortestPath(g, "A", "C");
    expect(r.nodePath).toEqual(["A", "C"]);
  });
});

describe("degrees / validation helpers", () => {
  it("computes in/out degree over open segments", () => {
    const segments = [seg("AB", "A", "B"), seg("BC", "B", "C")];
    const g = buildGraph(nodes, segments);
    const { inn, out } = degrees(g);
    expect(out.get("A")).toBe(1);
    expect(inn.get("A")).toBe(0); // dead-start
    expect(out.get("C")).toBe(0); // dead-end
    expect(inn.get("C")).toBe(1);
  });
});

describe("planRoute — start snapping", () => {
  it("snaps a GPS point near A and routes to C", () => {
    const segments = [seg("AB", "A", "B"), seg("BC", "B", "C")];
    const start = { lat: 8.3501, lng: 80.3799 }; // ~near A
    const r = planRoute(nodes, segments, start, "C");
    expect(r.ok).toBe(true);
    expect(r.nodePath[0]).toBe("A");
    expect(r.nodePath[r.nodePath.length - 1]).toBe("C");
    expect(r.distanceMeters).toBeGreaterThan(0);
    expect(r.etaMinutes).toBeGreaterThanOrEqual(0);
  });

  it("reports no-route when destination is unreachable by direction", () => {
    const segments = [seg("AB", "A", "B"), seg("BC", "B", "C")];
    const start = { lat: 8.3501, lng: 80.4001 }; // near C
    const r = planRoute(nodes, segments, start, "A"); // C cannot reach A
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-route");
  });
});
