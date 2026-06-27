import { useEffect, useRef, useState } from "react";

interface BottomSheetProps {
  /** Index into the detent fractions — controlled by the parent. */
  index: number;
  onIndexChange: (i: number) => void;
  /** Visible-height detents as fractions of the parent height, ascending. */
  fractions?: number[];
  title?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

const DEFAULT_FRACTIONS = [0.16, 0.52, 0.92];

/**
 * A draggable bottom sheet that snaps between detents so the user can pull it
 * down to reveal more map, or up to read the full content. Only the header
 * (grip) is draggable; the body scrolls independently.
 */
export default function BottomSheet({
  index,
  onIndexChange,
  fractions = DEFAULT_FRACTIONS,
  title,
  headerRight,
  children,
}: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [parentH, setParentH] = useState(0);
  const [height, setHeight] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; startH: number } | null>(null);

  // Measure the positioned parent so detents track the map area's height.
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const update = () => setParentH(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const detents = fractions.map((f) => Math.round(parentH * f));
  const clampedIndex = Math.min(index, detents.length - 1);

  // Snap to the active detent whenever the index/parent changes (unless dragging).
  useEffect(() => {
    if (!dragging && detents.length) setHeight(detents[clampedIndex]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedIndex, parentH, dragging]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, startH: height };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !detents.length) return;
    const delta = drag.current.startY - e.clientY;
    const min = detents[0];
    const max = detents[detents.length - 1];
    setHeight(Math.max(min, Math.min(max, drag.current.startH + delta)));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    let nearest = 0;
    let best = Infinity;
    detents.forEach((d, i) => {
      const dist = Math.abs(d - height);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    onIndexChange(nearest);
    setHeight(detents[nearest]);
  };

  return (
    <div
      ref={ref}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl bg-white shadow-sheet"
      style={{
        height: height || undefined,
        transition: dragging ? "none" : "height 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Drag handle / header */}
      <div
        className="shrink-0 cursor-grab touch-none select-none px-4 pt-2.5 pb-2 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="mx-auto h-1.5 w-11 rounded-full bg-cream-300" />
        {(title || headerRight) && (
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0 text-[15px] font-bold text-navy-900">{title}</div>
            {/* Stop drag-handling so interactive controls (e.g. buttons) stay tappable. */}
            <div
              className="shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
            >
              {headerRight}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="sheet-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
    </div>
  );
}
