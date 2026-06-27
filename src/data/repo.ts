import { firebaseEnabled, db } from "@/firebase/config";
import { seedNetwork } from "./seed";
import type { NetworkNode, NetworkSegment, Dansal, Parking, AppConfig, Collection } from "@/types";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  increment,
} from "firebase/firestore";

type StoredNetwork = {
  nodes: NetworkNode[];
  segments: NetworkSegment[];
  dansal: Dansal[];
  parking: Parking[];
  config: AppConfig;
  [key: string]: unknown;
};

// ─── Local seed backend ─────────────────────────────────────────────────────

function makeLocalRepo() {
  const KEY = "poson.network.v1";
  const channel =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("poson-net") : null;
  const listeners = new Map<string, Set<(data: unknown) => void>>();

  function load(): StoredNetwork {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as StoredNetwork;
    } catch (_) {}
    return seedNetwork() as StoredNetwork;
  }
  let store = load();

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (_) {}
  }

  function emit(key: string) {
    const data = key === "config" ? store.config : (store[key] as unknown[]);
    (listeners.get(key) || new Set()).forEach((cb) => cb(clone(data)));
  }

  function broadcast() {
    persist();
    if (channel) channel.postMessage({ ts: Date.now() });
  }

  if (channel) {
    channel.onmessage = () => {
      store = load();
      (["nodes", "segments", "dansal", "parking", "config"] as const).forEach(emit);
      emitReports();
      emitStats();
    };
  }

  const genId = () => "x" + Math.random().toString(36).slice(2, 10);
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

  function touchConfig() {
    store.config = { ...store.config, lastUpdated: Date.now() };
  }

  // Reports / requests (stored separately, realtime to admin).
  const reportListeners = new Set<(d: unknown[]) => void>();
  const loadReports = (): Record<string, unknown>[] => {
    try { return JSON.parse(localStorage.getItem("poson.reports") || "[]"); } catch { return []; }
  };
  const saveReports = (r: unknown[]) => {
    localStorage.setItem("poson.reports", JSON.stringify(r));
    if (channel) channel.postMessage({ ts: Date.now() });
  };
  const emitReports = () => { const r = loadReports(); reportListeners.forEach((cb) => cb(clone(r))); };

  // Visit counter (silent analytics).
  const statsListeners = new Set<(d: { visits?: number }) => void>();
  const loadStats = (): { visits?: number } => {
    try { return JSON.parse(localStorage.getItem("poson.stats") || "{}"); } catch { return {}; }
  };
  const emitStats = () => { const s = loadStats(); statsListeners.forEach((cb) => cb({ ...s })); };

  return {
    isLive: false as const,

    subscribe(coll: Collection, cb: (data: unknown[]) => void) {
      if (!listeners.has(coll)) listeners.set(coll, new Set());
      listeners.get(coll)!.add(cb as (d: unknown) => void);
      cb(clone((store[coll] as unknown[]) || []));
      return () => listeners.get(coll)?.delete(cb as (d: unknown) => void);
    },

    subscribeDoc(_id: string, cb: (doc: AppConfig | null) => void) {
      if (!listeners.has("config")) listeners.set("config", new Set());
      listeners.get("config")!.add(cb as (d: unknown) => void);
      cb(clone(store.config || null));
      return () => listeners.get("config")?.delete(cb as (d: unknown) => void);
    },

    async set(coll: Collection, id: string, data: Record<string, unknown>) {
      const arr = store[coll] as unknown as Record<string, unknown>[];
      const i = arr.findIndex((d) => d.id === id);
      const item = { ...data, id };
      if (i >= 0) arr[i] = item; else arr.push(item);
      touchConfig(); broadcast(); emit(coll); emit("config");
    },

    async update(coll: Collection, id: string, partial: Record<string, unknown>) {
      const arr = store[coll] as unknown as Record<string, unknown>[];
      const i = arr.findIndex((d) => d.id === id);
      if (i >= 0) {
        arr[i] = { ...arr[i], ...partial, _changedAt: Date.now() };
        touchConfig(); broadcast(); emit(coll); emit("config");
      }
    },

    async remove(coll: Collection, id: string) {
      (store[coll] as unknown as Record<string, unknown>[]) =
        (store[coll] as unknown as Record<string, unknown>[]).filter((d) => d.id !== id);
      touchConfig(); broadcast(); emit(coll); emit("config");
    },

    async add(coll: Collection, data: Record<string, unknown>): Promise<string> {
      const id = (data.id as string) || genId();
      (store[coll] as unknown as Record<string, unknown>[]).push({ ...data, id });
      touchConfig(); broadcast(); emit(coll); emit("config");
      return id;
    },

    async report(data: Record<string, unknown>): Promise<string> {
      const id = genId();
      const reports = loadReports();
      reports.push({ ...data, id, createdAt: Date.now() });
      saveReports(reports);
      emitReports();
      return id;
    },

    subscribeReports(cb: (data: unknown[]) => void) {
      reportListeners.add(cb);
      cb(clone(loadReports()));
      return () => reportListeners.delete(cb);
    },

    async updateReport(id: string, partial: Record<string, unknown>) {
      const reports = loadReports().map((r) => (r.id === id ? { ...r, ...partial } : r));
      saveReports(reports);
      emitReports();
    },

    async removeReport(id: string) {
      saveReports(loadReports().filter((r) => r.id !== id));
      emitReports();
    },

    async recordVisit() {
      const s = loadStats();
      s.visits = (s.visits || 0) + 1;
      localStorage.setItem("poson.stats", JSON.stringify(s));
      if (channel) channel.postMessage({ ts: Date.now() });
      emitStats();
    },

    subscribeStats(cb: (stats: { visits?: number }) => void) {
      statsListeners.add(cb);
      cb({ ...loadStats() });
      return () => statsListeners.delete(cb);
    },

    async replaceAll(network: StoredNetwork) {
      store = {
        nodes: network.nodes || [],
        segments: network.segments || [],
        dansal: network.dansal || [],
        parking: network.parking || [],
        config: { ...(network.config || store.config), lastUpdated: Date.now() },
      };
      broadcast();
      (["nodes", "segments", "dansal", "parking", "config"] as const).forEach(emit);
    },

    exportAll() {
      return clone(store);
    },
  };
}

// ─── Firebase backend ────────────────────────────────────────────────────────

function makeFirebaseRepo() {
  const touchConfig = () =>
    setDoc(doc(db!, "config", "main"), { lastUpdated: serverTimestamp() }, { merge: true });

  return {
    isLive: true as const,

    subscribe(coll: Collection, cb: (data: unknown[]) => void) {
      return onSnapshot(collection(db!, coll), (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    },

    subscribeDoc(_id: string, cb: (doc: AppConfig | null) => void) {
      return onSnapshot(doc(db!, "config", "main"), (snap) =>
        cb(snap.exists() ? (snap.data() as AppConfig) : null)
      );
    },

    async set(coll: Collection, id: string, data: Record<string, unknown>) {
      await setDoc(doc(db!, coll, id), data, { merge: true });
      await touchConfig();
    },

    async update(coll: Collection, id: string, partial: Record<string, unknown>) {
      await updateDoc(doc(db!, coll, id), partial);
      await touchConfig();
    },

    async remove(coll: Collection, id: string) {
      await deleteDoc(doc(db!, coll, id));
      await touchConfig();
    },

    async add(coll: Collection, data: Record<string, unknown>): Promise<string> {
      const ref = await addDoc(collection(db!, coll), data);
      await touchConfig();
      return ref.id;
    },

    async report(data: Record<string, unknown>): Promise<string> {
      const ref = await addDoc(collection(db!, "reports"), { ...data, createdAt: serverTimestamp() });
      return ref.id;
    },

    subscribeReports(cb: (data: unknown[]) => void) {
      return onSnapshot(collection(db!, "reports"), (snap) =>
        cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      );
    },

    async updateReport(id: string, partial: Record<string, unknown>) {
      await updateDoc(doc(db!, "reports", id), partial);
    },

    async removeReport(id: string) {
      await deleteDoc(doc(db!, "reports", id));
    },

    async recordVisit() {
      try {
        await setDoc(doc(db!, "stats", "main"), { visits: increment(1) }, { merge: true });
      } catch {
        /* counter is best-effort; ignore (e.g. blocked by rules) */
      }
    },

    subscribeStats(cb: (stats: { visits?: number }) => void) {
      return onSnapshot(doc(db!, "stats", "main"), (snap) =>
        cb(snap.exists() ? (snap.data() as { visits?: number }) : {})
      );
    },

    async replaceAll(network: StoredNetwork) {
      const batch = writeBatch(db!);
      const colls: Collection[] = ["nodes", "segments", "dansal", "parking"];
      for (const coll of colls) {
        const existing = await getDocs(collection(db!, coll));
        existing.forEach((d) => batch.delete(d.ref));
        for (const item of (network[coll] as unknown as Record<string, unknown>[]) || []) {
          batch.set(doc(db!, coll, item.id as string), item);
        }
      }
      batch.set(doc(db!, "config", "main"), network.config || {}, { merge: true });
      await batch.commit();
    },

    async exportAll(): Promise<StoredNetwork> {
      const out: Partial<StoredNetwork> = {};
      const colls: Collection[] = ["nodes", "segments", "dansal", "parking"];
      for (const coll of colls) {
        const snap = await getDocs(collection(db!, coll));
        (out as Record<string, unknown[]>)[coll] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return out as StoredNetwork;
    },
  };
}

const repo = firebaseEnabled ? makeFirebaseRepo() : makeLocalRepo();
export default repo;
