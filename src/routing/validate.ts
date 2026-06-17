import type { NetworkNode, NetworkSegment, ValidationIssue, DirectedGraph } from "@/types";
import { buildGraph, degrees } from "./graph";

export function validateNetwork(
  nodes: NetworkNode[],
  segments: NetworkSegment[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const open = segments.filter((s) => !s.status || s.status === "open");
  const graph = buildGraph(nodes, open);
  const { inn, out } = degrees(graph);

  const exitIds = new Set(nodes.filter((n) => n.isExitPoint).map((n) => n.id));
  const entryIds = nodes.filter((n) => n.isEntryPoint).map((n) => n.id);

  for (const startId of entryIds) {
    if (!canReachAnyExit(graph, startId, exitIds)) {
      const n = graph.nodes.get(startId);
      issues.push({ level: "error", code: "unreachable", nodeId: startId, name: n });
    }
  }

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

  const seen = new Map<string, boolean>();
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

function canReachAnyExit(graph: DirectedGraph, startId: string, exitIds: Set<string>): boolean {
  if (exitIds.has(startId)) return true;
  const seen = new Set([startId]);
  const stack = [startId];
  while (stack.length) {
    const cur = stack.pop()!;
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
