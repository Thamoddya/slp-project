import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatDistance, formatEta, localizedName } from "../components/format.js";

const DANSAL_EMOJI = { food: "🍛", drink: "🥤", water: "💧", medical: "➕", other: "⭐" };
const DANSAL_BG = { food: "#fff0e6", drink: "#e9f3ff", water: "#e6f7ff", medical: "#ffe9e9", other: "#fff7e0" };

export default function RouteResult({
  route,
  net,
  lang,
  rerouted,
  showDansal,
  showParking,
  vehicle,
  setShowDansal,
  setShowParking,
  setVehicle,
  onNew,
  onReport,
}) {
  const { t } = useTranslation();

  // Cumulative distance from start to the END of each route segment.
  const segDistance = useMemo(() => {
    const m = new Map();
    let acc = 0;
    (route?.segments || []).forEach((s) => {
      acc += s.lengthMeters || 0;
      m.set(s.id, acc);
    });
    return m;
  }, [route]);

  const routeSegIds = useMemo(
    () => new Set((route?.segments || []).map((s) => s.id)),
    [route]
  );

  const dansalOnRoute = useMemo(
    () =>
      net.dansal
        .filter((d) => routeSegIds.has(d.nearestSegmentId))
        .sort((a, b) => (segDistance.get(a.nearestSegmentId) || 0) - (segDistance.get(b.nearestSegmentId) || 0)),
    [net.dansal, routeSegIds, segDistance]
  );

  const parkingOnRoute = useMemo(
    () =>
      net.parking
        .filter((p) => routeSegIds.has(p.nearestSegmentId))
        .filter((p) => vehicle === "all" || (p.vehicleTypes || []).includes(vehicle))
        .sort((a, b) => (segDistance.get(a.nearestSegmentId) || 0) - (segDistance.get(b.nearestSegmentId) || 0)),
    [net.parking, routeSegIds, segDistance, vehicle]
  );

  if (!route?.ok) {
    const isFar = route?.reason === "far-from-network";
    const entry = route?.entryNodeId && net.nodes.find((n) => n.id === route.entryNodeId);
    return (
      <div className="sheet">
        <div className="grip" />
        <div className="alert error">
          <strong>{t(isFar ? "route.farFromNetwork" : "route.noRoute")}</strong>
          <div style={{ marginTop: 6, fontWeight: 400 }}>
            {t(isFar ? "route.farHint" : "route.noRouteHint")}
          </div>
          {entry && (
            <div style={{ marginTop: 6 }}>
              {t("home.to")} → <strong>{localizedName(entry, lang)}</strong>
            </div>
          )}
        </div>
        <button className="btn btn-ghost btn-block" onClick={onNew}>
          {t("route.newRoute")}
        </button>
      </div>
    );
  }

  const dest = net.nodes.find((n) => n.id === route.destNodeId);
  const start = net.nodes.find((n) => n.id === route.startNodeId);

  return (
    <div className="sheet">
      <div className="grip" />

      {rerouted && <div className="alert warn">{t("route.rerouted")}</div>}

      <div className="alert info" style={{ marginBottom: 10 }}>
        <strong>{localizedName(start, lang)}</strong> {t("route.via")} →{" "}
        <strong>{localizedName(dest, lang)}</strong>
      </div>

      <div className="summary">
        <div className="chip">
          <div className="k">{t("route.distance")}</div>
          <div className="v">{formatDistance(route.distanceMeters, t)}</div>
        </div>
        <div className="chip">
          <div className="k">{t("route.eta")}</div>
          <div className="v">{formatEta(route.etaMinutes, t)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="toggles">
        <button className={"toggle " + (showDansal ? "on" : "")} onClick={() => setShowDansal((v) => !v)}>
          🍛 {t("filters.dansal")}
        </button>
        <button className={"toggle " + (showParking ? "on" : "")} onClick={() => setShowParking((v) => !v)}>
          🅿️ {t("filters.parking")}
        </button>
      </div>
      {showParking && (
        <div className="toggles">
          {["all", "car", "bus", "threewheeler", "motorbike"].map((v) => (
            <button key={v} className={"toggle " + (vehicle === v ? "on" : "")} onClick={() => setVehicle(v)}>
              {v === "all" ? t("filters.all") : t("vehicle." + v)}
            </button>
          ))}
        </div>
      )}

      {/* Turn-by-turn */}
      <div className="section-title">{t("route.stepsTitle")}</div>
      <ol className="steps">
        {route.segments.map((s, i) => (
          <li key={s.id + i}>
            <span className="num">{i + 1}</span>
            <span>
              {localizedName(s, lang)} <span className="dir-arrow">→</span>{" "}
              {localizedName(net.nodes.find((n) => n.id === s.toNodeId), lang)}
            </span>
          </li>
        ))}
      </ol>

      {/* Dansal */}
      {showDansal && (
        <>
          <div className="section-title">{t("dansal.title")}</div>
          {dansalOnRoute.length === 0 && <div className="alert info">{t("dansal.none")}</div>}
          {dansalOnRoute.map((d) => (
            <div key={d.id} className={"poi " + (d.active ? "" : "off")}>
              <div className="ic" style={{ background: DANSAL_BG[d.type] || "#f1f4fb" }}>
                {DANSAL_EMOJI[d.type] || "⭐"}
              </div>
              <div className="body">
                <div className="nm">{localizedName(d, lang)}</div>
                <div className="sub">
                  {t("dansal.type." + d.type)} · {t("dansal.open", { hours: d.openHours || "—" })}
                </div>
              </div>
              {!d.active && <span className="pill closed">{t("dansal.inactive")}</span>}
            </div>
          ))}
        </>
      )}

      {/* Parking */}
      {showParking && (
        <>
          <div className="section-title">{t("parking.title")}</div>
          {parkingOnRoute.length === 0 && <div className="alert info">{t("parking.none")}</div>}
          {parkingOnRoute.map((p) => (
            <div key={p.id} className="poi">
              <div className="ic" style={{ background: "#eef1f8", color: "#1d3a8a", fontWeight: 800 }}>P</div>
              <div className="body">
                <div className="nm">{localizedName(p, lang)}</div>
                <div className="sub">
                  {t("parking.capacity", { n: p.capacity })} ·{" "}
                  {(p.vehicleTypes || []).map((v) => t("vehicle." + v)).join(", ")}
                </div>
              </div>
              <span className={"pill " + p.status}>{t("parking.status." + p.status)}</span>
            </div>
          ))}
        </>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onNew}>
          {t("route.newRoute")}
        </button>
        <button className="btn btn-ghost" onClick={onReport}>
          ⚠️
        </button>
      </div>

      <button className="linklike" style={{ marginTop: 12 }} onClick={onReport}>
        {t("report.button")}
      </button>

      <p className="disclaimer">{t("disclaimer")}</p>
    </div>
  );
}
