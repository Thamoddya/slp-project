import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MousePointer2, CircleDot, Route, UtensilsCrossed, ParkingSquare, ImagePlus, X, Save, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminMapView } from "@/components/map/GoogleMapView";
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

const MODES: { id: EditorMode; icon: React.ComponentType<{ className?: string }>; label: string; hint: string }[] = [
  { id: "view", icon: MousePointer2, label: "Select / Move", hint: "Click a node, segment or POI to edit it. Drag nodes to reposition." },
  { id: "node", icon: CircleDot, label: "Add intersection", hint: "Tap anywhere on the map to place a new intersection node." },
  { id: "segment", icon: Route, label: "Draw one-way street", hint: "Click the FROM node → tap to add shape points → click the TO node." },
  { id: "dansal", icon: UtensilsCrossed, label: "Add charity stall", hint: "Tap anywhere on the map to place a new dānsala." },
  { id: "parking", icon: ParkingSquare, label: "Add parking", hint: "Tap anywhere on the map to place a parking area." },
];

export default function Editor({ net }: { net: NetworkState }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const center = net.config?.mapCenter || { lat: 8.3494, lng: 80.3975 };

  const [mode, setMode] = useState<EditorMode>("view");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [overlay, setOverlay] = useState<{ url: string; bounds: [[number, number], [number, number]]; opacity: number } | null>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const nodeById = useMemo(() => Object.fromEntries(net.nodes.map((n) => [n.id, n])), [net.nodes]);

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

  const currentMode = MODES.find((m) => m.id === mode)!;
  const segLen = draft?.kind === "segment" ? Math.round(polylineLengthMeters(draftPolyline)) : 0;

  return (
    <div className="flex flex-1 min-h-0 w-full overflow-hidden">

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div className={`relative flex flex-col bg-white border-r border-cream-200 shrink-0 transition-[width] duration-200 overflow-hidden ${panelOpen ? "w-72" : "w-0"}`}>

        {/* Mode list */}
        <div className="p-3 space-y-1 border-b border-cream-200">
          <p className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Drawing mode</p>
          {MODES.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => changeMode(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                mode === id ? "bg-navy-700 text-white shadow-sm" : "text-navy-800 hover:bg-cream-50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Overlay upload */}
        <div className="px-3 py-2 border-b border-cream-200">
          <input ref={overlayInputRef} type="file" accept="image/*" hidden onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            const c = center;
            setOverlay({ url, bounds: [[c.lat - 0.02, c.lng - 0.02], [c.lat + 0.02, c.lng + 0.02]], opacity: 0.5 });
            e.target.value = "";
          }} />
          <button
            onClick={() => overlayInputRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-navy-800 hover:bg-cream-50 transition-all"
          >
            <ImagePlus className="h-4 w-4 shrink-0" />
            Upload reference map
          </button>
          {overlay && (
            <div className="mt-1 px-3 pb-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Opacity</span>
                <button onClick={() => setOverlay(null)} className="text-red-400 hover:text-red-600 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={overlay.opacity}
                onChange={(e) => setOverlay({ ...overlay, opacity: Number(e.target.value) })}
                className="w-full accent-navy-700" />
            </div>
          )}
        </div>

        {/* Hint box */}
        <div className="px-4 py-3 bg-cream-50 border-b border-cream-200">
          <p className="text-xs text-muted-foreground leading-relaxed">{currentMode.hint}</p>
        </div>

        {/* Segment step indicator */}
        {mode === "segment" && draft?.kind === "segment" && !draft.toNodeId && (
          <div className="px-4 py-3 bg-saffron-50 border-b border-saffron-200">
            <p className="text-xs font-bold text-saffron-800">
              {!draft.fromNodeId
                ? "① Click the starting node on the map"
                : "② Tap to add shape points — then click the ending node"}
            </p>
            {draft.fromNodeId && nodeById[draft.fromNodeId] && (
              <p className="mt-1 text-xs text-saffron-700">
                From: <strong>{localizedName(nodeById[draft.fromNodeId], lang)}</strong>
              </p>
            )}
          </div>
        )}

        {/* Draft form */}
        {draft && (draft.kind !== "segment" || draft.toNodeId) && (
          <DraftForm
            draft={draft}
            setDraft={setDraft}
            nodes={net.nodes}
            segments={net.segments}
            lang={lang}
            segLen={segLen}
            onSave={save}
            onDelete={del}
            onCancel={() => setDraft(mode === "segment" ? { kind: "segment", fromNodeId: "", toNodeId: "", name_si: "", name_en: "", points: [] } : null)}
          />
        )}
      </div>

      {/* Panel toggle tab — sits on the map edge */}
      <button
        onClick={() => setPanelOpen((v) => !v)}
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 flex items-center justify-center rounded-r-xl bg-white border border-l-0 border-cream-200 shadow-md h-12 w-6 hover:bg-cream-50 transition-colors"
        style={{ left: panelOpen ? 288 : 0 }}
      >
        {panelOpen ? <ChevronLeft className="h-3.5 w-3.5 text-navy-700" /> : <ChevronRight className="h-3.5 w-3.5 text-navy-700" />}
      </button>

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <div className="relative flex-1">
        <AdminMapView
          center={center}
          zoom={net.config?.defaultZoom || 14}
          segments={net.segments}
          nodes={net.nodes}
          dansal={net.dansal}
          parking={net.parking}
          draftPolyline={draftPolyline.length >= 2 ? draftPolyline : undefined}
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
    </div>
  );
}

// ─── Draft form ───────────────────────────────────────────────────────────────

function DraftForm({ draft, setDraft, nodes, segments, lang, segLen, onSave, onDelete, onCancel }: {
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  nodes: NetworkNode[];
  segments: NetworkSegment[];
  lang: string;
  segLen: number;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const up = (patch: Partial<typeof draft>) => setDraft({ ...draft, ...patch } as Draft);
  const hasId = !!(draft as { id?: string }).id;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {hasId ? "Edit" : "New"} {draft.kind}
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
