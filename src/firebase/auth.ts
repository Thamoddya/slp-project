import { firebaseEnabled, auth } from "./config";
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import type { AdminUser } from "@/types";

const DEMO = { email: "admin@police.lk", password: "poson2026" };
const DEMO_KEY = "poson.admin";

export async function signIn(email: string, password: string): Promise<AdminUser> {
  if (firebaseEnabled && auth) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { uid: cred.user.uid, email: cred.user.email };
  }
  if (email.trim().toLowerCase() === DEMO.email && password === DEMO.password) {
    const user: AdminUser = { uid: "demo-admin", email: DEMO.email, role: "superadmin" };
    localStorage.setItem(DEMO_KEY, JSON.stringify(user));
    return user;
  }
  throw new Error("invalid-credentials");
}

export async function signOut(): Promise<void> {
  if (firebaseEnabled && auth) return fbSignOut(auth);
  localStorage.removeItem(DEMO_KEY);
  window.dispatchEvent(new Event("poson-auth"));
}

export function onAuthChange(cb: (user: AdminUser | null) => void): () => void {
  if (firebaseEnabled && auth) {
    return onAuthStateChanged(auth, (u) =>
      cb(u ? { uid: u.uid, email: u.email } : null)
    );
  }
  const read = () => {
    try {
      cb(JSON.parse(localStorage.getItem(DEMO_KEY) || "null") as AdminUser | null);
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

export async function signInAndNotify(email: string, password: string): Promise<AdminUser> {
  const r = await signIn(email, password);
  if (!firebaseEnabled) window.dispatchEvent(new Event("poson-auth"));
  return r;
}
