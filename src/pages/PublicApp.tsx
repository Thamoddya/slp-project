import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MapPin, Navigation, Search, X } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import GoogleMapView from "@/components/map/GoogleMapView";
import { useNetwork } from "@/hooks/useNetwork";
import { useGeolocation } from "@/hooks/useGeolocation";
import { planRoute } from "@/routing/router";
import { haversineMeters } from "@/routing/geo";
import repo from "@/data/repo";
import { localizedName, timeAgo } from "@/components/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RouteResult from "./RouteResult";
import ReportModal from "@/components/ReportModal";
import type { NetworkNode, RouteResult as RouteResultType, GeoPosition } from "@/types";

export default function PublicApp() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const net = useNetwork();
  const geo = useGeolocation();

  const [destNode, setDestNode] = useState<NetworkNode | null>(null);
  const [query, setQuery] = useState("");
  const [route, setRoute] = useState<RouteResultType | null>(null);
  const [phase, setPhase] = useState<"home" | "route">("home");
  const [showDansal, setShowDansal] = useState(true);
  const [showParking, setShowParking] = useState(true);
  const [vehicle, setVehicle] = useState<string>("all");
  const [online, setOnline] = useState(navigator.onLine);
  const [reportOpen, setReportOpen] = useState(false);
  const [rerouted, setRerouted] = useState(false);
  const lastPlanPos = useRef<GeoPosition | null>(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const center = net.config?.mapCenter || { lat: 8.3494, lng: 80.3975 };
  const userPos = geo.position;

  const compute = (start: GeoPosition, dest: NetworkNode) => {
    const r = planRoute(net.nodes, net.segments, start, dest.id, {
      speedKmh: net.config?.avgSpeedKmh,
    });
    setRoute(r);
    lastPlanPos.current = start;
  };

  const onGo = () => {
    if (!userPos || !destNode) return;
    setRerouted(false);
    compute(userPos, destNode);
    setPhase("route");
  };

  useEffect(() => {
    if (phase !== "route" || !destNode || !userPos) return;
    const moved = lastPlanPos.current && haversineMeters(lastPlanPos.current, userPos) > 60;
    const onPathClosed =
      route?.ok &&
      route.segments.some((s) => {
        const live = net.segments.find((x) => x.id === s.id);
        return live && live.status === "closed";
      });
    if (moved || onPathClosed) {
      if (onPathClosed) setRerouted(true);
      compute(userPos, destNode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPos, net.segments, phase]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return net.nodes
      .filter(
        (n) =>
          (n.name_si || "").toLowerCase().includes(q) ||
          (n.name_en || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, net.nodes]);

  const pickDest = (n: NetworkNode) => { setDestNode(n); setQuery(""); };
  const onMapTap = (pt: { lat: number; lng: number }) => {
    let best: { n: NetworkNode; d: number } | null = null;
    for (const n of net.nodes) {
      const d = haversineMeters(pt, n);
      if (!best || d < best.d) best = { n, d };
    }
    if (best) setDestNode(best.n);
  };

  const fitBounds: [number, number][] | null =
    phase === "route" && route?.ok && route.polyline?.length
      ? route.polyline.map((p) => [p.lat, p.lng])
      : null;

  if (!net.ready) {
    return (
      <div className="app-shell">
        <TopBar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-cream-300 border-t-navy-700" />
          <p className="text-sm font-medium">{t("app.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        right={
          <Link
            to="/admin"
            className="shrink-0 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-white/25 transition-colors no-underline"
          >
            {t("nav.admin")}
          </Link>
        }
      />

      {/* Offline banner */}
      {!online && (
        <div className="shrink-0 bg-saffron-50 border-b border-saffron-200 px-4 py-2 text-center">
          <p className="text-xs font-medium text-saffron-800">
            {t("app.offlineBanner", { time: timeAgo(net.config?.lastUpdated, lang) })}
          </p>
        </div>
      )}

      {/* Map + sheet area */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Map — full canvas */}
        <div className="absolute inset-0">
          <GoogleMapView
            center={center}
            zoom={net.config?.defaultZoom || 14}
            segments={net.segments}
            route={phase === "route" ? route : null}
            nodes={net.nodes}
            dansal={net.dansal}
            parking={net.parking.filter(
              (p) => vehicle === "all" || (p.vehicleTypes || []).includes(vehicle as never)
            )}
            showDansal={showDansal}
            showParking={showParking}
            userPos={userPos}
            destNode={destNode}
            onMapTap={onMapTap}
            onPickNode={pickDest}
            fitBounds={fitBounds}
          />
        </div>

        {/* FAB — locate */}
        {!userPos && phase === "home" && (
          <button
            onClick={geo.start}
            className="absolute bottom-[calc(52%+16px)] right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-poson-lg text-navy-700 hover:bg-cream-50 transition-colors"
          >
            <Navigation className="h-5 w-5" />
          </button>
        )}

        {/* Bottom sheet */}
        {phase === "home" ? (
          <HomeSheet
            t={t}
            lang={lang}
            geo={geo}
            query={query}
            setQuery={setQuery}
            results={results}
            destNode={destNode}
            pickDest={pickDest}
            onGo={onGo}
          />
        ) : (
          <RouteResult
            route={route}
            net={net}
            lang={lang}
            rerouted={rerouted}
            showDansal={showDansal}
            showParking={showParking}
            vehicle={vehicle}
            setShowDansal={setShowDansal}
            setShowParking={setShowParking}
            setVehicle={setVehicle}
            onNew={() => { setPhase("home"); setRoute(null); setRerouted(false); }}
            onReport={() => setReportOpen(true)}
          />
        )}
      </div>

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

// ─── Home Sheet ──────────────────────────────────────────────────────────────

interface HomeSheetProps {
  t: ReturnType<typeof useTranslation>["t"];
  lang: string;
  geo: ReturnType<typeof useGeolocation>;
  query: string;
  setQuery: (q: string) => void;
  results: NetworkNode[];
  destNode: NetworkNode | null;
  pickDest: (n: NetworkNode) => void;
  onGo: () => void;
}

function HomeSheet({ t, lang, geo, query, setQuery, results, destNode, pickDest, onGo }: HomeSheetProps) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl bg-white shadow-sheet overflow-y-auto sheet-scroll"
      style={{
        maxHeight: "58%",
        paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Grip */}
      <div className="sticky top-0 bg-white pt-3 pb-1 px-4 z-10">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-cream-300" />
      </div>
      <div className="px-4 pb-2">
        {/* Location button */}
        <Button
          variant={geo.watching && !geo.position ? "secondary" : "default"}
          size="lg"
          className="w-full mb-3"
          onClick={geo.start}
        >
          <Navigation className="h-5 w-5" />
          {geo.watching && !geo.position ? t("home.locating") : t("home.useLocation")}
        </Button>

        {geo.error === "denied" && (
          <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {lang === "si"
              ? "ස්ථාන අවසරය ලබා දෙන්න හෝ සිතියමෙන් ආරම්භය තෝරන්න."
              : "Allow location access, or tap the map to set your start."}
          </div>
        )}

        {/* Destination search */}
        <div className="mb-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("home.pickDestination")}
          </p>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <div className="mb-2 overflow-hidden rounded-xl border border-cream-200 bg-white shadow-poson">
            {results.map((n, i) => (
              <button
                key={n.id}
                onClick={() => pickDest(n)}
                className={`flex w-full flex-col items-start px-4 py-3 text-left hover:bg-cream-50 transition-colors ${
                  i < results.length - 1 ? "border-b border-cream-100" : ""
                }`}
              >
                <span className="font-semibold text-navy-900 text-sm">{n.name_si}</span>
                <span className="text-xs text-muted-foreground">{n.name_en}</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected destination */}
        {destNode ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-navy-50 border border-navy-200 px-4 py-3">
            <MapPin className="h-4 w-4 text-navy-700 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-xs text-muted-foreground">{t("home.to")}: </span>
              <span className="font-semibold text-navy-900 text-sm">
                {localizedName(destNode, lang)}
              </span>
            </div>
            <button onClick={() => pickDest(destNode)} className="text-muted-foreground hover:text-navy-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="mb-3 rounded-xl bg-cream-50 border border-cream-200 px-4 py-3 text-sm text-muted-foreground">
            {t("home.tapMapHint")}
          </div>
        )}

        {/* GO button */}
        <Button
          size="xl"
          variant="saffron"
          className="w-full text-lg font-black tracking-wide"
          disabled={!geo.position || !destNode}
          onClick={onGo}
        >
          {t("home.go")} →
        </Button>

        {/* Disclaimer */}
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground border-t border-cream-200 pt-3">
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
