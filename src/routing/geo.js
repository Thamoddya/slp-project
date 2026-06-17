// Pure geometry helpers. No external deps so they are trivially testable.

const EARTH_RADIUS_M = 6371000;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance between two {lat,lng} points in metres. */
export function haversineMeters(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total length in metres of a polyline given as an array of {lat,lng}. */
export function polylineLengthMeters(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
}

// Project lat/lng to a local planar frame (metres) around an origin so we can
// do fast point-to-segment math. Accurate enough at city scale.
function toLocal(origin, p) {
  const x = haversineMeters(origin, { lat: origin.lat, lng: p.lng }) *
    (p.lng < origin.lng ? -1 : 1);
  const y = haversineMeters(origin, { lat: p.lat, lng: origin.lng }) *
    (p.lat < origin.lat ? -1 : 1);
  return { x, y };
}

/**
 * Nearest point on a segment [a,b] to point p. Returns {point, distMeters, t}
 * where t in [0,1] is the position along the segment.
 */
export function nearestOnSegment(p, a, b) {
  const origin = a;
  const pa = toLocal(origin, p);
  const ba = toLocal(origin, b); // a is origin -> {0,0}
  const lenSq = ba.x * ba.x + ba.y * ba.y;
  let t = lenSq === 0 ? 0 : (pa.x * ba.x + pa.y * ba.y) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
  return { point: proj, distMeters: haversineMeters(p, proj), t };
}

/**
 * Nearest point on a polyline to p. Returns {point, distMeters, index, t,
 * remainingToEndMeters} where index is the starting vertex of the matched
 * segment and remainingToEndMeters is the forward distance along the polyline
 * from the snapped point to the LAST vertex (the toNode end). Forward only —
 * this is what a one-way segment lets you travel after joining mid-road.
 */
export function nearestOnPolyline(p, points) {
  let best = null;
  for (let i = 1; i < points.length; i++) {
    const r = nearestOnSegment(p, points[i - 1], points[i]);
    if (!best || r.distMeters < best.distMeters) {
      best = { ...r, index: i - 1 };
    }
  }
  if (!best) return null;

  // forward distance from snap point to the end of the polyline
  let remaining = haversineMeters(best.point, points[best.index + 1]);
  for (let i = best.index + 2; i < points.length; i++) {
    remaining += haversineMeters(points[i - 1], points[i]);
  }
  best.remainingToEndMeters = remaining;
  return best;
}
