import L from "leaflet";

// Custom div icons so we don't depend on Leaflet's bundled marker PNGs
// (which break under Vite) and can theme by type/status.
export function pinIcon(emoji, bg = "#1d3a8a", ring = "#fff") {
  return L.divIcon({
    className: "poson-pin",
    html: `<div style="
      width:30px;height:30px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);background:${bg};border:2px solid ${ring};
      box-shadow:0 2px 6px rgba(0,0,0,.35);display:grid;place-items:center;">
      <span style="transform:rotate(45deg);font-size:15px;line-height:1;">${emoji}</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26],
  });
}

export function dotIcon(color = "#1d3a8a", size = 16, pulse = false) {
  return L.divIcon({
    className: "poson-dot",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:3px solid #fff;box-shadow:0 0 0 ${pulse ? "6px rgba(29,58,138,.25)" : "0"};"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const PARK_COLOR = { available: "#1faa59", filling: "#f5a623", full: "#e03131" };
const DANSAL_EMOJI = { food: "🍛", drink: "🥤", water: "💧", medical: "➕", other: "⭐" };

export const dansalIcon = (type) => pinIcon(DANSAL_EMOJI[type] || "⭐", "#e8590c");
export const parkingIcon = (status) => pinIcon("P", PARK_COLOR[status] || "#1d3a8a");
export const nodeIcon = (n) =>
  pinIcon(n.isEntryPoint ? "▶" : n.isExitPoint ? "■" : "•", n.isEntryPoint ? "#1faa59" : n.isExitPoint ? "#e03131" : "#1d3a8a");

// Decorate a polyline with repeating direction arrows by returning midpoint
// rotations. Leaflet has no built-in for this without a plugin, so we render
// arrowheads as separate markers at sampled points (see RouteArrows component).
export function sampleArrowPoints(latlngs, everyMeters = 220) {
  const pts = [];
  let acc = 0;
  for (let i = 1; i < latlngs.length; i++) {
    const a = latlngs[i - 1];
    const b = latlngs[i];
    const d = L.latLng(a).distanceTo(L.latLng(b));
    acc += d;
    if (acc >= everyMeters) {
      acc = 0;
      const bearing = (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
      pts.push({ lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2, bearing });
    }
  }
  return pts;
}

export function arrowIcon(bearingDeg) {
  return L.divIcon({
    className: "poson-arrow",
    html: `<div style="transform:rotate(${bearingDeg}deg);color:#ff3b30;font-size:20px;font-weight:900;line-height:1;text-shadow:0 0 3px #fff;">▲</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}
