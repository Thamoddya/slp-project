import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, ImageOverlay, useMapEvents, useMap } from "react-leaflet";
import { useTranslation } from "react-i18next";
import repo from "../../data/repo.js";
import { polylineLengthMeters } from "../../routing/geo.js";
import { nodeIcon, dansalIcon, parkingIcon, pinIcon, sampleArrowPoints, arrowIcon } from "../../components/mapBits.js";
import { localizedName } from "../../components/format.js";

const MODES = [
  ["view", "modeView"],
  ["node", "modeNode"],
  ["segment", "modeSegment"],
  ["dansal", "modeDansal"],
  ["parking", "modeParking"],
];

function ClickCatcher({ onClick }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function MapRef({ onReady }) {
  const map = useMap();
  onReady(map);
  return null;
}

export default function Editor({ net }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const center = net.config?.mapCenter || { lat: 8.3494, lng: 80.3975 };

  const [mode, setMode] = useState("view");
  const [draft, setDraft] = useState(null); // entity being created/edited
  const [overlay, setOverlay] = useState(null); // {url, bounds, opacity}
  const [mapRef, setMapRef] = useState(null);

  const nodeById = useMemo(() => Object.fromEntries(net.nodes.map((n) => [n.id, n])), [net.nodes]);

  // ---- map click handling per mode ----
  const onMapClick = (pt) => {
    if (mode === "node") {
      setDraft({ kind: "node", lat: pt.lat, lng: pt.lng, name_si: "", name_en: "", isEntryPoint: false, isExitPoint: false });
    } else if (mode === "dansal") {
      setDraft({ kind: "dansal", lat: pt.lat, lng: pt.lng, name_si: "", name_en: "", type: "food", active: true, openHours: "", nearestSegmentId: "" });
    } else if (mode === "parking") {
      setDraft({ kind: "parking", lat: pt.lat, lng: pt.lng, name_si: "", name_en: "", capacity: 100, status: "available", vehicleTypes: ["car"], nearestSegmentId: "" });
    } else if (mode === "segment" && draft?.kind === "segment") {
      // add an intermediate shape vertex
      setDraft({ ...draft, points: [...draft.points, pt] });
    }
  };

  const startSegment = () => setDraft({ kind: "segment", fromNodeId: "", toNodeId: "", name_si: "", name_en: "", points: [] });

  const segPolyline = (d) => {
    const pts = [];
    if (d.fromNodeId && nodeById[d.fromNodeId]) pts.push({ lat: nodeById[d.fromNodeId].lat, lng: nodeById[d.fromNodeId].lng });
    pts.push(...d.points);
    if (d.toNodeId && nodeById[d.toNodeId]) pts.push({ lat: nodeById[d.toNodeId].lat, lng: nodeById[d.toNodeId].lng });
    return pts;
  };

  const save = async () => {
    const d = draft;
    if (d.kind === "node") {
      const payload = { name_si: d.name_si, name_en: d.name_en, lat: d.lat, lng: d.lng, isEntryPoint: !!d.isEntryPoint, isExitPoint: !!d.isExitPoint };
      d.id ? await repo.set("nodes", d.id, payload) : await repo.add("nodes", payload);
    } else if (d.kind === "segment") {
      if (!d.fromNodeId || !d.toNodeId || d.fromNodeId === d.toNodeId) return;
      const polyline = segPolyline(d);
      const payload = {
        fromNodeId: d.fromNodeId,
        toNodeId: d.toNodeId,
        name_si: d.name_si,
        name_en: d.name_en,
        polyline,
        lengthMeters: Math.round(polylineLengthMeters(polyline)),
        status: d.status || "open",
        notes: d.notes || "",
      };
      d.id ? await repo.set("segments", d.id, payload) : await repo.add("segments", payload);
    } else if (d.kind === "dansal") {
      const payload = { name_si: d.name_si, name_en: d.name_en, lat: d.lat, lng: d.lng, type: d.type, active: !!d.active, openHours: d.openHours, nearestSegmentId: d.nearestSegmentId };
      d.id ? await repo.set("dansal", d.id, payload) : await repo.add("dansal", payload);
    } else if (d.kind === "parking") {
      const payload = { name_si: d.name_si, name_en: d.name_en, lat: d.lat, lng: d.lng, capacity: Number(d.capacity) || 0, status: d.status, vehicleTypes: d.vehicleTypes, nearestSegmentId: d.nearestSegmentId };
      d.id ? await repo.set("parking", d.id, payload) : await repo.add("parking", payload);
    }
    setDraft(null);
  };

  const del = async () => {
    const coll = { node: "nodes", segment: "segments", dansal: "dansal", parking: "parking" }[draft.kind];
    if (draft.id) await repo.remove(coll, draft.id);
    setDraft(null);
  };

  const editNode = (n) => setDraft({ kind: "node", ...n });
  const editSegment = (s) => setDraft({ kind: "segment", id: s.id, fromNodeId: s.fromNodeId, toNodeId: s.toNodeId, name_si: s.name_si, name_en: s.name_en, status: s.status, points: (s.polyline || []).slice(1, -1) });

  const onOverlayFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !mapRef) return;
    const url = URL.createObjectURL(file);
    const b = mapRef.getBounds();
    setOverlay({ url, bounds: [[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]], opacity: 0.5 });
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="toolbar">
        {MODES.map(([id, key]) => (
          <button
            key={id}
            className={"toggle " + (mode === id ? "on" : "")}
            onClick={() => {
              setMode(id);
              setDraft(id === "segment" ? { kind: "segment", fromNodeId: "", toNodeId: "", name_si: "", name_en: "", points: [] } : null);
            }}
          >
            {t("admin.editor." + key)}
          </button>
        ))}
        <label className="toggle" style={{ cursor: "pointer" }}>
          🖼 {t("admin.editor.uploadOverlay")}
          <input type="file" accept="image/*" hidden onChange={onOverlayFile} />
        </label>
        {overlay && (
          <input
            type="range" min="0" max="1" step="0.05" value={overlay.opacity}
            onChange={(e) => setOverlay({ ...overlay, opacity: Number(e.target.value) })}
            style={{ width: 90 }}
          />
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <MapContainer center={[center.lat, center.lng]} zoom={net.config?.defaultZoom || 14} className="leaflet-container">
          <MapRef onReady={setMapRef} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" maxZoom={19} />
          {overlay && <ImageOverlay url={overlay.url} bounds={overlay.bounds} opacity={overlay.opacity} />}
          <ClickCatcher onClick={onMapClick} />

          {/* segments + arrows */}
          {net.segments.map((s) => {
            const ll = (s.polyline || []).map((p) => [p.lat, p.lng]);
            if (ll.length < 2) return null;
            const closed = s.status === "closed";
            return (
              <Polyline key={s.id} positions={ll}
                pathOptions={{ color: closed ? "#9aa3b8" : "#5a78c8", weight: 4, opacity: 0.8, dashArray: closed ? "6 8" : null }}
                eventHandlers={{ click: () => mode === "view" && editSegment(s) }}
              />
            );
          })}
          {net.segments.flatMap((s) =>
            sampleArrowPoints(s.polyline || [], 260).map((a, i) => (
              <Marker key={s.id + "a" + i} position={[a.lat, a.lng]} icon={arrowIcon(a.bearing)} interactive={false} />
            ))
          )}

          {/* draft segment preview */}
          {draft?.kind === "segment" && segPolyline(draft).length >= 2 && (
            <Polyline positions={segPolyline(draft).map((p) => [p.lat, p.lng])} pathOptions={{ color: "#ff3b30", weight: 6, dashArray: "2 8" }} />
          )}

          {/* nodes */}
          {net.nodes.map((n) => (
            <Marker
              key={n.id}
              position={[n.lat, n.lng]}
              icon={nodeIcon(n)}
              draggable={mode === "view"}
              eventHandlers={{
                click: () => {
                  if (mode === "view") editNode(n);
                  else if (mode === "segment" && draft?.kind === "segment") {
                    if (!draft.fromNodeId) setDraft({ ...draft, fromNodeId: n.id });
                    else if (!draft.toNodeId && n.id !== draft.fromNodeId) setDraft({ ...draft, toNodeId: n.id });
                  }
                },
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  repo.update("nodes", n.id, { lat: ll.lat, lng: ll.lng });
                },
              }}
            />
          ))}

          {net.dansal.map((d) => (
            <Marker key={d.id} position={[d.lat, d.lng]} icon={dansalIcon(d.type)} eventHandlers={{ click: () => mode === "view" && setDraft({ kind: "dansal", ...d }) }} />
          ))}
          {net.parking.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={parkingIcon(p.status)} eventHandlers={{ click: () => mode === "view" && setDraft({ kind: "parking", ...p }) }} />
          ))}
        </MapContainer>
      </div>

      {/* hint bar */}
      {mode === "segment" && (
        <div className="banner">{t("admin.editor.segmentFrom")} · {t("admin.editor.segmentDirection")}</div>
      )}

      {draft && (
        <DraftForm
          draft={draft}
          setDraft={setDraft}
          nodes={net.nodes}
          segments={net.segments}
          lang={lang}
          onSave={save}
          onDelete={del}
          onCancel={() => setDraft(null)}
        />
      )}
    </div>
  );
}

function DraftForm({ draft, setDraft, nodes, segments, lang, onSave, onDelete, onCancel }) {
  const { t } = useTranslation();
  const up = (patch) => setDraft({ ...draft, ...patch });
  const segPts = draft.kind === "segment"
    ? [
        draft.fromNodeId && nodes.find((n) => n.id === draft.fromNodeId),
        ...draft.points,
        draft.toNodeId && nodes.find((n) => n.id === draft.toNodeId),
      ].filter(Boolean)
    : [];

  return (
    <div className="sheet" style={{ position: "relative", maxHeight: "55%" }}>
      <div className="grip" />

      {(draft.kind === "node" || draft.kind === "dansal" || draft.kind === "parking") && (
        <>
          <div className="field"><label>{t("admin.editor.nameSi")}</label>
            <input className="input" value={draft.name_si} onChange={(e) => up({ name_si: e.target.value })} /></div>
          <div className="field"><label>{t("admin.editor.nameEn")}</label>
            <input className="input" value={draft.name_en} onChange={(e) => up({ name_en: e.target.value })} /></div>
        </>
      )}

      {draft.kind === "node" && (
        <div className="toggles">
          <button className={"toggle " + (draft.isEntryPoint ? "on" : "")} onClick={() => up({ isEntryPoint: !draft.isEntryPoint })}>{t("admin.editor.isEntry")}</button>
          <button className={"toggle " + (draft.isExitPoint ? "on" : "")} onClick={() => up({ isExitPoint: !draft.isExitPoint })}>{t("admin.editor.isExit")}</button>
        </div>
      )}

      {draft.kind === "segment" && (
        <>
          <div className="field"><label>{t("home.from")}</label>
            <select className="select" value={draft.fromNodeId} onChange={(e) => up({ fromNodeId: e.target.value })}>
              <option value="">—</option>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.name_en} / {n.name_si}</option>)}
            </select></div>
          <div className="field"><label>{t("home.to")}</label>
            <select className="select" value={draft.toNodeId} onChange={(e) => up({ toNodeId: e.target.value })}>
              <option value="">—</option>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.name_en} / {n.name_si}</option>)}
            </select></div>
          <div className="field"><label>{t("admin.editor.nameSi")}</label>
            <input className="input" value={draft.name_si} onChange={(e) => up({ name_si: e.target.value })} /></div>
          <div className="field"><label>{t("admin.editor.nameEn")}</label>
            <input className="input" value={draft.name_en} onChange={(e) => up({ name_en: e.target.value })} /></div>
          <div className="alert info">
            {t("admin.editor.length", { n: Math.round(polylineLengthMeters(segPts)) })} · {draft.points.length} shape pts
          </div>
        </>
      )}

      {draft.kind === "dansal" && (
        <div className="field"><label>{t("admin.editor.mode")}</label>
          <select className="select" value={draft.type} onChange={(e) => up({ type: e.target.value })}>
            {["food", "drink", "water", "medical", "other"].map((x) => <option key={x} value={x}>{t("dansal.type." + x)}</option>)}
          </select></div>
      )}

      {draft.kind === "parking" && (
        <>
          <div className="field"><label>{t("parking.capacity", { n: "" })}</label>
            <input className="input" type="number" value={draft.capacity} onChange={(e) => up({ capacity: e.target.value })} /></div>
          <div className="toggles">
            {["car", "bus", "threewheeler", "motorbike"].map((v) => (
              <button key={v} className={"toggle " + ((draft.vehicleTypes || []).includes(v) ? "on" : "")}
                onClick={() => up({ vehicleTypes: (draft.vehicleTypes || []).includes(v) ? draft.vehicleTypes.filter((x) => x !== v) : [...(draft.vehicleTypes || []), v] })}>
                {t("vehicle." + v)}
              </button>
            ))}
          </div>
        </>
      )}

      {(draft.kind === "dansal" || draft.kind === "parking") && (
        <div className="field"><label>nearest segment</label>
          <select className="select" value={draft.nearestSegmentId} onChange={(e) => up({ nearestSegmentId: e.target.value })}>
            <option value="">—</option>
            {segments.map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
          </select></div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>{t("admin.editor.cancel")}</button>
        {draft.id && <button className="btn" style={{ background: "var(--red)", color: "#fff" }} onClick={onDelete}>{t("admin.editor.delete")}</button>}
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={onSave}>{t("admin.editor.save")}</button>
      </div>
    </div>
  );
}
