// Data access layer with two interchangeable backends behind one interface:
//   - Firebase backend  (when src/firebase/config.js detects credentials)
//   - Local seed backend (default — localStorage + BroadcastChannel pub/sub)
//
// The whole routable network is small, so we load each collection once via a
// realtime listener and cache it. Never read per-segment on every route.
//
// Interface:
//   repo.isLive
//   repo.subscribe(collection, cb)   -> unsubscribe();  cb(arrayOfDocs)
//   repo.subscribeDoc(id, cb)        -> unsubscribe();  cb(doc|null)  (config)
//   repo.set(collection, id, data)
//   repo.update(collection, id, partial)
//   repo.remove(collection, id)
//   repo.add(collection, data)       -> id
//   repo.report(data)                -> id            (public can create)
//   repo.replaceAll(network)         -> import/restore
//   repo.exportAll()                 -> { nodes, segments, dansal, parking, config }

import { firebaseEnabled, db } from "../firebase/config.js";
import { seedNetwork } from "./seed.js";
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
} from "firebase/firestore";

const COLLECTIONS = ["nodes", "segments", "dansal", "parking"];

// ---------------------------------------------------------------------------
// Local seed backend
// ---------------------------------------------------------------------------
function makeLocalRepo() {
  const KEY = "poson.network.v1";
  const channel =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("poson-net") : null;
  const listeners = new Map(); // key -> Set<cb>

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return seedNetwork();
  }
  let store = load();

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch (_) {}
  }
  function emit(key) {
    const data = key === "config" ? store.config : store[key];
    (listeners.get(key) || []).forEach((cb) => cb(clone(data)));
  }
  function broadcast() {
    persist();
    if (channel) channel.postMessage({ ts: Date.now() });
  }
  if (channel) {
    channel.onmessage = () => {
      store = load();
      [...COLLECTIONS, "config"].forEach(emit);
    };
  }

  const genId = () => "x" + Math.random().toString(36).slice(2, 10);
  const clone = (v) => JSON.parse(JSON.stringify(v));

  function touchConfig() {
    store.config = { ...store.config, lastUpdated: Date.now() };
  }

  return {
    isLive: false,
    subscribe(collection, cb) {
      if (!listeners.has(collection)) listeners.set(collection, new Set());
      listeners.get(collection).add(cb);
      cb(clone(store[collection] || []));
      return () => listeners.get(collection)?.delete(cb);
    },
    subscribeDoc(id, cb) {
      if (!listeners.has(id)) listeners.set(id, new Set());
      listeners.get(id).add(cb);
      cb(clone(store[id] || null));
      return () => listeners.get(id)?.delete(cb);
    },
    async set(collection, id, data) {
      const arr = store[collection];
      const i = arr.findIndex((d) => d.id === id);
      const doc = { ...data, id };
      if (i >= 0) arr[i] = doc;
      else arr.push(doc);
      touchConfig();
      broadcast();
      emit(collection);
      emit("config");
    },
    async update(collection, id, partial) {
      const arr = store[collection];
      const i = arr.findIndex((d) => d.id === id);
      if (i >= 0) {
        arr[i] = { ...arr[i], ...partial, _changedAt: Date.now() };
        touchConfig();
        broadcast();
        emit(collection);
        emit("config");
      }
    },
    async remove(collection, id) {
      store[collection] = store[collection].filter((d) => d.id !== id);
      touchConfig();
      broadcast();
      emit(collection);
      emit("config");
    },
    async add(collection, data) {
      const id = data.id || genId();
      store[collection].push({ ...data, id });
      touchConfig();
      broadcast();
      emit(collection);
      emit("config");
      return id;
    },
    async report(data) {
      // reports are not displayed publicly; keep them locally for the demo
      const id = genId();
      const reports = JSON.parse(localStorage.getItem("poson.reports") || "[]");
      reports.push({ ...data, id, createdAt: Date.now() });
      localStorage.setItem("poson.reports", JSON.stringify(reports));
      return id;
    },
    async replaceAll(network) {
      store = {
        nodes: network.nodes || [],
        segments: network.segments || [],
        dansal: network.dansal || [],
        parking: network.parking || [],
        config: { ...(network.config || store.config), lastUpdated: Date.now() },
      };
      broadcast();
      [...COLLECTIONS, "config"].forEach(emit);
    },
    exportAll() {
      return clone(store);
    },
  };
}

// ---------------------------------------------------------------------------
// Firebase backend
// ---------------------------------------------------------------------------
function makeFirebaseRepo() {
  const touchConfig = () =>
    setDoc(doc(db, "config", "main"), { lastUpdated: serverTimestamp() }, { merge: true });

  return {
    isLive: true,
    subscribe(coll, cb) {
      return onSnapshot(collection(db, coll), (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    },
    subscribeDoc(id, cb) {
      return onSnapshot(doc(db, "config", "main"), (snap) =>
        cb(snap.exists() ? snap.data() : null)
      );
    },
    async set(coll, id, data) {
      await setDoc(doc(db, coll, id), data, { merge: true });
      await touchConfig();
    },
    async update(coll, id, partial) {
      await updateDoc(doc(db, coll, id), partial);
      await touchConfig();
    },
    async remove(coll, id) {
      await deleteDoc(doc(db, coll, id));
      await touchConfig();
    },
    async add(coll, data) {
      const ref = await addDoc(collection(db, coll), data);
      await touchConfig();
      return ref.id;
    },
    async report(data) {
      const ref = await addDoc(collection(db, "reports"), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return ref.id;
    },
    async replaceAll(network) {
      const batch = writeBatch(db);
      for (const coll of COLLECTIONS) {
        const existing = await getDocs(collection(db, coll));
        existing.forEach((d) => batch.delete(d.ref));
        for (const item of network[coll] || []) {
          batch.set(doc(db, coll, item.id), item);
        }
      }
      batch.set(doc(db, "config", "main"), network.config || {}, { merge: true });
      await batch.commit();
    },
    async exportAll() {
      const out = {};
      for (const coll of COLLECTIONS) {
        const snap = await getDocs(collection(db, coll));
        out[coll] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return out;
    },
  };
}

const repo = firebaseEnabled ? makeFirebaseRepo() : makeLocalRepo();
export default repo;
