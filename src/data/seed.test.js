import { describe, it, expect } from "vitest";
import { seedNodes, seedSegments } from "./seed.js";
import { planRoute } from "../routing/router.js";
import { validateNetwork } from "../routing/validate.js";

describe("seed network (official Poson corridor demo data)", () => {
  it("passes validation with no errors", () => {
    const issues = validateNetwork(seedNodes, seedSegments);
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("routes the full corridor Pothanegama -> Yapanaya legally", () => {
    const pothanegama = seedNodes.find((n) => n.id === "pothanegama");
    const r = planRoute(seedNodes, seedSegments, { lat: pothanegama.lat, lng: pothanegama.lng }, "yapanaya");
    expect(r.ok).toBe(true);
    expect(r.nodePath[0]).toBe("pothanegama");
    expect(r.nodePath.at(-1)).toBe("yapanaya");
    // every step must be a real directed segment in the same direction
    for (let i = 0; i < r.segments.length; i++) {
      expect(r.segments[i].fromNodeId).toBe(r.nodePath[i]);
      expect(r.segments[i].toNodeId).toBe(r.nodePath[i + 1]);
    }
    expect(r.distanceMeters).toBeGreaterThan(1000);
  });

  it("reroutes around a closed segment instead of going the wrong way", () => {
    const pothanegama = seedNodes.find((n) => n.id === "pothanegama");
    // close the direct Thuparama->Lankarama leg; a legal detour must exist or fail cleanly
    const segs = seedSegments.map((s) => (s.id === "s7" ? { ...s, status: "closed" } : s));
    const r = planRoute(segs.length ? seedNodes : seedNodes, segs, { lat: pothanegama.lat, lng: pothanegama.lng }, "yapanaya");
    // With s7 closed, Thuparama can still reach Jetavana (s13) but not Yapanaya's
    // inbound spine; confirm the planner never emits the closed segment.
    if (r.ok) {
      expect(r.segments.find((s) => s.id === "s7")).toBeUndefined();
    } else {
      expect(["no-route", "far-from-network"]).toContain(r.reason);
    }
  });
});
