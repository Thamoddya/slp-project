import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Navigation, Search, X, LocateFixed, Plus, ParkingSquare, Calendar } from "lucide-react";
import { dansalIcon, dansalTint, dansalColor } from "@/lib/dansal";
import TopBar from "@/components/layout/TopBar";
import BottomNav, { type PublicTab } from "@/components/layout/BottomNav";
import BottomSheet from "@/components/ui/BottomSheet";
import GoogleMapView from "@/components/map/GoogleMapView";
import Preloader from "@/components/Preloader";
import MoreModal from "@/components/MoreModal";
import { useNetwork } from "@/hooks/useNetwork";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { planRoute } from "@/routing/router";
import { haversineMeters } from "@/routing/geo";
import repo from "@/data/repo";
import { localizedName, timeAgo, formatDate } from "@/components/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import RouteResult from "./RouteResult";
import ReportModal from "@/components/ReportModal";
import type { NetworkNode, Dansal, Parking, RouteResult as RouteResultType, GeoPosition, LatLng } from "@/types";

type Focus = { lat: number; lng: number; zoom?: number; nonce: number };

export default function PublicApp() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const net = useNetwork();
  const geo = useGeolocation();

  const [tab, setTab] = useState<PublicTab>("map");
  const [sheetIndex, setSheetIndex] = useState(1);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const [destNode, setDestNode] = useState<NetworkNode | null>(null);
  const [query, setQuery] = useState("");
  const [route, setRoute] = useState<RouteResultType | null>(null);
  const [showDansal, setShowDansal] = useState(true);
  const [showParking, setShowParking] = useState(true);
  const [vehicle, setVehicle] = useState<string>("all");
  const [online, setOnline] = useState(navigator.onLine);
  const [rerouted, setRerouted] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const lastPlanPos = useRef<GeoPosition | null>(null);
  const didCenter = useRef(false);

  // Keep the preloader up until the network is ready AND a short minimum elapses.
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), 4000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Ask for the user's live location automatically on first load, so the map
  // centres on them without a tap. (The browser still shows its permission
  // prompt; if denied, the manual "Use my location" button remains.)
  useEffect(() => {
    geo.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Centre the map on the user once, the first time a fix arrives.
  useEffect(() => {
    const p = geo.position;
    if (p && !didCenter.current) {
      didCenter.current = true;
      setFocus({ lat: p.lat, lng: p.lng, zoom: 15, nonce: Date.now() });
    }
  }, [geo.position]);

  const center = net.config?.mapCenter || { lat: 8.3494, lng: 80.3975 };
  const userPos = geo.position;
  const address = useReverseGeocode(userPos);

  const compute = (start: GeoPosition, dest: NetworkNode) => {
    const r = planRoute(net.nodes, net.segments, start, dest.id, { speedKmh: net.config?.avgSpeedKmh });
    setRoute(r);
    lastPlanPos.current = start;
  };

  const onGo = () => {
    if (!userPos || !destNode) return;
    setRerouted(false);
    compute(userPos, destNode);
    setTab("map");
    setSheetIndex(1);
  };

  // Auto-reroute when the user moves far or a road on the path closes.
  useEffect(() => {
    if (!route || !destNode || !userPos) return;
    const moved = lastPlanPos.current && haversineMeters(lastPlanPos.current, userPos) > 60;
    const onPathClosed =
      route.ok &&
      route.segments.some((s) => {
        const live = net.segments.find((x) => x.id === s.id);
        return live && live.status === "closed";
      });
    if (moved || onPathClosed) {
      if (onPathClosed) setRerouted(true);
      compute(userPos, destNode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPos, net.segments]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return net.nodes
      .filter((n) => (n.name_si || "").toLowerCase().includes(q) || (n.name_en || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, net.nodes]);

  const pickDest = (n: NetworkNode | null) => {
    setDestNode(n);
    setQuery("");
    if (n) setFocus({ lat: n.lat, lng: n.lng, zoom: 15, nonce: Date.now() });
  };

  const onMapTap = (pt: LatLng) => {
    let best: { n: NetworkNode; d: number } | null = null;
    for (const n of net.nodes) {
      const d = haversineMeters(pt, n);
      if (!best || d < best.d) best = { n, d };
    }
    if (best) setDestNode(best.n);
  };

  const focusOn = (item: LatLng) => {
    setFocus({ lat: item.lat, lng: item.lng, zoom: 16, nonce: Date.now() });
    setTab("map");
    setSheetIndex(0);
  };

  const recenter = () => {
    if (userPos) setFocus({ lat: userPos.lat, lng: userPos.lng, zoom: 15, nonce: Date.now() });
    else geo.start();
  };

  const onSelectTab = (next: PublicTab) => {
    if (next === "more") { setMoreOpen(true); return; }
    setTab(next);
    setSheetIndex(next === "map" ? 1 : 1);
  };

  const newRoute = () => { setRoute(null); setRerouted(false); setDestNode(null); };

  // Hand the found route off to the phone's map app (Apple Maps on iOS, else
  // Google Maps), passing the route's waypoints so it follows our corridor as
  // closely as the external app allows. Starts from the user's live location
  // when available, otherwise from the route's entry point.
  const openInMaps = () => {
    if (!route?.ok || !route.polyline?.length) return;
    const sampled = samplePoints(route.polyline, 9);
    const pts = userPos ? [{ lat: userPos.lat, lng: userPos.lng }, ...sampled] : sampled;
    const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
    // Always open Google Maps (works on every platform; opens the Google Maps
    // app when installed, otherwise the browser), following the route waypoints.
    const url = `https://www.google.com/maps/dir/${pts.map(fmt).join("/")}/?travelmode=driving`;
    window.open(url, "_blank", "noopener");
  };

  const fitBounds: [number, number][] | null =
    tab === "map" && route?.ok && route.polyline?.length
      ? route.polyline.map((p) => [p.lat, p.lng])
      : null;

  if (!net.ready || !minElapsed) return <Preloader />;

  // ─── Sheet header + body per tab ─────────────────────────────────────────
  let sheetTitle: React.ReactNode = t("home.pickDestination");
  let sheetRight: React.ReactNode = null;
  let sheetBody: React.ReactNode = null;

  if (tab === "map") {
    if (route) {
      sheetTitle = t("nav.map");
      sheetRight = (
        <Button size="sm" variant="outline" onClick={newRoute}>
          <Plus className="mr-1 h-3.5 w-3.5" /> {t("route.newRoute")}
        </Button>
      );
      sheetBody = (
        <RouteResult
          route={route} net={net} lang={lang} rerouted={rerouted}
          showDansal={showDansal} showParking={showParking} vehicle={vehicle}
          setShowDansal={setShowDansal} setShowParking={setShowParking} setVehicle={setVehicle}
          onNew={newRoute} onReport={() => setReportOpen(true)} onOpenMaps={openInMaps}
        />
      );
    } else {
      sheetBody = (
        <Planner
          t={t} lang={lang} geo={geo} address={address}
          query={query} setQuery={setQuery} results={results}
          destNode={destNode} pickDest={pickDest} onGo={onGo}
        />
      );
    }
  } else if (tab === "places") {
    sheetTitle = t("places.title");
    sheetRight = <span className="text-xs font-semibold text-muted-foreground">{t("places.count", { n: net.dansal.length })}</span>;
    sheetBody = <PlacesList t={t} lang={lang} dansal={net.dansal} onFocus={focusOn} />;
  } else if (tab === "parking") {
    sheetTitle = t("parkingTab.title");
    sheetRight = <span className="text-xs font-semibold text-muted-foreground">{t("parkingTab.count", { n: net.parking.length })}</span>;
    sheetBody = <ParkingList t={t} lang={lang} parking={net.parking} vehicle={vehicle} setVehicle={setVehicle} onFocus={focusOn} />;
  }

  return (
    <div className="app-shell">
      <TopBar
        right={
          <button
            onClick={() => setMoreOpen(true)}
            className="shrink-0 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/25"
          >
            {t("nav.more")}
          </button>
        }
      />

      {!online && (
        <div className="shrink-0 border-b border-saffron-200 bg-saffron-50 px-4 py-2 text-center">
          <p className="text-xs font-medium text-saffron-800">
            {t("app.offlineBanner", { time: timeAgo(net.config?.lastUpdated, lang) })}
          </p>
        </div>
      )}

      {/* Map + draggable sheet */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <GoogleMapView
            center={center}
            zoom={net.config?.defaultZoom || 14}
            segments={net.segments}
            route={tab === "map" ? route : null}
            nodes={net.nodes}
            dansal={net.dansal}
            parking={net.parking.filter((p) => vehicle === "all" || (p.vehicleTypes || []).includes(vehicle as never))}
            showDansal={showDansal}
            showParking={showParking}
            userPos={userPos}
            destNode={destNode}
            onMapTap={onMapTap}
            onPickNode={pickDest}
            fitBounds={fitBounds}
            focus={focus}
          />
        </div>

        {/* Recenter / locate */}
        <button
          onClick={recenter}
          aria-label={t("map.yourLocation")}
          className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy-700 shadow-poson-lg transition-colors hover:bg-cream-50"
        >
          {userPos ? <LocateFixed className="h-5 w-5" /> : <Navigation className="h-5 w-5" />}
        </button>

        <BottomSheet index={sheetIndex} onIndexChange={setSheetIndex} title={sheetTitle} headerRight={sheetRight}>
          {sheetBody}
        </BottomSheet>
      </div>

      <BottomNav active={tab} onSelect={onSelectTab} />

      {moreOpen && <MoreModal onClose={() => setMoreOpen(false)} onReport={() => setReportOpen(true)} />}
      {reportOpen && (
        <ReportModal
          onClose={() => setReportOpen(false)}
          onSubmit={async (text) => {
            await repo.report({ text, lat: userPos?.lat, lng: userPos?.lng, destId: destNode?.id });
          }}
        />
      )}
    </div>
  );
}

// ─── Map tab: route planner ───────────────────────────────────────────────────

interface PlannerProps {
  t: ReturnType<typeof useTranslation>["t"];
  lang: string;
  geo: ReturnType<typeof useGeolocation>;
  address: string | null;
  query: string;
  setQuery: (q: string) => void;
  results: NetworkNode[];
  destNode: NetworkNode | null;
  pickDest: (n: NetworkNode | null) => void;
  onGo: () => void;
}

function Planner({ t, lang, geo, address, query, setQuery, results, destNode, pickDest, onGo }: PlannerProps) {
  return (
    <div className="pb-1">
      {/* Your location */}
      <button
        onClick={geo.start}
        className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50 px-4 py-3 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-700 text-white">
          <Navigation className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("map.yourLocation")}
          </p>
          <p className="truncate text-sm font-semibold text-navy-900">
            {geo.position
              ? (address || t("home.myLocation"))
              : geo.watching ? t("map.locating") : t("map.noLocation")}
          </p>
        </div>
      </button>

      {geo.error === "denied" && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("home.tapMapHint")}
        </div>
      )}

      {/* Destination search */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("home.pickDestination")}
      </p>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder={t("home.searchPlaceholder")}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-cream-200 bg-white shadow-poson">
          {results.map((n, i) => (
            <button
              key={n.id}
              onClick={() => pickDest(n)}
              className={`flex w-full flex-col items-start px-4 py-3 text-left transition-colors hover:bg-cream-50 ${
                i < results.length - 1 ? "border-b border-cream-100" : ""
              }`}
            >
              <span className="text-sm font-semibold text-navy-900">{localizedName(n, lang)}</span>
              <span className="text-xs text-muted-foreground">{lang === "si" ? n.name_en : n.name_si}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected destination */}
      {destNode ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-navy-200 bg-navy-50 px-4 py-3">
          <MapPin className="h-4 w-4 shrink-0 text-navy-700" />
          <div className="min-w-0 flex-1">
            <span className="text-xs text-muted-foreground">{t("map.destination")}: </span>
            <span className="text-sm font-semibold text-navy-900">{localizedName(destNode, lang)}</span>
          </div>
          <button onClick={() => pickDest(null)} className="text-muted-foreground hover:text-navy-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-sm text-muted-foreground">
          {t("home.tapMapHint")}
        </div>
      )}

      {/* GO */}
      <Button
        size="xl"
        variant="saffron"
        className="mt-3 w-full text-lg font-black tracking-wide"
        disabled={!geo.position || !destNode}
        onClick={onGo}
      >
        {t("home.go")} →
      </Button>
    </div>
  );
}

// ─── Places tab ───────────────────────────────────────────────────────────────

function PlacesList({
  t, lang, dansal, onFocus,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  lang: string;
  dansal: Dansal[];
  onFocus: (p: LatLng) => void;
}) {
  const [type, setType] = useState<string>("all");
  const TYPES = ["all", "food", "drink", "water", "medical", "other"] as const;
  const list = dansal.filter((d) => type === "all" || d.type === type);

  return (
    <div className="pb-1">
      <p className="mb-3 text-xs text-muted-foreground">{t("places.subtitle")}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {TYPES.map((ty) => {
          const Icon = ty === "all" ? null : dansalIcon(ty);
          return (
            <Chip key={ty} active={type === ty} onClick={() => setType(ty)}>
              <span className="flex items-center gap-1.5">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {ty === "all" ? t("filters.all") : t(`dansal.type.${ty}`)}
              </span>
            </Chip>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyBox>{t("places.none")}</EmptyBox>
      ) : (
        <div className="space-y-2.5">
          {list.map((d) => {
            const Icon = dansalIcon(d.type);
            return (
            <button
              key={d.id}
              onClick={() => onFocus(d)}
              className={`flex w-full items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3 text-left transition-all hover:border-navy-200 hover:shadow-poson active:scale-[0.99] ${!d.active ? "opacity-50" : ""}`}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: dansalTint(d.type), color: dansalColor(d.type) }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy-900">{localizedName(d, lang)}</p>
                <p className="text-xs text-muted-foreground">
                  {t(`dansal.type.${d.type}`)} · {t("dansal.open", { hours: d.openHours || "—" })}
                </p>
                {d.date && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-navy-700">
                    <Calendar className="h-3 w-3 shrink-0" /> {formatDate(d.date, lang)}
                  </p>
                )}
              </div>
              {!d.active && <Badge variant="inactive">{t("dansal.inactive")}</Badge>}
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Parking tab ──────────────────────────────────────────────────────────────

function ParkingList({
  t, lang, parking, vehicle, setVehicle, onFocus,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  lang: string;
  parking: Parking[];
  vehicle: string;
  setVehicle: (v: string) => void;
  onFocus: (p: LatLng) => void;
}) {
  const list = parking.filter((p) => vehicle === "all" || (p.vehicleTypes || []).includes(vehicle as never));

  return (
    <div className="pb-1">
      <p className="mb-3 text-xs text-muted-foreground">{t("parkingTab.subtitle")}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {["all", "car", "bus", "threewheeler", "motorbike"].map((v) => (
          <Chip key={v} active={vehicle === v} onClick={() => setVehicle(v)}>
            {v === "all" ? t("filters.all") : t(`vehicle.${v}`)}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyBox>{t("parkingTab.none")}</EmptyBox>
      ) : (
        <div className="space-y-2.5">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => onFocus(p)}
              className="flex w-full items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3 text-left transition-all hover:border-navy-200 hover:shadow-poson active:scale-[0.99]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                <ParkingSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy-900">{localizedName(p, lang)}</p>
                <p className="text-xs text-muted-foreground">
                  {t("parking.capacity", { n: p.capacity })} ·{" "}
                  {(p.vehicleTypes || []).map((v) => t(`vehicle.${v}`)).join(", ")}
                </p>
              </div>
              <Badge variant={p.status as "available" | "filling" | "full"}>
                {t(`parking.status.${p.status}`)}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Small shared bits ────────────────────────────────────────────────────────

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-semibold transition-all ${
        active ? "border-navy-700 bg-navy-700 text-white" : "border-cream-200 bg-white text-muted-foreground hover:border-navy-200"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

// Evenly pick at most `max` points from a polyline, keeping order + first/last.
function samplePoints(pts: LatLng[], max: number): LatLng[] {
  if (pts.length <= max) return pts.map((p) => ({ lat: p.lat, lng: p.lng }));
  if (max <= 1) return [{ lat: pts[0].lat, lng: pts[0].lng }];
  const step = (pts.length - 1) / (max - 1);
  const out: LatLng[] = [];
  for (let i = 0; i < max; i++) {
    const p = pts[Math.round(i * step)];
    out.push({ lat: p.lat, lng: p.lng });
  }
  return out;
}
