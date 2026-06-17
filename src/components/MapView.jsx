import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  dansalIcon,
  parkingIcon,
  nodeIcon,
  dotIcon,
  pinIcon,
  sampleArrowPoints,
  arrowIcon,
} from "./mapBits.js";

function MapTap({ onTap }) {
  useMapEvents({ click: (e) => onTap && onTap({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FitTo({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [bounds, map]);
  return null;
}

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng]);
  }, [center, map]);
  return null;
}

export default function MapView({
  center,
  zoom = 14,
  segments = [],
  route = null,
  nodes = [],
  dansal = [],
  parking = [],
  showDansal = true,
  showParking = true,
  userPos = null,
  destNode = null,
  onMapTap,
  onPickNode,
  fitBounds = null,
}) {
  const routeLatLngs = route?.polyline?.map((p) => [p.lat, p.lng]) || [];
  const arrows = route ? sampleArrowPoints(route.polyline || []) : [];

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      zoomControl={false}
      className="leaflet-container"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
        maxZoom={19}
      />
      <Recenter center={center} />
      {fitBounds && <FitTo bounds={fitBounds} />}
      <MapTap onTap={onMapTap} />

      {/* Network segments: open = thin blue, closed = dashed grey */}
      {segments.map((s) => {
        const closed = s.status === "closed";
        const latlngs = (s.polyline || []).map((p) => [p.lat, p.lng]);
        if (latlngs.length < 2) return null;
        return (
          <Polyline
            key={s.id}
            positions={latlngs}
            pathOptions={{
              color: closed ? "#9aa3b8" : "#5a78c8",
              weight: closed ? 3 : 4,
              opacity: closed ? 0.6 : 0.7,
              dashArray: closed ? "6 8" : null,
            }}
          />
        );
      })}

      {/* Active route highlighted on top, with direction arrows */}
      {routeLatLngs.length > 1 && (
        <>
          <Polyline
            positions={routeLatLngs}
            pathOptions={{ color: "#ff3b30", weight: 7, opacity: 0.95 }}
          />
          {arrows.map((a, i) => (
            <Marker key={i} position={[a.lat, a.lng]} icon={arrowIcon(a.bearing)} interactive={false} />
          ))}
        </>
      )}

      {/* Entry/exit nodes */}
      {nodes
        .filter((n) => n.isEntryPoint || n.isExitPoint)
        .map((n) => (
          <Marker
            key={n.id}
            position={[n.lat, n.lng]}
            icon={nodeIcon(n)}
            eventHandlers={{ click: () => onPickNode && onPickNode(n) }}
          />
        ))}

      {/* Dansal */}
      {showDansal &&
        dansal
          .filter((d) => d.active)
          .map((d) => (
            <Marker key={d.id} position={[d.lat, d.lng]} icon={dansalIcon(d.type)} />
          ))}

      {/* Parking */}
      {showParking &&
        parking.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={parkingIcon(p.status)} />
        ))}

      {/* Destination */}
      {destNode && (
        <Marker position={[destNode.lat, destNode.lng]} icon={pinIcon("🏁", "#16203a")} />
      )}

      {/* User location */}
      {userPos && <Marker position={[userPos.lat, userPos.lng]} icon={dotIcon("#1d3a8a", 18, true)} />}
    </MapContainer>
  );
}
