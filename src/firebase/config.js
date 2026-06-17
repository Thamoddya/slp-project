// Firebase is OPTIONAL. If the VITE_FIREBASE_* env vars are present we go live
// against Firestore + Auth. Otherwise the app runs on bundled seed data with a
// local store (see src/data/repo.js), so it is demonstrable out of the box.

import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(cfg.apiKey && cfg.projectId);

let app = null;
let db = null;
let auth = null;

if (firebaseEnabled) {
  app = initializeApp(cfg);
  // Offline persistence so the cached network survives reloads / weak signal.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  auth = getAuth(app);
}

export { app, db, auth };
