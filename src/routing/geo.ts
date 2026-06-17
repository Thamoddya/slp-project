import type { LatLng } from "@/types";

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function polylineLengthMeters(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
}

function toLocal(origin: LatLng, p: LatLng): { x: number; y: number } {
  const x =
    haversineMeters(origin, { lat: origin.lat, lng: p.lng }) *
    (p.lng < origin.lng ? -1 : 1);
  const y =
    haversineMeters(origin, { lat: p.lat, lng: origin.lng }) *
    (p.lat < origin.lat ? -1 : 1);
  return { x, y };
}

interface NearestSegmentResult {
  point: LatLng;
  distMeters: number;
  t: number;
}

export function nearestOnSegment(p: LatLng, a: LatLng, b: LatLng): NearestSegmentResult {
  const origin = a;
  const pa = toLocal(origin, p);
  const ba = toLocal(origin, b);
  const lenSq = ba.x * ba.x + ba.y * ba.y;
  let t = lenSq === 0 ? 0 : (pa.x * ba.x + pa.y * ba.y) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj: LatLng = {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
  return { point: proj, distMeters: haversineMeters(p, proj), t };
}

interface NearestPolylineResult extends NearestSegmentResult {
  index: number;
  remainingToEndMeters: number;
}

export function nearestOnPolyline(p: LatLng, points: LatLng[]): NearestPolylineResult | null {
  let best: (NearestSegmentResult & { index: number }) | null = null;
  for (let i = 1; i < points.length; i++) {
    const r = nearestOnSegment(p, points[i - 1], points[i]);
    if (!best || r.distMeters < best.distMeters) {
      best = { ...r, index: i - 1 };
    }
  }
  if (!best) return null;

  let remaining = haversineMeters(best.point, points[best.index + 1]);
  for (let i = best.index + 2; i < points.length; i++) {
    remaining += haversineMeters(points[i - 1], points[i]);
  }
  return { ...best, remainingToEndMeters: remaining };
}

export interface ArrowPoint extends LatLng {
  bearing: number;
}

export function sampleArrowPoints(latlngs: LatLng[], everyMeters = 220): ArrowPoint[] {
  const pts: ArrowPoint[] = [];
  let acc = 0;
  for (let i = 1; i < latlngs.length; i++) {
    const a = latlngs[i - 1];
    const b = latlngs[i];
    const d = haversineMeters(a, b);
    acc += d;
    if (acc >= everyMeters) {
      acc = 0;
      const bearing = (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
      pts.push({ lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2, bearing });
    }
  }
  return pts;
}
