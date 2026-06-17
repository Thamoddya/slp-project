import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { APIProvider } from "@vis.gl/react-google-maps";
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
  | ({ kind: "node"; id?: string } & Partial<NetworkNode> & { isEntryPoint: boolean; isExitPoint: boolean })
  | ({ kind: "segment"; id?: string } & { fromNodeId: string; toNodeId: string; name_si: string; name_en: string; points: LatLng[]; status?: string; notes?: string })
  | ({ kind: "dansal"; id?: string } & Partial<Dansal>)
  | ({ kind: "parking"; id?: string } & Partial<Parking> & { vehicleTypes: VehicleType[] });

const MODES: [EditorMode, string][] = [
  ["view", "admin.editor.modeView"],
  ["node", "admin.editor.modeNode"],
  ["segment", "admin.editor.modeSegment"],
  ["dansal", "admin.editor.modeDansal"],
  ["parking", "admin.editor.modeParking"],
];

export default function Editor({ net }: { net: NetworkState }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const center = net.config?.mapCenter || { lat: 8.3494, lng: 80.3975 };

  const [mode, setMode] = useState<EditorMode>("view");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [overlay, setOverlay] = useState<{
    url: string;
    bounds: [[number, number], [number, number]];
    opacity: number;
  } | null>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const nodeById = useMemo(
    () => Object.fromEntries(net.nodes.map((n) => [n.id, n])),
    [net.nodes]
  );

  const draftPolyline = useMemo((): LatLng[] => {
    if (draft?.kind !== "segment") return [];
    const pts: LatLng[] = [];
    const fromNode = draft.fromNodeId ? nodeById[draft.fromNodeId] : null;
    if (fromNode) pts.push({ lat: fromNode.lat, lng: fromNode.lng });
    pts.push(...(draft.points || []));
    const toNode = draft.toNodeId ? nodeById[draft.toNodeId] : null;
    if (toNode) pts.push({ lat: toNode.lat, lng: toNode.lng });
    return pts;
  }, [draft, nodeById]);

  const handleMapClick = (pt: LatLng) => {
    if (mode === "node") {
      setDraft({ kind: "node", lat: pt.lat, lng: pt.lng, name_si: "", name_en: "", isEntryPoint: false, isExitPoint: false });
    } else if (mode === "dansal") {
      setDraft({ kind: "dansal", lat: pt.lat, lng: pt.lng, name_si: "", name_en: "", type: "food", active: true, openHours: "", nearestSegmentId: "" });
    } else if (mode === "parking") {
      setDraft({ kind: "parking", lat: pt.lat, lng: pt.lng, name_si: "", name_en: "", capacity: 100, status: "available", vehicleTypes: ["car"], nearestSegmentId: "" });
    } else if (mode === "segment" && draft?.kind === "segment") {
      setDraft({ ...draft, points: [...(draft.points || []), pt] });
    }
  };

  const handleNodeClick = (n: NetworkNode) => {
    if (mode === "view") {
      setDraft({ kind: "node", ...n });
    } else if (mode === "segment" && draft?.kind === "segment") {
      if (!draft.fromNodeId) {
        setDraft({ ...draft, fromNodeId: n.id });
      } else if (!draft.toNodeId && n.id !== draft.fromNodeId) {
        setDraft({ ...draft, toNodeId: n.id });
      }
    }
  };

  const handleSegmentClick = (s: NetworkSegment) => {
    setDraft({
      kind: "segment",
      id: s.id,
      fromNodeId: s.fromNodeId,
      toNodeId: s.toNodeId,
      name_si: s.name_si,
      name_en: s.name_en,
      status: s.status,
      points: (s.polyline || []).slice(1, -1),
      notes: s.notes,
    });
  };

  const handleDansalClick = (d: Dansal) => setDraft({ kind: "dansal", ...d });
  const handleParkingClick = (p: Parking) => setDraft({ kind: "parking", ...p });

  const handleNodeDragEnd = (id: string, lat: number, lng: number) => {
    repo.update("nodes", id, { lat, lng });
  };

  const save = async () => {
    if (!draft) return;
    if (draft.kind === "node") {
      const payload = {
        name_si: draft.name_si || "",
        name_en: draft.name_en || "",
        lat: draft.lat || 0,
        lng: draft.lng || 0,
        isEntryPoint: !!draft.isEntryPoint,
        isExitPoint: !!draft.isExitPoint,
      };
      draft.id ? await repo.set("nodes", draft.id, payload) : await repo.add("nodes", payload);
    } else if (draft.kind === "segment") {
      if (!draft.fromNodeId || !draft.toNodeId || draft.fromNodeId === draft.toNodeId) return;
      const polyline = draftPolyline;
      const payload = {
        fromNodeId: draft.fromNodeId,
        toNodeId: draft.toNodeId,
        name_si: draft.name_si || "",
        name_en: draft.name_en || "",
        polyline,
        lengthMeters: Math.round(polylineLengthMeters(polyline)),
        status: draft.status || "open",
        notes: draft.notes || "",
      };
      draft.id ? await repo.set("segments", draft.id, payload) : await repo.add("segments", payload);
    } else if (draft.kind === "dansal") {
      const payload = {
        name_si: draft.name_si || "",
        name_en: draft.name_en || "",
        lat: draft.lat || 0,
        lng: draft.lng || 0,
        type: draft.type || "food",
        active: !!draft.active,
        openHours: draft.openHours || "",
        nearestSegmentId: draft.nearestSegmentId || "",
      };
      draft.id ? await repo.set("dansal", draft.id, payload) : await repo.add("dansal", payload);
    } else if (draft.kind === "parking") {
      const payload = {
        name_si: draft.name_si || "",
        name_en: draft.name_en || "",
        lat: draft.lat || 0,
        lng: draft.lng || 0,
        capacity: Number(draft.capacity) || 0,
        status: draft.status || "available",
        vehicleTypes: draft.vehicleTypes || [],
        nearestSegmentId: draft.nearestSegmentId || "",
      };
      draft.id ? await repo.set("parking", draft.id, payload) : await repo.add("parking", payload);
    }
    setDraft(null);
  };

  const del = async () => {
    if (!draft?.id) return;
    const coll = { node: "nodes", segment: "segments", dansal: "dansal", parking: "parking" }[draft.kind] as "nodes" | "segments" | "dansal" | "parking";
    await repo.remove(coll, draft.id);
    setDraft(null);
  };

  const handleOverlayFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Use Anuradhapura bounds as default overlay area
    const c = center;
    const delta = 0.02;
    setOverlay({
      url,
      bounds: [[c.lat - delta, c.lng - delta], [c.lat + delta, c.lng + delta]],
      opacity: 0.5,
    });
    e.target.value = "";
  };

  const segmentLength = draft?.kind === "segment" ? Math.round(polylineLengthMeters(draftPolyline)) : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border-b border-cream-200 px-3 py-2 shrink-0">
        {MODES.map(([id, key]) => (
          <button
            key={id}
            onClick={() => {
              setMode(id);
              if (id === "segment") {
                setDraft({ kind: "segment", fromNodeId: "", toNodeId: "", name_si: "", name_en: "", points: [] });
              } else {
                setDraft(null);
              }
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
              mode === id
                ? "bg-navy-700 text-white border-navy-700"
                : "bg-white text-muted-foreground border-cream-200 hover:border-navy-300"
            }`}
          >
            {t(key)}
          </button>
        ))}
        <label className="cursor-pointer rounded-lg border border-cream-200 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-navy-300 transition-all">
          🖼 {t("admin.editor.uploadOverlay")}
          <input ref={overlayInputRef} type="file" accept="image/*" hidden onChange={handleOverlayFile} />
        </label>
        {overlay && (
          <input
            type="range" min="0" max="1" step="0.05" value={overlay.opacity}
            onChange={(e) => setOverlay({ ...overlay, opacity: Number(e.target.value) })}
            className="w-20 accent-navy-700"
          />
        )}
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0 relative">
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
          onNodeDragEnd={handleNodeDragEnd}
          onSegmentClick={handleSegmentClick}
          onDansalClick={handleDansalClick}
          onParkingClick={handleParkingClick}
        />
      </div>

      {/* Segment mode hint */}
      {mode === "segment" && !draft && (
        <div className="shrink-0 bg-saffron-50 border-t border-saffron-200 px-4 py-2 text-xs font-medium text-saffron-800">
          {t("admin.editor.segmentFrom")} · {t("admin.editor.segmentDirection")}
        </div>
      )}

      {/* Draft form */}
      {draft && (
        <DraftForm
          draft={draft}
          setDraft={setDraft as (d: Draft | null) => void}
          nodes={net.nodes}
          segments={net.segments}
          lang={lang}
          segmentLength={segmentLength}
          onSave={save}
          onDelete={del}
          onCancel={() => setDraft(null)}
          t={t}
        />
      )}
    </div>
  );
}

// ─── Draft Form ──────────────────────────────────────────────────────────────

interface DraftFormProps {
  draft: Draft;
  setDraft: (d: Draft) => void;
  nodes: NetworkNode[];
  segments: NetworkSegment[];
  lang: string;
  segmentLength: number;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  t: ReturnType<typeof useTranslation>["t"];
}

function DraftForm({ draft, setDraft, nodes, segments, lang, segmentLength, onSave, onDelete, onCancel, t }: DraftFormProps) {
  const up = (patch: Partial<typeof draft>) => setDraft({ ...draft, ...patch } as Draft);

  return (
    <div
      className="shrink-0 bg-white border-t border-cream-200 shadow-sheet overflow-y-auto"
      style={{ maxHeight: "52%", paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="p-4 space-y-3">
        {/* Name fields */}
        {(draft.kind === "node" || draft.kind === "dansal" || draft.kind === "parking") && (
          <>
            <FormField label={t("admin.editor.nameSi")}>
              <Input value={draft.name_si || ""} onChange={(e) => up({ name_si: e.target.value })} />
            </FormField>
            <FormField label={t("admin.editor.nameEn")}>
              <Input value={draft.name_en || ""} onChange={(e) => up({ name_en: e.target.value })} />
            </FormField>
          </>
        )}

        {/* Node toggles */}
        {draft.kind === "node" && (
          <div className="flex gap-2">
            <ToggleChip
              active={!!draft.isEntryPoint}
              onClick={() => up({ isEntryPoint: !draft.isEntryPoint })}
            >
              {t("admin.editor.isEntry")}
            </ToggleChip>
            <ToggleChip
              active={!!draft.isExitPoint}
              onClick={() => up({ isExitPoint: !draft.isExitPoint })}
            >
              {t("admin.editor.isExit")}
            </ToggleChip>
          </div>
        )}

        {/* Segment fields */}
        {draft.kind === "segment" && (
          <>
            <FormField label={t("home.from")}>
              <Select value={draft.fromNodeId} onValueChange={(v) => up({ fromNodeId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {nodes.map((n) => (
                    <SelectItem key={n.id} value={n.id}>{localizedName(n, lang)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("home.to")}>
              <Select value={draft.toNodeId} onValueChange={(v) => up({ toNodeId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {nodes.map((n) => (
                    <SelectItem key={n.id} value={n.id}>{localizedName(n, lang)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("admin.editor.nameSi")}>
              <Input value={draft.name_si || ""} onChange={(e) => up({ name_si: e.target.value })} />
            </FormField>
            <FormField label={t("admin.editor.nameEn")}>
              <Input value={draft.name_en || ""} onChange={(e) => up({ name_en: e.target.value })} />
            </FormField>
            <div className="rounded-xl bg-cream-50 border border-cream-200 px-4 py-2.5 text-xs text-muted-foreground">
              {t("admin.editor.length", { n: segmentLength })} · {(draft.points || []).length} shape pts
            </div>
          </>
        )}

        {/* Dansal type */}
        {draft.kind === "dansal" && (
          <FormField label={t("admin.editor.mode")}>
            <Select value={draft.type || "food"} onValueChange={(v) => up({ type: v as DansalType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["food", "drink", "water", "medical", "other"].map((x) => (
                  <SelectItem key={x} value={x}>{t(`dansal.type.${x}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}

        {/* Parking fields */}
        {draft.kind === "parking" && (
          <>
            <FormField label={t("parking.capacity", { n: "" })}>
              <Input
                type="number"
                value={draft.capacity || ""}
                onChange={(e) => up({ capacity: Number(e.target.value) })}
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              {(["car", "bus", "threewheeler", "motorbike"] as VehicleType[]).map((v) => (
                <ToggleChip
                  key={v}
                  active={(draft.vehicleTypes || []).includes(v)}
                  onClick={() =>
                    up({
                      vehicleTypes: (draft.vehicleTypes || []).includes(v)
                        ? (draft.vehicleTypes || []).filter((x) => x !== v)
                        : [...(draft.vehicleTypes || []), v],
                    })
                  }
                >
                  {t(`vehicle.${v}`)}
                </ToggleChip>
              ))}
            </div>
          </>
        )}

        {/* Nearest segment for POIs */}
        {(draft.kind === "dansal" || draft.kind === "parking") && (
          <FormField label="Nearest segment">
            <Select
              value={draft.nearestSegmentId || ""}
              onValueChange={(v) => up({ nearestSegmentId: v })}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {segments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{localizedName(s, lang)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}

        {/* Buttons */}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>
            {t("admin.editor.cancel")}
          </Button>
          {(draft as { id?: string }).id && (
            <Button variant="destructive" onClick={onDelete}>
              {t("admin.editor.delete")}
            </Button>
          )}
          <Button className="flex-[2]" onClick={onSave}>
            {t("admin.editor.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
        active ? "bg-navy-700 text-white border-navy-700" : "bg-white text-muted-foreground border-cream-200 hover:border-navy-300"
      }`}
    >
      {children}
    </button>
  );
}
