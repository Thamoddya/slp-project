// ─── Core geographic primitives ────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

// ─── Network data model ─────────────────────────────────────────────────────

export interface NetworkNode {
  id: string;
  name_si: string;
  name_en: string;
  lat: number;
  lng: number;
  isEntryPoint: boolean;
  isExitPoint: boolean;
}

export type SegmentStatus = "open" | "closed";

export interface NetworkSegment {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  name_si: string;
  name_en: string;
  polyline: LatLng[];
  lengthMeters: number;
  status: SegmentStatus;
  notes?: string;
  _changedAt?: number;
}

export type DansalType = "food" | "drink" | "water" | "medical" | "other";

export interface Dansal {
  id: string;
  name_si: string;
  name_en: string;
  lat: number;
  lng: number;
  type: DansalType;
  active: boolean;
  openHours: string;
  /** Date the Dansal operates, ISO "YYYY-MM-DD" (optional). */
  date?: string;
  nearestSegmentId: string;
}

export type ParkingStatus = "available" | "filling" | "full";
export type VehicleType = "car" | "bus" | "threewheeler" | "motorbike";

export interface Parking {
  id: string;
  name_si: string;
  name_en: string;
  lat: number;
  lng: number;
  capacity: number;
  status: ParkingStatus;
  vehicleTypes: VehicleType[];
  nearestSegmentId: string;
}

/** A public-submitted Dansal request, reviewed by admins. Image is proof only. */
export interface DansalRequest {
  id: string;
  kind: "dansal_request";
  name_en?: string;
  name_si?: string;
  openHours?: string;
  date?: string;
  /** Base64 data URL — proof banner, shown to admins only, never to the public. */
  image?: string;
  lat?: number;
  lng?: number;
  contact?: string;
  status?: "pending" | "approved" | "rejected";
  /** Set once approved → the Dansal created from this request (prevents dupes). */
  dansalId?: string;
  createdAt?: number | { seconds: number };
}

export interface AppConfig {
  eventName_si: string;
  eventName_en: string;
  lastUpdated: number | { seconds: number };
  mapCenter: LatLng;
  defaultZoom: number;
  avgSpeedKmh?: number;
  version?: number;
}

// ─── Routing types ──────────────────────────────────────────────────────────

export interface RouteSuccess {
  ok: true;
  startNodeId: string;
  destNodeId: string;
  connectorMeters: number;
  distanceMeters: number;
  etaMinutes: number;
  nodePath: string[];
  segments: NetworkSegment[];
  polyline: LatLng[];
  snappedPoint: LatLng | null;
  /** True when the start was outside the zone and we routed from an entry point. */
  viaEntry?: boolean;
}

export interface RouteFailure {
  ok: false;
  reason: "dest-missing" | "far-from-network" | "no-route";
  entryNodeId?: string | null;
  snappedPoint?: LatLng | null;
}

export type RouteResult = RouteSuccess | RouteFailure;

// ─── Network state (from useNetwork hook) ───────────────────────────────────

export interface NetworkState {
  nodes: NetworkNode[];
  segments: NetworkSegment[];
  dansal: Dansal[];
  parking: Parking[];
  config: AppConfig | null;
  ready: boolean;
  isLive: boolean;
}

// ─── Graph types ─────────────────────────────────────────────────────────────

export interface GraphEdge {
  to: string;
  weight: number;
  segment: NetworkSegment;
}

export interface DirectedGraph {
  nodes: Map<string, NetworkNode>;
  adjacency: Map<string, GraphEdge[]>;
  segmentsById: Map<string, NetworkSegment>;
}

// ─── Validation types ────────────────────────────────────────────────────────

export type ValidationLevel = "error" | "warn";
export type ValidationCode = "unreachable" | "deadEnd" | "deadStart" | "orphan" | "duplicate";

export interface ValidationIssue {
  level: ValidationLevel;
  code: ValidationCode;
  nodeId?: string;
  name?: NetworkNode;
  from?: NetworkNode;
  to?: NetworkNode;
}

// ─── Admin auth ──────────────────────────────────────────────────────────────

export interface AdminUser {
  uid: string;
  email: string | null;
  role?: string;
}

// ─── Repo interface ───────────────────────────────────────────────────────────

export type Collection = "nodes" | "segments" | "dansal" | "parking";

export interface Repo {
  isLive: boolean;
  subscribe(collection: Collection, cb: (data: unknown[]) => void): () => void;
  subscribeDoc(id: string, cb: (doc: AppConfig | null) => void): () => void;
  set(collection: Collection, id: string, data: Record<string, unknown>): Promise<void>;
  update(collection: Collection, id: string, partial: Record<string, unknown>): Promise<void>;
  remove(collection: Collection, id: string): Promise<void>;
  add(collection: Collection, data: Record<string, unknown>): Promise<string>;
  report(data: Record<string, unknown>): Promise<string>;
  subscribeReports(cb: (data: unknown[]) => void): () => void;
  updateReport(id: string, partial: Record<string, unknown>): Promise<void>;
  removeReport(id: string): Promise<void>;
  recordVisit(): Promise<void>;
  subscribeStats(cb: (stats: { visits?: number }) => void): () => void;
  replaceAll(network: {
    nodes: NetworkNode[];
    segments: NetworkSegment[];
    dansal: Dansal[];
    parking: Parking[];
    config?: AppConfig;
  }): Promise<void>;
  exportAll(): Promise<{
    nodes: NetworkNode[];
    segments: NetworkSegment[];
    dansal: Dansal[];
    parking: Parking[];
    config?: AppConfig;
  }> | {
    nodes: NetworkNode[];
    segments: NetworkSegment[];
    dansal: Dansal[];
    parking: Parking[];
    config?: AppConfig;
  };
}

// ─── Geolocation ────────────────────────────────────────────────────────────

export type GeoError = "unsupported" | "denied" | "unavailable";

export interface GeoPosition extends LatLng {
  accuracy: number;
}

export interface GeolocationState {
  position: GeoPosition | null;
  error: GeoError | null;
  watching: boolean;
  start: () => void;
  stop: () => void;
  setManual: (pos: GeoPosition | null) => void;
}
