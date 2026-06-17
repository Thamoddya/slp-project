import { buildGraph, degrees } from "./graph.js";

// Pre-publish safety checks on the directed network. Wrong directions are a
// safety risk, so this runs before a plan goes live.
//
// Returns an array of issues: { level: "error"|"warn", code, nodeId?, names? }.
export function validateNetwork(nodes, segments) {
  const issues = [];
  const open = segments.filter((s) => !s.status || s.status === "open");
  const graph = buildGraph(nodes, open);
  const { inn, out } = degrees(graph);

  const exitIds = new Set(nodes.filter((n) => n.isExitPoint).map((n) => n.id));
  const entryIds = nodes.filter((n) => n.isEntryPoint).map((n) => n.id);

  // 1. Every entry point must reach at least one exit point.
  for (const startId of entryIds) {
    if (!canReachAnyExit(graph, startId, exitIds)) {
      const n = graph.nodes.get(startId);
      issues.push({ level: "error", code: "unreachable", nodeId: startId, name: n });
    }
  }

  // 2. Dead-end / unreachable / orphan junctions.
  for (const n of nodes) {
    const o = out.get(n.id) || 0;
    const i = inn.get(n.id) || 0;
    if (o === 0 && i === 0) {
      issues.push({ level: "warn", code: "orphan", nodeId: n.id, name: n });
    } else if (o === 0 && !n.isExitPoint) {
      issues.push({ level: "warn", code: "deadEnd", nodeId: n.id, name: n });
    } else if (i === 0 && !n.isEntryPoint) {
      issues.push({ level: "warn", code: "deadStart", nodeId: n.id, name: n });
    }
  }

  // 3. Duplicate / contradictory directed edges (same from->to twice).
  const seen = new Map();
  for (const s of open) {
    const key = s.fromNodeId + ">" + s.toNodeId;
    if (seen.has(key)) {
      issues.push({
        level: "warn",
        code: "duplicate",
        from: graph.nodes.get(s.fromNodeId),
        to: graph.nodes.get(s.toNodeId),
      });
    }
    seen.set(key, true);
  }

  return issues;
}

function canReachAnyExit(graph, startId, exitIds) {
  if (exitIds.has(startId)) return true;
  const seen = new Set([startId]);
  const stack = [startId];
  while (stack.length) {
    const cur = stack.pop();
    for (const e of graph.adjacency.get(cur) || []) {
      if (exitIds.has(e.to)) return true;
      if (!seen.has(e.to)) {
        seen.add(e.to);
        stack.push(e.to);
      }
    }
  }
  return false;
}
