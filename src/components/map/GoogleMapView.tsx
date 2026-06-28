/// <reference types="@types/google.maps" />
import { POSON_MAP_STYLE } from "@/lib/constants";
import { sampleArrowPoints } from "@/routing/geo";
import type {
  Dansal,
  LatLng,
  NetworkNode,
  NetworkSegment,
  Parking,
  RouteResult,
} from "@/types";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Polyline,
  useMap,
} from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";

// ─── Marker HTML factories ───────────────────────────────────────────────────
// Clean white SVG glyphs inside coloured tear-drop pins (no emoji) for a
// consistent, professional look across the whole map.

const svg = (inner: string, size = 16): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="display:block">${inner}</svg>`;

// category → strong pin colour + white glyph
const DANSAL_COLOR: Record<string, string> = {
  food: "#e8590c",
  drink: "#2563eb",
  water: "#0891b2",
  medical: "#dc2626",
  other: "#d97706",
};
const GLYPH: Record<string, string> = {
  food: `<path d="M3 11 A9 9 0 0 0 21 11 Z" fill="#fff"/><path d="M2.5 11 H21.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  drink: `<path d="M7 7 H17 L15.8 19 A1.6 1.6 0 0 1 14.2 20.4 H9.8 A1.6 1.6 0 0 1 8.2 19 Z" fill="#fff"/>`,
  water: `<path d="M12 3 C12 3 18.5 10.5 18.5 14.5 A6.5 6.5 0 0 1 5.5 14.5 C5.5 10.5 12 3 12 3 Z" fill="#fff"/>`,
  medical: `<path d="M10 4 H14 V8 H18 V12 H14 V16 H10 V12 H6 V8 H10 Z" fill="#fff"/>`,
  other: `<path d="M12 3.5 L14.6 8.8 L20.4 9.6 L16.2 13.7 L17.2 19.5 L12 16.8 L6.8 19.5 L7.8 13.7 L3.6 9.6 L9.4 8.8 Z" fill="#fff"/>`,
};
const NODE_GLYPH = {
  entry: `<path d="M8 5 L19 12 L8 19 Z" fill="#fff"/>`,
  exit: `<rect x="7" y="7" width="10" height="10" rx="2" fill="#fff"/>`,
  plain: `<circle cx="12" cy="12" r="4.5" fill="#fff"/>`,
};
const FLAG_GLYPH = `<path d="M7 4 V20.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M7.6 5 H16.5 L14.2 8.2 L16.5 11.4 H7.6 Z" fill="#fff"/>`;

function pinShell(bg: string, inner: string, size = 32): string {
  return `<div style="
    width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:${bg};border:2px solid #fff;box-shadow:0 4px 12px rgba(16,24,40,.28);
    display:grid;place-items:center;cursor:pointer;">
    <span style="transform:rotate(45deg);display:grid;place-items:center;">${inner}</span>
  </div>`;
}

function nodePin(n: NetworkNode): string {
  const bg = n.isEntryPoint ? "#16a34a" : n.isExitPoint ? "#dc2626" : "#1b3a72";
  const g = n.isEntryPoint
    ? NODE_GLYPH.entry
    : n.isExitPoint
      ? NODE_GLYPH.exit
      : NODE_GLYPH.plain;
  return pinShell(bg, svg(g, 15), 30);
}

function dansalPin(type: string): string {
  return pinShell(
    DANSAL_COLOR[type] || "#d97706",
    svg(GLYPH[type] || GLYPH.other, 17),
    34,
  );
}

function parkingPin(status: string): string {
  const COLOR: Record<string, string> = {
    available: "#16a34a",
    filling: "#d97706",
    full: "#dc2626",
  };
  const inner = `<span style="font:900 13px/1 Inter,system-ui,sans-serif;color:#fff;">P</span>`;
  return pinShell(COLOR[status] || "#1b3a72", inner, 30);
}

function destPin(): string {
  return pinShell("#16203a", svg(FLAG_GLYPH, 16), 32);
}

function userDot(): string {
  return `<div style="
    width:18px;height:18px;border-radius:50%;background:#1b3a72;border:3px solid #fff;
    box-shadow:0 0 0 6px rgba(27,58,114,.18);">
  </div>`;
}

// Draggable pin for the point currently being placed/edited in the admin editor.
function draftPin(): string {
  return `<div style="position:relative;display:grid;place-items:center;">
    <div style="position:absolute;width:42px;height:42px;border-radius:50%;background:rgba(220,38,38,.18);"></div>
    <div style="width:38px;height:38px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:#dc2626;border:3px solid #fff;box-shadow:0 6px 16px rgba(16,24,40,.4);
      display:grid;place-items:center;cursor:grab;">
      <span style="transform:rotate(45deg);"><svg viewBox="0 0 24 24" width="16" height="16" style="display:block"><path d="M12 2 v6 M12 16 v6 M2 12 h6 M16 12 h6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="#fff"/></svg></span>
    </div>
  </div>`;
}

const MAP_ID = () => import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

// ─── Public map inner (lives inside a <Map>) ─────────────────────────────────

interface MapInnerProps {
  center: LatLng;
  zoom: number;
  segments: NetworkSegment[];
  route: RouteResult | null;
  nodes: NetworkNode[];
  dansal: Dansal[];
  parking: Parking[];
  showDansal: boolean;
  showParking: boolean;
  userPos: LatLng | null;
  destNode: NetworkNode | null;
  onMapTap?: (pt: LatLng) => void;
  onPickNode?: (node: NetworkNode) => void;
  /** Called when a Dansal pin is tapped — opens the place detail popup. */
  onDansalTap?: (d: Dansal) => void;
  /** Called when a Parking pin is tapped — opens the place detail popup. */
  onParkingTap?: (p: Parking) => void;
  fitBounds?: [number, number][] | null;
  /** Pan/zoom the map to a point; bump `nonce` to re-trigger. */
  focus?: { lat: number; lng: number; zoom?: number; nonce: number } | null;
}

function MapInner({
  center,
  zoom,
  segments,
  route,
  nodes,
  dansal,
  parking,
  showDansal,
  showParking,
  userPos,
  destNode,
  onMapTap,
  onPickNode,
  onDansalTap,
  onParkingTap,
  fitBounds,
  focus,
}: MapInnerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !fitBounds || fitBounds.length < 2) return;
    const bounds = new window.google.maps.LatLngBounds();
    fitBounds.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    map.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 });
  }, [map, fitBounds]);

  useEffect(() => {
    if (!map || !focus) return;
    map.panTo({ lat: focus.lat, lng: focus.lng });
    if (focus.zoom) map.setZoom(focus.zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus?.nonce]);

  const routeOk = route?.ok ? route : null;
  const routePolyline = routeOk?.polyline ?? [];
  const arrows =
    routePolyline.length > 1 ? sampleArrowPoints(routePolyline, 120) : [];

  return (
    <Map
      mapId={MAP_ID()}
      defaultCenter={{ lat: center.lat, lng: center.lng }}
      defaultZoom={zoom}
      gestureHandling="greedy"
      disableDefaultUI
      zoomControl
      styles={POSON_MAP_STYLE}
      className="h-full w-full"
      onClick={(e) => {
        if (e.detail?.latLng && onMapTap)
          onMapTap({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
      }}
    >
      {segments.map((s) => {
        if (!s.polyline || s.polyline.length < 2) return null;
        const closed = s.status === "closed";
        return (
          <Polyline
            key={s.id}
            path={s.polyline}
            strokeColor={closed ? "#9aa3b8" : "#5a78c8"}
            strokeWeight={closed ? 3 : 4}
            strokeOpacity={closed ? 0.5 : 0.75}
          />
        );
      })}

      {routePolyline.length > 1 && (
        <>
          <Polyline
            path={routePolyline}
            strokeColor="rgba(220,38,38,0.25)"
            strokeWeight={14}
            strokeOpacity={1}
          />
          <Polyline
            path={routePolyline}
            strokeColor="#dc2626"
            strokeWeight={7}
            strokeOpacity={0.95}
          />
        </>
      )}

      {arrows.map((a, i) => (
        <AdvancedMarker key={`ra-${i}`} position={{ lat: a.lat, lng: a.lng }}>
          <div
            style={{
              transform: `rotate(${a.bearing}deg)`,
              color: "#dc2626",
              fontSize: "14px",
              fontWeight: 900,
              lineHeight: 1,
              textShadow: "0 0 3px #fff",
              pointerEvents: "none",
            }}
          >
            ▲
          </div>
        </AdvancedMarker>
      ))}

      {nodes
        .filter((n) => n.isEntryPoint || n.isExitPoint)
        .map((n) => (
          <AdvancedMarker
            key={n.id}
            position={{ lat: n.lat, lng: n.lng }}
            onClick={() => onPickNode?.(n)}
          >
            <div dangerouslySetInnerHTML={{ __html: nodePin(n) }} />
          </AdvancedMarker>
        ))}

      {showDansal &&
        dansal
          .filter((d) => d.active)
          .map((d) => (
            <AdvancedMarker
              key={d.id}
              position={{ lat: d.lat, lng: d.lng }}
              onClick={onDansalTap ? () => onDansalTap(d) : undefined}
            >
              <div dangerouslySetInnerHTML={{ __html: dansalPin(d.type) }} />
            </AdvancedMarker>
          ))}

      {showParking &&
        parking.map((p) => (
          <AdvancedMarker
            key={p.id}
            position={{ lat: p.lat, lng: p.lng }}
            onClick={onParkingTap ? () => onParkingTap(p) : undefined}
          >
            <div dangerouslySetInnerHTML={{ __html: parkingPin(p.status) }} />
          </AdvancedMarker>
        ))}

      {destNode && (
        <AdvancedMarker position={{ lat: destNode.lat, lng: destNode.lng }}>
          <div dangerouslySetInnerHTML={{ __html: destPin() }} />
        </AdvancedMarker>
      )}

      {userPos && (
        <AdvancedMarker position={{ lat: userPos.lat, lng: userPos.lng }}>
          <div dangerouslySetInnerHTML={{ __html: userDot() }} />
        </AdvancedMarker>
      )}
    </Map>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export interface GoogleMapViewProps extends MapInnerProps {}

export default function GoogleMapView(props: GoogleMapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-cream-100 gap-3 p-6">
        <div className="text-4xl">🗺️</div>
        <p className="text-center text-sm font-semibold text-navy-700">
          Google Maps API key required
        </p>
        <p className="text-center text-xs text-muted-foreground">
          Set{" "}
          <code className="rounded bg-cream-200 px-1 py-0.5">
            VITE_GOOGLE_MAPS_API_KEY
          </code>{" "}
          in{" "}
          <code className="rounded bg-cream-200 px-1 py-0.5">.env.local</code>
        </p>
      </div>
    );
  }
  return (
    <APIProvider apiKey={apiKey}>
      <MapInner {...props} />
    </APIProvider>
  );
}

// ─── Admin editor variant ─────────────────────────────────────────────────────
// AdminMapContent renders markers/polylines — must live INSIDE a <Map>
// AdminMapView wraps with APIProvider > Map, then renders AdminMapContent inside

export interface AdminMapViewProps {
  center: LatLng;
  zoom: number;
  segments: NetworkSegment[];
  nodes: NetworkNode[];
  dansal: Dansal[];
  parking: Parking[];
  draftPolyline?: LatLng[];
  /** A single point being placed/edited (node, dansal or parking) — draggable. */
  draftPoint?: { lat: number; lng: number; kind: string } | null;
  onDraftMove?: (lat: number, lng: number) => void;
  userPos?: LatLng | null;
  focus?: { lat: number; lng: number; zoom?: number; nonce: number } | null;
  overlayUrl?: string;
  overlayBounds?: [[number, number], [number, number]];
  overlayOpacity?: number;
  mode: string;
  onMapClick: (pt: LatLng) => void;
  onNodeClick: (n: NetworkNode) => void;
  onNodeDragEnd: (id: string, lat: number, lng: number) => void;
  onSegmentClick: (s: NetworkSegment) => void;
  onDansalClick: (d: Dansal) => void;
  onParkingClick: (p: Parking) => void;
}

// This component renders overlay + markers — NO <Map> wrapper here
function AdminMapContent({
  segments,
  nodes,
  dansal,
  parking,
  draftPolyline,
  draftPoint,
  onDraftMove,
  userPos,
  focus,
  overlayUrl,
  overlayBounds,
  overlayOpacity = 0.5,
  mode,
  onNodeClick,
  onNodeDragEnd,
  onSegmentClick,
  onDansalClick,
  onParkingClick,
}: Omit<AdminMapViewProps, "center" | "zoom" | "onMapClick">) {
  const map = useMap();
  const overlayRef = useRef<google.maps.GroundOverlay | null>(null);

  useEffect(() => {
    if (!map) return;
    overlayRef.current?.setMap(null);
    overlayRef.current = null;
    if (overlayUrl && overlayBounds) {
      overlayRef.current = new window.google.maps.GroundOverlay(
        overlayUrl,
        {
          north: overlayBounds[1][0],
          south: overlayBounds[0][0],
          east: overlayBounds[1][1],
          west: overlayBounds[0][1],
        },
        { opacity: overlayOpacity, map },
      );
    }
    return () => {
      overlayRef.current?.setMap(null);
    };
  }, [map, overlayUrl, overlayBounds, overlayOpacity]);

  useEffect(() => {
    if (!map || !focus) return;
    map.panTo({ lat: focus.lat, lng: focus.lng });
    if (focus.zoom) map.setZoom(focus.zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus?.nonce]);

  return (
    <>
      {/* Segments */}
      {segments.map((s) => {
        if (!s.polyline || s.polyline.length < 2) return null;
        const closed = s.status === "closed";
        return (
          <Polyline
            key={s.id}
            path={s.polyline}
            strokeColor={closed ? "#9aa3b8" : "#5a78c8"}
            strokeWeight={closed ? 3 : 5}
            strokeOpacity={0.85}
            onClick={() => onSegmentClick(s)}
          />
        );
      })}

      {/* Direction arrows */}
      {segments.flatMap((s) =>
        sampleArrowPoints(s.polyline || [], 260).map((a, i) => (
          <AdvancedMarker
            key={`${s.id}a${i}`}
            position={{ lat: a.lat, lng: a.lng }}
          >
            <div
              style={{
                transform: `rotate(${a.bearing}deg)`,
                color: s.status === "closed" ? "#9aa3b8" : "#5a78c8",
                fontSize: "12px",
                fontWeight: 900,
                pointerEvents: "none",
              }}
            >
              ▲
            </div>
          </AdvancedMarker>
        )),
      )}

      {/* Draft segment preview */}
      {draftPolyline && draftPolyline.length >= 2 && (
        <Polyline
          path={draftPolyline}
          strokeColor="#dc2626"
          strokeWeight={6}
          strokeOpacity={0.85}
        />
      )}

      {/* Nodes */}
      {nodes.map((n) => (
        <AdvancedMarker
          key={n.id}
          position={{ lat: n.lat, lng: n.lng }}
          draggable={mode === "view"}
          onClick={() => onNodeClick(n)}
          onDragEnd={(e) => {
            const ll = e.latLng;
            if (ll) onNodeDragEnd(n.id, ll.lat(), ll.lng());
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: nodePin(n) }} />
        </AdvancedMarker>
      ))}

      {/* Dansal */}
      {dansal.map((d) => (
        <AdvancedMarker
          key={d.id}
          position={{ lat: d.lat, lng: d.lng }}
          onClick={() => onDansalClick(d)}
        >
          <div dangerouslySetInnerHTML={{ __html: dansalPin(d.type) }} />
        </AdvancedMarker>
      ))}

      {/* Parking */}
      {parking.map((p) => (
        <AdvancedMarker
          key={p.id}
          position={{ lat: p.lat, lng: p.lng }}
          onClick={() => onParkingClick(p)}
        >
          <div dangerouslySetInnerHTML={{ __html: parkingPin(p.status) }} />
        </AdvancedMarker>
      ))}

      {/* Admin's own location */}
      {userPos && (
        <AdvancedMarker position={{ lat: userPos.lat, lng: userPos.lng }}>
          <div dangerouslySetInnerHTML={{ __html: userDot() }} />
        </AdvancedMarker>
      )}

      {/* Draft point being placed/edited — draggable so it's easy to aim */}
      {draftPoint && (
        <AdvancedMarker
          position={{ lat: draftPoint.lat, lng: draftPoint.lng }}
          draggable
          onDragEnd={(e) => {
            const ll = e.latLng;
            if (ll && onDraftMove) onDraftMove(ll.lat(), ll.lng());
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: draftPin() }} />
        </AdvancedMarker>
      )}
    </>
  );
}

export function AdminMapView({
  center,
  zoom,
  onMapClick,
  ...rest
}: AdminMapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-cream-100 gap-4">
        <div className="text-4xl">🗺️</div>
        <p className="text-sm font-semibold text-navy-700">
          Set VITE_GOOGLE_MAPS_API_KEY in .env.local
        </p>
      </div>
    );
  }
  return (
    <APIProvider apiKey={apiKey}>
      <Map
        mapId={MAP_ID()}
        defaultCenter={{ lat: center.lat, lng: center.lng }}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        styles={POSON_MAP_STYLE}
        className="h-full w-full"
        onClick={(e) => {
          if (e.detail?.latLng)
            onMapClick({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
        }}
      >
        <AdminMapContent {...rest} />
      </Map>
    </APIProvider>
  );
}
