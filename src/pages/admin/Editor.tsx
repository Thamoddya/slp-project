import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MousePointer2, CircleDot, Route, UtensilsCrossed, ParkingSquare, ImagePlus, X, Save, Trash2, PanelLeftClose, PanelLeftOpen, Check, MapPin, LocateFixed, Navigation } from "lucide-react";
import { AdminMapView } from "@/components/map/GoogleMapView";
import { useGeolocation } from "@/hooks/useGeolocation";
import repo from "@/data/repo";
import { polylineLengthMeters } from "@/routing/geo";
import { localizedName } from "@/components/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NetworkState, NetworkNode, NetworkSegment, Dansal, Parking, LatLng, VehicleType, DansalType } from "@/types";

type EditorMode = "view" | "node" | "segment" | "dansal" | "parking";

type Draft =
  | { kind: "node"; id?: string; name_si: string; name_en: string; lat: number; lng: number; isEntryPoint: boolean; isExitPoint: boolean }
  | { kind: "segment"; id?: string; fromNodeId: string; toNodeId: string; name_si: string; name_en: string; points: LatLng[]; status?: string }
  | { kind: "dansal"; id?: string; name_si: string; name_en: string; lat: number; lng: number; type: DansalType; active: boolean; openHours: string; nearestSegmentId: string }
  | { kind: "parking"; id?: string; name_si: string; name_en: string; lat: number; lng: number; capacity: number; status: string; vehicleTypes: VehicleType[]; nearestSegmentId: string };

const MODES: { id: EditorMode; icon: React.ComponentType<{ className?: string }>; label: string; short: string; hint: string }[] = [
  { id: "view", icon: MousePointer2, label: "Select / Move", short: "Select", hint: "Click a node, road or place to edit it. Drag nodes to reposition them." },
  { id: "node", icon: CircleDot, label: "Add intersection", short: "Junction", hint: "Tap anywhere on the map to drop a new junction (intersection) node." },
  { id: "segment", icon: Route, label: "Draw one-way street", short: "One-way", hint: "Click the FROM junction, tap along the road to add shape points, then click the TO junction." },
  { id: "dansal", icon: UtensilsCrossed, label: "Add Dansal", short: "Dansal", hint: "Tap anywhere on the map to place a new Dansal / service point." },
  { id: "parking", icon: ParkingSquare, label: "Add parking", short: "Parking", hint: "Tap anywhere on the map to place a parking area." },
];

export default function Editor({ net }: { net: NetworkState }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const center = net.config?.mapCenter || { lat: 8.3494, lng: 80.3975 };

  const [mode, setMode] = useState<EditorMode>("view");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [snapping, setSnapping] = useState(false);
  const [snapError, setSnapError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<{ url: string; bounds: [[number, number], [number, number]]; opacity: number } | null>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const geo = useGeolocation();
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number; nonce: number } | null>(null);
  const pendingLocate = useRef(false);

  const nodeById = useMemo(() => Object.fromEntries(net.nodes.map((n) => [n.id, n])), [net.nodes]);

  // The single point currently being placed/edited (node / dansal / parking).
  const draftPoint = useMemo(() => {
    if (!draft || draft.kind === "segment") return null;
    return { lat: draft.lat, lng: draft.lng, kind: draft.kind };
  }, [draft]);

  // Drop or move the current point to the admin's GPS location ("Locate me").
  const applyLocate = (pos: { lat: number; lng: number }) => {
    setFocus({ lat: pos.lat, lng: pos.lng, zoom: 17, nonce: Date.now() });
    if (draft && draft.kind !== "segment") {
      setDraft({ ...draft, lat: pos.lat, lng: pos.lng });
    } else if (mode === "node") {
      setDraft({ kind: "node", lat: pos.lat, lng: pos.lng, name_si: "", name_en: "", isEntryPoint: false, isExitPoint: false });
      setPanelOpen(true);
    } else if (mode === "dansal") {
      setDraft({ kind: "dansal", lat: pos.lat, lng: pos.lng, name_si: "", name_en: "", type: "food", active: true, openHours: "", nearestSegmentId: "" });
      setPanelOpen(true);
    } else if (mode === "parking") {
      setDraft({ kind: "parking", lat: pos.lat, lng: pos.lng, name_si: "", name_en: "", capacity: 100, status: "available", vehicleTypes: ["car"], nearestSegmentId: "" });
      setPanelOpen(true);
    }
  };

  const locateMe = () => {
    if (geo.position) applyLocate(geo.position);
    else { pendingLocate.current = true; geo.start(); }
  };

  useEffect(() => {
    if (pendingLocate.current && geo.position) {
      pendingLocate.current = false;
      applyLocate(geo.position);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.position]);

  const draftPolyline = useMemo((): LatLng[] => {
    if (draft?.kind !== "segment") return [];
    const pts: LatLng[] = [];
    const from = draft.fromNodeId ? nodeById[draft.fromNodeId] : null;
    if (from) pts.push({ lat: from.lat, lng: from.lng });
    pts.push(...draft.points);
    const to = draft.toNodeId ? nodeById[draft.toNodeId] : null;
    if (to) pts.push({ lat: to.lat, lng: to.lng });
    return pts;
  }, [draft, nodeById]);

  const changeMode = (m: EditorMode) => {
    setMode(m);
    if (m === "segment") {
      setDraft({ kind: "segment", fromNodeId: "", toNodeId: "", name_si: "", name_en: "", points: [] });
    } else {
      setDraft(null);
    }
  };

  const handleMapClick = (pt: LatLng) => {
    if (mode === "node") {
      setDraft({ kind: "node", lat: pt.lat, lng: pt.lng, name_si: "", name_en: "", isEntryPoint: false, isExitPoint: false });
      setPanelOpen(true);
    } else if (mode === "dansal") {
      setDraft({ kind: "dansal", lat: pt.lat, lng: pt.lng, name_si: "", name_en: "", type: "food", active: true, openHours: "", nearestSegmentId: "" });
      setPanelOpen(true);
    } else if (mode === "parking") {
      setDraft({ kind: "parking", lat: pt.lat, lng: pt.lng, name_si: "", name_en: "", capacity: 100, status: "available", vehicleTypes: ["car"], nearestSegmentId: "" });
      setPanelOpen(true);
    } else if (mode === "segment" && draft?.kind === "segment" && draft.fromNodeId && !draft.toNodeId) {
      setDraft({ ...draft, points: [...draft.points, pt] });
    }
  };

  const handleNodeClick = (n: NetworkNode) => {
    if (mode === "view") {
      setDraft({ kind: "node", ...n });
      setPanelOpen(true);
    } else if (mode === "segment" && draft?.kind === "segment") {
      if (!draft.fromNodeId) {
        setDraft({ ...draft, fromNodeId: n.id });
      } else if (!draft.toNodeId && n.id !== draft.fromNodeId) {
        setDraft({ ...draft, toNodeId: n.id });
        setPanelOpen(true);
      }
    }
  };

  const handleSegmentClick = (s: NetworkSegment) => {
    if (mode !== "view") return;
    setDraft({ kind: "segment", id: s.id, fromNodeId: s.fromNodeId, toNodeId: s.toNodeId, name_si: s.name_si, name_en: s.name_en, status: s.status, points: (s.polyline || []).slice(1, -1) });
    setPanelOpen(true);
  };

  const handleDansalClick = (d: Dansal) => { if (mode !== "view") return; setDraft({ kind: "dansal", ...d }); setPanelOpen(true); };
  const handleParkingClick = (p: Parking) => { if (mode !== "view") return; setDraft({ kind: "parking", ...p }); setPanelOpen(true); };

  const save = async () => {
    if (!draft) return;
    if (draft.kind === "node") {
      const p = { name_si: draft.name_si, name_en: draft.name_en, lat: draft.lat, lng: draft.lng, isEntryPoint: draft.isEntryPoint, isExitPoint: draft.isExitPoint };
      draft.id ? await repo.set("nodes", draft.id, p) : await repo.add("nodes", p);
    } else if (draft.kind === "segment") {
      if (!draft.fromNodeId || !draft.toNodeId || draft.fromNodeId === draft.toNodeId) return;
      const p = { fromNodeId: draft.fromNodeId, toNodeId: draft.toNodeId, name_si: draft.name_si, name_en: draft.name_en, polyline: draftPolyline, lengthMeters: Math.round(polylineLengthMeters(draftPolyline)), status: draft.status || "open" };
      draft.id ? await repo.set("segments", draft.id, p) : await repo.add("segments", p);
    } else if (draft.kind === "dansal") {
      const p = { name_si: draft.name_si, name_en: draft.name_en, lat: draft.lat, lng: draft.lng, type: draft.type, active: draft.active, openHours: draft.openHours, nearestSegmentId: draft.nearestSegmentId };
      draft.id ? await repo.set("dansal", draft.id, p) : await repo.add("dansal", p);
    } else if (draft.kind === "parking") {
      const p = { name_si: draft.name_si, name_en: draft.name_en, lat: draft.lat, lng: draft.lng, capacity: Number(draft.capacity), status: draft.status, vehicleTypes: draft.vehicleTypes, nearestSegmentId: draft.nearestSegmentId };
      draft.id ? await repo.set("parking", draft.id, p) : await repo.add("parking", p);
    }
    setDraft(mode === "segment" ? { kind: "segment", fromNodeId: "", toNodeId: "", name_si: "", name_en: "", points: [] } : null);
  };

  const del = async () => {
    if (!draft?.id) return;
    const coll = { node: "nodes", segment: "segments", dansal: "dansal", parking: "parking" }[draft.kind] as "nodes" | "segments" | "dansal" | "parking";
    await repo.remove(coll, draft.id);
    setDraft(null);
  };

  // Snap the drawn one-way street to the physical road shape. We only ask Google
  // for the SHAPE of this single police-defined road (from → to, through any
  // manual shape points as waypoints). Direction legality is still enforced
  // entirely by the custom router — this just makes the polyline follow the road.
  const snapToRoad = async () => {
    if (draft?.kind !== "segment" || !draft.fromNodeId || !draft.toNodeId) return;
    const from = nodeById[draft.fromNodeId];
    const to = nodeById[draft.toNodeId];
    if (!from || !to) return;
    setSnapError(null);
    setSnapping(true);
    try {
      const { DirectionsService } = (await window.google.maps.importLibrary("routes")) as google.maps.RoutesLibrary;
      const svc = new DirectionsService();
      // The Directions API allows at most 25 waypoints (plus origin & destination).
      // The shape points are only hints for which road to follow, so evenly
      // downsample them to fit — the returned overview_path is still full detail.
      const hints = downsample(draft.points, 23);
      const res = await svc.route({
        origin: { lat: from.lat, lng: from.lng },
        destination: { lat: to.lat, lng: to.lng },
        waypoints: hints.map((p) => ({ location: { lat: p.lat, lng: p.lng }, stopover: false })),
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      const path = res.routes[0]?.overview_path ?? [];
      if (path.length < 2) throw new Error("empty");
      // overview_path starts at `from` and ends at `to`; keep only the interior,
      // since draftPolyline re-adds the from/to node coordinates.
      const interior = path.slice(1, -1).map((ll) => ({ lat: ll.lat(), lng: ll.lng() }));
      setDraft({ ...draft, points: interior });
    } catch {
      setSnapError("Couldn't snap to road. Check the Directions API is enabled for this key, or trace the road by tapping fewer shape points.");
    } finally {
      setSnapping(false);
    }
  };

  const currentMode = MODES.find((m) => m.id === mode)!;
  const segLen = draft?.kind === "segment" ? Math.round(polylineLengthMeters(draftPolyline)) : 0;

  const pickOverlay = () => overlayInputRef.current?.click();

  return (
    <div className="relative flex flex-1 min-h-0 w-full overflow-hidden bg-cream-100">

      {/* ── Map: full bleed ──────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <AdminMapView
          center={center}
          zoom={net.config?.defaultZoom || 14}
          segments={net.segments}
          nodes={net.nodes}
          dansal={net.dansal}
          parking={net.parking}
          draftPolyline={draftPolyline.length >= 2 ? draftPolyline : undefined}
          draftPoint={draftPoint}
          onDraftMove={(lat, lng) => setDraft((d) => (d && d.kind !== "segment" ? { ...d, lat, lng } : d))}
          userPos={geo.position}
          focus={focus}
          overlayUrl={overlay?.url}
          overlayBounds={overlay?.bounds}
          overlayOpacity={overlay?.opacity}
          mode={mode}
          onMapClick={handleMapClick}
          onNodeClick={handleNodeClick}
          onNodeDragEnd={(id, lat, lng) => repo.update("nodes", id, { lat, lng })}
          onSegmentClick={handleSegmentClick}
          onDansalClick={handleDansalClick}
          onParkingClick={handleParkingClick}
        />
      </div>

      {/* Locate-me FAB — drop/move the point at the admin's current GPS spot */}
      <button
        onClick={locateMe}
        title={mode === "view" || mode === "segment" ? "Center on my location" : "Place the point at my current location"}
        className="absolute bottom-5 right-4 z-10 flex items-center gap-2 rounded-full bg-navy-700 px-4 py-3 text-sm font-semibold text-white shadow-poson-lg transition-colors hover:bg-navy-800"
      >
        {geo.watching && !geo.position ? <Navigation className="h-4 w-4 animate-pulse" /> : <LocateFixed className="h-4 w-4" />}
        Locate me
      </button>
      {geo.error === "denied" && (
        <div className="absolute bottom-20 right-4 z-10 max-w-[220px] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 shadow-poson">
          Location permission denied. Enable it in your browser to drop points where you stand.
        </div>
      )}

      {/* Hidden overlay file input */}
      <input ref={overlayInputRef} type="file" accept="image/*" hidden onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const c = center;
        setOverlay({ url, bounds: [[c.lat - 0.02, c.lng - 0.02], [c.lat + 0.02, c.lng + 0.02]], opacity: 0.5 });
        e.target.value = "";
      }} />

      {/* ── Floating tool toolbar (top center) ───────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-cream-200 bg-white/95 p-1.5 shadow-poson-lg backdrop-blur">
          {MODES.map(({ id, icon: Icon, label, short }) => (
            <button
              key={id}
              onClick={() => { changeMode(id); setPanelOpen(true); }}
              title={label}
              className={`flex min-w-[60px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all ${
                mode === id ? "bg-navy-700 text-white shadow-sm" : "text-navy-700 hover:bg-cream-100"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {short}
            </button>
          ))}
          <div className="mx-1 h-9 w-px bg-cream-200" />
          <button
            onClick={pickOverlay}
            title="Upload a reference map image to trace over"
            className={`flex min-w-[60px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all ${
              overlay ? "bg-saffron-100 text-saffron-700" : "text-navy-700 hover:bg-cream-100"
            }`}
          >
            <ImagePlus className="h-[18px] w-[18px]" />
            Overlay
          </button>
        </div>
      </div>

      {/* ── Contextual panel (top left) ──────────────────────────────────── */}
      {panelOpen ? (
        <div className="absolute left-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] w-[330px] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-poson-lg">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-2.5 border-b border-cream-200 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-700 text-white">
              <currentMode.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-navy-900">{currentMode.label}</p>
            </div>
            <button onClick={() => setPanelOpen(false)} title="Hide panel" className="rounded-lg p-1.5 text-muted-foreground hover:bg-cream-100">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Hint */}
            <div className="border-b border-cream-200 bg-cream-50 px-4 py-3">
              <p className="text-xs leading-relaxed text-muted-foreground">{currentMode.hint}</p>
            </div>

            {/* Segment step guide */}
            {mode === "segment" && draft?.kind === "segment" && !draft.id && (
              <SegmentSteps draft={draft} fromName={draft.fromNodeId ? localizedName(nodeById[draft.fromNodeId], lang) : ""} />
            )}

            {/* Overlay opacity */}
            {overlay && (
              <div className="flex items-center gap-3 border-b border-cream-200 px-4 py-3">
                <ImagePlus className="h-4 w-4 shrink-0 text-saffron-600" />
                <input
                  type="range" min="0" max="1" step="0.05" value={overlay.opacity}
                  onChange={(e) => setOverlay({ ...overlay, opacity: Number(e.target.value) })}
                  className="flex-1 accent-navy-700"
                />
                <button onClick={() => setOverlay(null)} title="Remove overlay" className="text-red-400 hover:text-red-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Draft form */}
            {draft ? (
              <DraftForm
                draft={draft}
                setDraft={setDraft}
                nodes={net.nodes}
                segments={net.segments}
                lang={lang}
                segLen={segLen}
                onSave={save}
                onDelete={del}
                onSnap={snapToRoad}
                snapping={snapping}
                snapError={snapError}
                onCancel={() => { setSnapError(null); setDraft(mode === "segment" ? { kind: "segment", fromNodeId: "", toNodeId: "", name_si: "", name_en: "", points: [] } : null); }}
              />
            ) : mode === "view" ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <MapPin className="h-6 w-6 text-cream-300" />
                <p className="text-xs text-muted-foreground">Nothing selected. Click a node, road or place on the map to edit it.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setPanelOpen(true)}
          title="Show panel"
          className="absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-cream-200 bg-white text-navy-700 shadow-poson-lg hover:bg-cream-50"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── Segment step guide ───────────────────────────────────────────────────────

function SegmentSteps({ draft, fromName }: { draft: Extract<Draft, { kind: "segment" }>; fromName: string }) {
  const steps = [
    { n: 1, label: "Pick FROM junction", done: !!draft.fromNodeId },
    { n: 2, label: `Trace the road (${draft.points.length} points)`, done: draft.points.length > 0 },
    { n: 3, label: "Pick TO junction", done: !!draft.toNodeId },
  ];
  // The active step is the first one not yet done.
  const activeN = steps.find((s) => !s.done)?.n ?? 0;
  return (
    <div className="border-b border-cream-200 bg-saffron-50 px-4 py-3 space-y-2">
      {steps.map((s) => {
        const active = s.n === activeN;
        return (
          <div key={s.n} className="flex items-center gap-2.5">
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
              s.done ? "bg-green-500 text-white" : active ? "bg-saffron-500 text-white" : "bg-white text-saffron-700 border border-saffron-300"
            }`}>
              {s.done ? <Check className="h-3 w-3" /> : s.n}
            </span>
            <span className={`text-xs font-semibold ${s.done ? "text-green-700" : "text-saffron-800"}`}>{s.label}</span>
          </div>
        );
      })}
      {draft.fromNodeId && fromName && (
        <p className="pt-1 text-[11px] text-saffron-700">From: <strong>{fromName}</strong></p>
      )}
    </div>
  );
}

// ─── Draft form ───────────────────────────────────────────────────────────────

function DraftForm({ draft, setDraft, nodes, segments, lang, segLen, onSave, onDelete, onCancel, onSnap, snapping, snapError }: {
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  nodes: NetworkNode[];
  segments: NetworkSegment[];
  lang: string;
  segLen: number;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onSnap: () => void;
  snapping: boolean;
  snapError: string | null;
}) {
  const up = (patch: Partial<typeof draft>) => setDraft({ ...draft, ...patch } as Draft);
  const hasId = !!(draft as { id?: string }).id;

  return (
    <div className="p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {`${hasId ? "Edit" : "New"} ${draft.kind}`}
      </p>

      {(draft.kind === "node" || draft.kind === "dansal" || draft.kind === "parking") && (
        <>
          <FF label="Name (Sinhala)">
            <Input value={draft.name_si} onChange={(e) => up({ name_si: e.target.value })} placeholder="සිංහල" />
          </FF>
          <FF label="Name (English)">
            <Input value={draft.name_en} onChange={(e) => up({ name_en: e.target.value })} placeholder="English" />
          </FF>
        </>
      )}

      {draft.kind === "node" && (
        <div className="flex gap-2">
          <Chip active={draft.isEntryPoint} onClick={() => up({ isEntryPoint: !draft.isEntryPoint })}>▶ Entry</Chip>
          <Chip active={draft.isExitPoint} onClick={() => up({ isExitPoint: !draft.isExitPoint })}>■ Exit</Chip>
        </div>
      )}

      {draft.kind === "segment" && (
        <>
          <FF label="From node">
            <Select value={draft.fromNodeId} onValueChange={(v) => up({ fromNodeId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{nodes.map((n) => <SelectItem key={n.id} value={n.id}>{localizedName(n, lang)}</SelectItem>)}</SelectContent>
            </Select>
          </FF>
          <FF label="To node">
            <Select value={draft.toNodeId} onValueChange={(v) => up({ toNodeId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{nodes.map((n) => <SelectItem key={n.id} value={n.id}>{localizedName(n, lang)}</SelectItem>)}</SelectContent>
            </Select>
          </FF>
          <FF label="Street name (Sinhala)">
            <Input value={draft.name_si} onChange={(e) => up({ name_si: e.target.value })} />
          </FF>
          <FF label="Street name (English)">
            <Input value={draft.name_en} onChange={(e) => up({ name_en: e.target.value })} />
          </FF>
          <div className="rounded-xl bg-cream-50 border border-cream-200 px-3 py-2 text-xs text-muted-foreground">
            Length: {segLen}m · {draft.points.length} shape points
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!draft.fromNodeId || !draft.toNodeId || snapping}
            onClick={onSnap}
          >
            <Route className="mr-2 h-4 w-4" />
            {snapping ? "Snapping…" : "Snap to road"}
          </Button>
          {snapError && <p className="text-[11px] leading-relaxed text-red-500">{snapError}</p>}
        </>
      )}

      {draft.kind === "dansal" && (
        <>
          <FF label="Type">
            <Select value={draft.type} onValueChange={(v) => up({ type: v as DansalType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["food", "drink", "water", "medical", "other"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </FF>
          <FF label="Open hours">
            <Input value={draft.openHours} onChange={(e) => up({ openHours: e.target.value })} placeholder="6am – 10pm" />
          </FF>
          <div className="flex gap-2">
            <Chip active={draft.active} onClick={() => up({ active: !draft.active })}>Active</Chip>
          </div>
        </>
      )}

      {draft.kind === "parking" && (
        <>
          <FF label="Capacity">
            <Input type="number" value={draft.capacity} onChange={(e) => up({ capacity: Number(e.target.value) })} />
          </FF>
          <FF label="Status">
            <Select value={draft.status} onValueChange={(v) => up({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["available", "filling", "full"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </FF>
          <div className="flex flex-wrap gap-2">
            {(["car", "bus", "threewheeler", "motorbike"] as VehicleType[]).map((v) => (
              <Chip key={v} active={draft.vehicleTypes.includes(v)}
                onClick={() => up({ vehicleTypes: draft.vehicleTypes.includes(v) ? draft.vehicleTypes.filter((x) => x !== v) : [...draft.vehicleTypes, v] })}>
                {v}
              </Chip>
            ))}
          </div>
        </>
      )}

      {(draft.kind === "dansal" || draft.kind === "parking") && (
        <FF label="Nearest road segment">
          <Select value={draft.nearestSegmentId} onValueChange={(v) => up({ nearestSegmentId: v })}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>{segments.map((s) => <SelectItem key={s.id} value={s.id}>{localizedName(s, lang)}</SelectItem>)}</SelectContent>
          </Select>
        </FF>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="rounded-xl border border-cream-200 px-3 py-2.5 text-muted-foreground hover:bg-cream-50 transition-colors">
          <X className="h-4 w-4" />
        </button>
        {hasId && (
          <button onClick={onDelete} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 font-semibold text-red-600 hover:bg-red-100 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <Button className="flex-1 h-11" onClick={onSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}

// Evenly pick at most `max` items from an array, always keeping order and the
// first/last. Used to keep Directions waypoints under the API's 25-point limit.
function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  if (max <= 1) return arr.length ? [arr[0]] : [];
  const step = (arr.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${active ? "bg-navy-700 text-white border-navy-700" : "bg-white text-muted-foreground border-cream-200 hover:border-navy-300"}`}>
      {children}
    </button>
  );
}
