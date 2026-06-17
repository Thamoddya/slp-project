import { firebaseEnabled, auth } from "./config.js";
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";

// Demo admin used only when Firebase is not configured, so the protected admin
// panel is testable out of the box. Replace with real Firebase Auth in prod.
const DEMO = { email: "admin@police.lk", password: "poson2026" };
const DEMO_KEY = "poson.admin";

export async function signIn(email, password) {
  if (firebaseEnabled) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { uid: cred.user.uid, email: cred.user.email };
  }
  if (email.trim().toLowerCase() === DEMO.email && password === DEMO.password) {
    const user = { uid: "demo-admin", email: DEMO.email, role: "superadmin" };
    localStorage.setItem(DEMO_KEY, JSON.stringify(user));
    return user;
  }
  throw new Error("invalid-credentials");
}

export async function signOut() {
  if (firebaseEnabled) return fbSignOut(auth);
  localStorage.removeItem(DEMO_KEY);
  window.dispatchEvent(new Event("poson-auth"));
}

export function onAuthChange(cb) {
  if (firebaseEnabled) {
    return onAuthStateChanged(auth, (u) =>
      cb(u ? { uid: u.uid, email: u.email } : null)
    );
  }
  const read = () => {
    try {
      cb(JSON.parse(localStorage.getItem(DEMO_KEY) || "null"));
    } catch {
      cb(null);
    }
  };
  read();
  const handler = () => read();
  window.addEventListener("poson-auth", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("poson-auth", handler);
    window.removeEventListener("storage", handler);
  };
}

// signIn for demo must notify listeners in the same tab
const _origSignIn = signIn;
export async function signInAndNotify(email, password) {
  const r = await _origSignIn(email, password);
  if (!firebaseEnabled) window.dispatchEvent(new Event("poson-auth"));
  return r;
}
