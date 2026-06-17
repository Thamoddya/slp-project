import { useEffect, useState } from "react";
import repo from "../data/repo.js";

// Subscribes once to the whole network (realtime) and caches it in state.
// All consumers share this; we never re-read per route request.
export function useNetwork() {
  const [nodes, setNodes] = useState([]);
  const [segments, setSegments] = useState([]);
  const [dansal, setDansal] = useState([]);
  const [parking, setParking] = useState([]);
  const [config, setConfig] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubs = [
      repo.subscribe("nodes", setNodes),
      repo.subscribe("segments", setSegments),
      repo.subscribe("dansal", setDansal),
      repo.subscribe("parking", setParking),
      repo.subscribeDoc("config", setConfig),
    ];
    // mark ready on next tick (initial snapshots are synchronous in seed mode)
    const t = setTimeout(() => setReady(true), 0);
    return () => {
      clearTimeout(t);
      unsubs.forEach((u) => u && u());
    };
  }, []);

  return { nodes, segments, dansal, parking, config, ready, isLive: repo.isLive };
}
