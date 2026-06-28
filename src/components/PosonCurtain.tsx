import PosonWaiting from "@/pages/PosonWaiting";
import { useEffect, useRef, useState } from "react";

interface PosonCurtainProps {
  /** The real app rendered underneath the curtain. */
  children: React.ReactNode;
}

type CurtainState = "closed" | "opening" | "open";

const REVEAL_MS = 1400;
const PERSIST_KEY = "poson.entered";

/**
 * Wraps the real app with the Poson "Stay Tuned" page. When the user taps
 * Enter, the waiting page splits down the middle — left half slides to the
 * left, right half to the right — revealing the real app behind.
 *
 * The choice persists in sessionStorage so refreshing the route during a
 * single visit doesn't replay the intro, but reopening the app does.
 */
export default function PosonCurtain({ children }: PosonCurtainProps) {
  const [state, setState] = useState<CurtainState>(() => {
    if (typeof sessionStorage === "undefined") return "closed";
    return sessionStorage.getItem(PERSIST_KEY) === "1" ? "open" : "closed";
  });
  const timerRef = useRef<number | null>(null);

  const open = () => {
    if (state !== "closed") return;
    setState("opening");
    try {
      sessionStorage.setItem(PERSIST_KEY, "1");
    } catch {
      /* private mode — ignore */
    }
    timerRef.current = window.setTimeout(() => {
      setState("open");
      timerRef.current = null;
    }, REVEAL_MS);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Lock body scroll while the curtain is still on screen so the real app
  // underneath can't be jiggled by touch gestures bleeding through.
  useEffect(() => {
    if (state === "open") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [state]);

  return (
    <>
      {/* Real app underneath — eagerly mounted so its own preloader runs
          in the background while the user is still on the waiting page. */}
      {children}

      {state !== "open" && (
        <div className="poson-curtain-root" aria-hidden={state === "opening"}>
          <div
            className={`poson-curtain poson-curtain-left ${state === "opening" ? "is-opening" : ""}`}
          >
            <PosonWaiting onEnter={open} hideCanvasParticles />
          </div>
          <div
            className={`poson-curtain poson-curtain-right ${state === "opening" ? "is-opening" : ""}`}
          >
            <PosonWaiting onEnter={open} hideCanvasParticles />
          </div>
        </div>
      )}
    </>
  );
}
