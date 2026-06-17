/// <reference types="@types/google.maps" />
import { useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Polyline,
  useMap,
} from "@vis.gl/react-google-maps";
import type { NetworkNode, NetworkSegment, Dansal, Parking, LatLng, RouteResult } from "@/types";
import { POSON_MAP_STYLE } from "@/lib/constants";
import { sampleArrowPoints } from "@/routing/geo";

// ─── Marker HTML factories ───────────────────────────────────────────────────

function nodePin(n: NetworkNode): string {
  const bg = n.isEntryPoint ? "#16a34a" : n.isExitPoint ? "#dc2626" : "#1b3a72";
  const icon = n.isEntryPoint ? "▶" : n.isExitPoint ? "■" : "•";
  return `<div style="
    width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:${bg};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.30);
    display:grid;place-items:center;cursor:pointer;">
    <span style="transform:rotate(45deg);font-size:11px;color:#fff;font-weight:900;line-height:1;">${icon}</span>
  </div>`;
}

const DANSAL_EMOJI: Record<string, string> = { food: "🍛", drink: "🥤", water: "💧", medical: "➕", other: "⭐" };

function dansalPin(type: string): string {
  return `<div style="
    width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:#e8590c;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);
    display:grid;place-items:center;">
    <span style="transform:rotate(45deg);font-size:16px;line-height:1;">${DANSAL_EMOJI[type] || "⭐"}</span>
  </div>`;
}

function parkingPin(status: string): string {
  const COLOR: Record<string, string> = { available: "#16a34a", filling: "#d97706", full: "#dc2626" };
  const bg = COLOR[status] || "#1b3a72";
  return `<div style="
    width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:${bg};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);
    display:grid;place-items:center;">
    <span style="transform:rotate(45deg);font-size:13px;font-weight:900;color:#fff;line-height:1;">P</span>
  </div>`;
}

function userDot(): string {
  return `<div style="
    width:20px;height:20px;border-radius:50%;background:#1b3a72;border:3px solid #fff;
    box-shadow:0 0 0 6px rgba(27,58,114,.20);">
  </div>`;
}

function destPin(): string {
  return `<div style="
    width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:#16203a;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);
    display:grid;place-items:center;">
    <span style="transform:rotate(45deg);font-size:15px;line-height:1;">🏁</span>
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
  fitBounds?: [number, number][] | null;
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
  fitBounds,
}: MapInnerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !fitBounds || fitBounds.length < 2) return;
    const bounds = new window.google.maps.LatLngBounds();
    fitBounds.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    map.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 });
  }, [map, fitBounds]);

  const routeOk = route?.ok ? route : null;
  const routePolyline = routeOk?.polyline ?? [];
  const arrows = routePolyline.length > 1 ? sampleArrowPoints(routePolyline, 120) : [];

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
          <Polyline path={routePolyline} strokeColor="rgba(220,38,38,0.25)" strokeWeight={14} strokeOpacity={1} />
          <Polyline path={routePolyline} strokeColor="#dc2626" strokeWeight={7} strokeOpacity={0.95} />
        </>
      )}

      {arrows.map((a, i) => (
        <AdvancedMarker key={`ra-${i}`} position={{ lat: a.lat, lng: a.lng }}>
          <div style={{ transform: `rotate(${a.bearing}deg)`, color: "#dc2626", fontSize: "14px", fontWeight: 900, lineHeight: 1, textShadow: "0 0 3px #fff", pointerEvents: "none" }}>▲</div>
        </AdvancedMarker>
      ))}

      {nodes.filter((n) => n.isEntryPoint || n.isExitPoint).map((n) => (
        <AdvancedMarker key={n.id} position={{ lat: n.lat, lng: n.lng }} onClick={() => onPickNode?.(n)}>
          <div dangerouslySetInnerHTML={{ __html: nodePin(n) }} />
        </AdvancedMarker>
      ))}

      {showDansal && dansal.filter((d) => d.active).map((d) => (
        <AdvancedMarker key={d.id} position={{ lat: d.lat, lng: d.lng }}>
          <div dangerouslySetInnerHTML={{ __html: dansalPin(d.type) }} />
        </AdvancedMarker>
      ))}

      {showParking && parking.map((p) => (
        <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }}>
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
        <p className="text-center text-sm font-semibold text-navy-700">Google Maps API key required</p>
        <p className="text-center text-xs text-muted-foreground">
          Set <code className="rounded bg-cream-200 px-1 py-0.5">VITE_GOOGLE_MAPS_API_KEY</code> in{" "}
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
        { north: overlayBounds[1][0], south: overlayBounds[0][0], east: overlayBounds[1][1], west: overlayBounds[0][1] },
        { opacity: overlayOpacity, map }
      );
    }
    return () => { overlayRef.current?.setMap(null); };
  }, [map, overlayUrl, overlayBounds, overlayOpacity]);

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
          <AdvancedMarker key={`${s.id}a${i}`} position={{ lat: a.lat, lng: a.lng }}>
            <div style={{ transform: `rotate(${a.bearing}deg)`, color: s.status === "closed" ? "#9aa3b8" : "#5a78c8", fontSize: "12px", fontWeight: 900, pointerEvents: "none" }}>▲</div>
          </AdvancedMarker>
        ))
      )}

      {/* Draft segment preview */}
      {draftPolyline && draftPolyline.length >= 2 && (
        <Polyline path={draftPolyline} strokeColor="#dc2626" strokeWeight={6} strokeOpacity={0.85} />
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
        <AdvancedMarker key={d.id} position={{ lat: d.lat, lng: d.lng }} onClick={() => onDansalClick(d)}>
          <div dangerouslySetInnerHTML={{ __html: dansalPin(d.type) }} />
        </AdvancedMarker>
      ))}

      {/* Parking */}
      {parking.map((p) => (
        <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }} onClick={() => onParkingClick(p)}>
          <div dangerouslySetInnerHTML={{ __html: parkingPin(p.status) }} />
        </AdvancedMarker>
      ))}
    </>
  );
}

export function AdminMapView({ center, zoom, onMapClick, ...rest }: AdminMapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-cream-100 gap-4">
        <div className="text-4xl">🗺️</div>
        <p className="text-sm font-semibold text-navy-700">Set VITE_GOOGLE_MAPS_API_KEY in .env.local</p>
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
