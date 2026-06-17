import type { NetworkNode, NetworkSegment, Dansal, Parking, AppConfig } from "@/types";
import { polylineLengthMeters } from "@/routing/geo";

const N = (
  id: string,
  name_si: string,
  name_en: string,
  lat: number,
  lng: number,
  extra: Partial<NetworkNode> = {}
): NetworkNode => ({
  id,
  name_si,
  name_en,
  lat,
  lng,
  isEntryPoint: false,
  isExitPoint: false,
  ...extra,
});

export const seedNodes: NetworkNode[] = [
  N("pothanegama", "පොතානේගම හන්දිය", "Pothanegama Junction", 8.321, 80.406, { isEntryPoint: true }),
  N("mirisaveti", "මිරිසවැටිය", "Mirisaveti", 8.3447, 80.393),
  N("srimahabodhi", "ශ්‍රී මහා බෝධිය", "Sri Maha Bodhi", 8.3472, 80.3964, { isEntryPoint: true }),
  N("lovamahapaya", "ලෝවාමහාපාය", "Lovamahapaya", 8.3486, 80.3968),
  N("ruwanwelisaya", "රුවන්වැලිසෑය", "Ruwanwelisaya", 8.3494, 80.3964),
  N("thuparamaya", "ථූපාරාමය", "Thuparamaya", 8.3536, 80.396),
  N("lankarama", "ලංකාරාමය", "Lankarama", 8.3585, 80.3905),
  N("abhayagiri", "අභයගිරිය", "Abhayagiri", 8.3636, 80.3958),
  N("jetavanaramaya", "ජේතවනාරාමය", "Jetavanaramaya", 8.35, 80.403),
  N("sacredcityjn", "පූජා නගර හන්දිය", "Sacred City Junction", 8.342, 80.401),
  N("yapanaya", "යාපනය හන්දිය", "Yapanaya Junction", 8.37, 80.404, { isExitPoint: true }),
  N("busstandjn", "බස් නැවතුම් හන්දිය", "Bus Stand Junction", 8.336, 80.409, { isExitPoint: true }),
];

const nodeById = Object.fromEntries(seedNodes.map((n) => [n.id, n]));
const line = (a: string, b: string): NetworkNode["lat"] extends number ? [{ lat: number; lng: number }, { lat: number; lng: number }] : never =>
  [
    { lat: nodeById[a].lat, lng: nodeById[a].lng },
    { lat: nodeById[b].lat, lng: nodeById[b].lng },
  ] as any;

const S = (
  id: string,
  from: string,
  to: string,
  name_si: string,
  name_en: string,
  notes = ""
): NetworkSegment => {
  const polyline = line(from, to) as { lat: number; lng: number }[];
  return {
    id,
    fromNodeId: from,
    toNodeId: to,
    name_si,
    name_en,
    polyline,
    lengthMeters: Math.round(polylineLengthMeters(polyline)),
    status: "open",
    notes,
  };
};

export const seedSegments: NetworkSegment[] = [
  S("s1", "pothanegama", "sacredcityjn", "පොතානේගම මාවත", "Pothanegama Rd"),
  S("s2", "sacredcityjn", "mirisaveti", "පූජා නගර මාවත", "Sacred City Rd"),
  S("s3", "mirisaveti", "srimahabodhi", "මිරිසවැටිය මාවත", "Mirisaveti Rd"),
  S("s4", "srimahabodhi", "lovamahapaya", "බෝධිය මාවත", "Bodhi Mawatha"),
  S("s5", "lovamahapaya", "ruwanwelisaya", "ලෝවාමහාපාය මාවත", "Lovamahapaya Rd"),
  S("s6", "ruwanwelisaya", "thuparamaya", "සඳහිරු මාවත", "Sandahiru Mawatha"),
  S("s7", "thuparamaya", "lankarama", "ථූපාරාම මාවත", "Thuparama Rd"),
  S("s8", "lankarama", "abhayagiri", "අභයගිරි මාවත", "Abhayagiri Rd"),
  S("s9", "abhayagiri", "yapanaya", "යාපනය මාවත", "Yapanaya Rd"),
  S("s10", "yapanaya", "jetavanaramaya", "ජේතවන මාවත", "Jetavana Rd"),
  S("s11", "jetavanaramaya", "sacredcityjn", "නැගෙනහිර මාවත", "East Rd"),
  S("s12", "sacredcityjn", "busstandjn", "බස් නැවතුම් මාවත", "Bus Stand Rd"),
  S("s13", "thuparamaya", "jetavanaramaya", "සම්බන්ධක මාර්ගය", "Connector Rd"),
];

export const seedDansal: Dansal[] = [
  { id: "d1", name_si: "බෝධි දන්සැල", name_en: "Bodhi Dansala", lat: 8.347, lng: 80.3958, type: "food", nearestSegmentId: "s4", active: true, openHours: "06:00–22:00" },
  { id: "d2", name_si: "රුවන්වැලි පැන් දන්සැල", name_en: "Ruwanweli Drinks", lat: 8.3496, lng: 80.397, type: "drink", nearestSegmentId: "s6", active: true, openHours: "06:00–24:00" },
  { id: "d3", name_si: "ථූපාරාම ජල දන්සැල", name_en: "Thuparama Water", lat: 8.354, lng: 80.3955, type: "water", nearestSegmentId: "s7", active: true, openHours: "24h" },
  { id: "d4", name_si: "අභයගිරි වෛද්‍ය මධ්‍යස්ථානය", name_en: "Abhayagiri Medical", lat: 8.364, lng: 80.3962, type: "medical", nearestSegmentId: "s8", active: true, openHours: "24h" },
  { id: "d5", name_si: "ජේතවන ආහාර දන්සැල", name_en: "Jetavana Food", lat: 8.3505, lng: 80.4025, type: "food", nearestSegmentId: "s11", active: false, openHours: "06:00–20:00" },
];

export const seedParking: Parking[] = [
  { id: "p1", name_si: "පොතානේගම වාහන නැවැත්ම", name_en: "Pothanegama Parking", lat: 8.3215, lng: 80.4055, capacity: 400, status: "available", nearestSegmentId: "s1", vehicleTypes: ["car", "bus", "threewheeler", "motorbike"] },
  { id: "p2", name_si: "පූජා නගර වාහන නැවැත්ම", name_en: "Sacred City Parking", lat: 8.3424, lng: 80.4005, capacity: 250, status: "filling", nearestSegmentId: "s2", vehicleTypes: ["car", "threewheeler", "motorbike"] },
  { id: "p3", name_si: "යාපනය බස් නැවැත්ම", name_en: "Yapanaya Bus Park", lat: 8.3702, lng: 80.4045, capacity: 120, status: "full", nearestSegmentId: "s9", vehicleTypes: ["bus"] },
  { id: "p4", name_si: "බස් නැවතුම වාහන නැවැත්ම", name_en: "Bus Stand Parking", lat: 8.3362, lng: 80.4092, capacity: 300, status: "available", nearestSegmentId: "s12", vehicleTypes: ["car", "threewheeler", "motorbike", "bus"] },
];

export const seedConfig: AppConfig = {
  eventName_si: "පොසොන් උත්සවය 2026 — අනුරාධපුර",
  eventName_en: "Poson Festival 2026 — Anuradhapura",
  lastUpdated: Date.now(),
  mapCenter: { lat: 8.3494, lng: 80.3975 },
  defaultZoom: 14,
  version: 1,
};

export function seedNetwork() {
  return {
    nodes: seedNodes,
    segments: seedSegments,
    dansal: seedDansal,
    parking: seedParking,
    config: seedConfig,
  };
}
