import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import MapView from "../components/MapView.jsx";
import { useNetwork } from "../hooks/useNetwork.js";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { planRoute } from "../routing/router.js";
import { haversineMeters } from "../routing/geo.js";
import repo from "../data/repo.js";
import { localizedName, timeAgo } from "../components/format.js";
import RouteResult from "./RouteResult.jsx";
import ReportModal from "../components/ReportModal.jsx";

export default function PublicApp() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const net = useNetwork();
  const geo = useGeolocation();

  const [destNode, setDestNode] = useState(null);
  const [query, setQuery] = useState("");
  const [route, setRoute] = useState(null);
  const [phase, setPhase] = useState("home"); // home | route
  const [showDansal, setShowDansal] = useState(true);
  const [showParking, setShowParking] = useState(true);
  const [vehicle, setVehicle] = useState("all");
  const [online, setOnline] = useState(navigator.onLine);
  const [reportOpen, setReportOpen] = useState(false);
  const [rerouted, setRerouted] = useState(false);
  const lastPlanPos = useRef(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const center = net.config?.mapCenter || { lat: 8.3494, lng: 80.3975 };
  const userPos = geo.position;

  const compute = (start, dest) => {
    if (!start || !dest) return;
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

  // Auto re-route: when in route phase, recompute if the user moved >60m or the
  // network changed (e.g. a segment on the path was closed by police).
  useEffect(() => {
    if (phase !== "route" || !destNode || !userPos) return;
    const moved =
      lastPlanPos.current && haversineMeters(lastPlanPos.current, userPos) > 60;
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

  // Destination search over node names (Sinhala + English).
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

  const pickDest = (n) => {
    setDestNode(n);
    setQuery("");
  };

  const onMapTap = (pt) => {
    // Snap a tap to the nearest node as the destination.
    let best = null;
    for (const n of net.nodes) {
      const d = haversineMeters(pt, n);
      if (!best || d < best.d) best = { n, d };
    }
    if (best) setDestNode(best.n);
  };

  if (!net.ready) {
    return (
      <div className="app-shell">
        <TopBar />
        <div className="center-msg">
          <div className="spinner" />
          <div>{t("app.loading")}</div>
        </div>
      </div>
    );
  }

  const fitBounds =
    phase === "route" && route?.ok && route.polyline?.length
      ? route.polyline.map((p) => [p.lat, p.lng])
      : null;

  return (
    <div className="app-shell">
      <TopBar
        right={
          <Link to="/admin" className="lang-btn" style={{ textDecoration: "none" }}>
            {t("nav.admin")}
          </Link>
        }
      />
      {!online && (
        <div className="banner">
          {t("app.offlineBanner", { time: timeAgo(net.config?.lastUpdated, lang) })}
        </div>
      )}

      <div className="content">
        <div className="map-wrap">
          <MapView
            center={center}
            zoom={net.config?.defaultZoom || 14}
            segments={net.segments}
            route={phase === "route" ? route : null}
            nodes={net.nodes}
            dansal={net.dansal}
            parking={net.parking.filter(
              (p) => vehicle === "all" || (p.vehicleTypes || []).includes(vehicle)
            )}
            showDansal={showDansal}
            showParking={showParking}
            userPos={userPos}
            destNode={destNode}
            onMapTap={onMapTap}
            onPickNode={pickDest}
            fitBounds={fitBounds}
          />
          {userPos && (
            <button className="fab fab-locate" onClick={geo.start} title={t("home.myLocation")}>
              📍
            </button>
          )}
        </div>

        {phase === "home" ? (
          <div className="sheet">
            <div className="grip" />
            <div className="locate-row">
              <button className="btn btn-primary" onClick={geo.start}>
                {geo.watching && !userPos ? t("home.locating") : t("home.useLocation")}
              </button>
            </div>
            {geo.error === "denied" && (
              <div className="alert warn">
                {lang === "si"
                  ? "ස්ථාන අවසරය ලබා දෙන්න හෝ සිතියමෙන් ආරම්භය තෝරන්න."
                  : "Allow location access, or tap the map to set your start."}
              </div>
            )}

            <div className="field">
              <label>{t("home.pickDestination")}</label>
              <input
                className="input"
                value={query}
                placeholder={t("home.searchPlaceholder")}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {results.length > 0 && (
              <div className="search-results">
                {results.map((n) => (
                  <button key={n.id} onClick={() => pickDest(n)}>
                    <div>{n.name_si}</div>
                    <div className="en">{n.name_en}</div>
                  </button>
                ))}
              </div>
            )}

            {destNode && (
              <div className="alert info">
                {t("home.to")}: <strong>{localizedName(destNode, lang)}</strong>
              </div>
            )}
            {!destNode && <div className="alert info">{t("home.tapMapHint")}</div>}

            <button className="btn btn-go" disabled={!userPos || !destNode} onClick={onGo}>
              {t("home.go")}
            </button>

            <p className="disclaimer">{t("disclaimer")}</p>
          </div>
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
            onNew={() => {
              setPhase("home");
              setRoute(null);
              setRerouted(false);
            }}
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
