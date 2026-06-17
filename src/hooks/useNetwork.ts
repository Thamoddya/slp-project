import { useEffect, useState } from "react";
import repo from "@/data/repo";
import type { NetworkNode, NetworkSegment, Dansal, Parking, AppConfig, NetworkState } from "@/types";

export function useNetwork(): NetworkState {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [segments, setSegments] = useState<NetworkSegment[]>([]);
  const [dansal, setDansal] = useState<Dansal[]>([]);
  const [parking, setParking] = useState<Parking[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubs = [
      repo.subscribe("nodes", (d) => setNodes(d as NetworkNode[])),
      repo.subscribe("segments", (d) => setSegments(d as NetworkSegment[])),
      repo.subscribe("dansal", (d) => setDansal(d as Dansal[])),
      repo.subscribe("parking", (d) => setParking(d as Parking[])),
      repo.subscribeDoc("config", setConfig),
    ];
    const t = setTimeout(() => setReady(true), 0);
    return () => {
      clearTimeout(t);
      unsubs.forEach((u) => u && u());
    };
  }, []);

  return { nodes, segments, dansal, parking, config, ready, isLive: repo.isLive };
}
