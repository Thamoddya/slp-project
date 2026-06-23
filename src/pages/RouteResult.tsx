import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowRight, Clock, Ruler, Navigation, ParkingSquare, Utensils } from "lucide-react";
import { formatDistance, formatEta, localizedName } from "@/components/format";
import { dansalIcon, dansalTint, dansalColor } from "@/lib/dansal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RouteResult as RouteResultType, NetworkState } from "@/types";

interface RouteResultProps {
  route: RouteResultType | null;
  net: NetworkState;
  lang: string;
  rerouted: boolean;
  showDansal: boolean;
  showParking: boolean;
  vehicle: string;
  setShowDansal: (v: (p: boolean) => boolean) => void;
  setShowParking: (v: (p: boolean) => boolean) => void;
  setVehicle: (v: string) => void;
  onNew: () => void;
  onReport: () => void;
  onOpenMaps?: () => void;
}

export default function RouteResult({
  route, net, lang, rerouted, showDansal, showParking, vehicle,
  setShowDansal, setShowParking, setVehicle, onNew, onReport, onOpenMaps,
}: RouteResultProps) {
  const { t } = useTranslation();

  const segDistance = useMemo(() => {
    const m = new Map<string, number>();
    let acc = 0;
    (route?.ok ? route.segments : []).forEach((s) => {
      acc += s.lengthMeters || 0;
      m.set(s.id, acc);
    });
    return m;
  }, [route]);

  const routeSegIds = useMemo(
    () => new Set((route?.ok ? route.segments : []).map((s) => s.id)),
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
        .filter((p) => vehicle === "all" || (p.vehicleTypes || []).includes(vehicle as never))
        .sort((a, b) => (segDistance.get(a.nearestSegmentId) || 0) - (segDistance.get(b.nearestSegmentId) || 0)),
    [net.parking, routeSegIds, segDistance, vehicle]
  );

  // ── Error state ──────────────────────────────────────────────────────────
  if (!route?.ok) {
    const isFar = route?.reason === "far-from-network";
    const entry = route?.entryNodeId ? net.nodes.find((n) => n.id === route.entryNodeId) : null;
    return (
      <Body>
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 mb-4">
          <p className="font-bold text-red-800 text-sm mb-1">
            {t(isFar ? "route.farFromNetwork" : "route.noRoute")}
          </p>
          <p className="text-xs text-red-700">
            {t(isFar ? "route.farHint" : "route.noRouteHint")}
          </p>
          {entry && (
            <p className="mt-2 text-xs text-red-700 font-medium">
              → <strong>{localizedName(entry, lang)}</strong>
            </p>
          )}
        </div>
        <Button variant="ghost" className="w-full" onClick={onNew}>
          {t("route.newRoute")}
        </Button>
      </Body>
    );
  }

  const dest = net.nodes.find((n) => n.id === route.destNodeId);
  const start = net.nodes.find((n) => n.id === route.startNodeId);

  return (
    <Body>
      {/* Reroute warning */}
      {rerouted && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-saffron-50 border border-saffron-200 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-saffron-600" />
          <p className="text-xs font-semibold text-saffron-800">{t("route.rerouted")}</p>
        </div>
      )}

      {/* Outside-zone hint: route starts from the nearest entry point */}
      {route.viaEntry && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-navy-50 border border-navy-200 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-navy-700 mt-0.5" />
          <p className="text-xs font-semibold text-navy-800">
            {t("route.viaEntry", { name: localizedName(start, lang) })}
          </p>
        </div>
      )}

      {/* From → To */}
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-navy-50 border border-navy-100 px-4 py-3">
        <div className="min-w-0 flex-1 text-sm text-navy-900">
          <span className="font-bold">{localizedName(start, lang)}</span>
          <span className="mx-1 text-muted-foreground">{t("route.via")} →</span>
          <span className="font-bold">{localizedName(dest, lang)}</span>
        </div>
      </div>

      {/* Distance + ETA chips */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-cream-50 border border-cream-200 px-4 py-3">
          <Ruler className="h-5 w-5 text-navy-700 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("route.distance")}
            </p>
            <p className="text-xl font-black text-navy-900">
              {formatDistance(route.distanceMeters, t)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-cream-50 border border-cream-200 px-4 py-3">
          <Clock className="h-5 w-5 text-navy-700 shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("route.eta")}
            </p>
            <p className="text-xl font-black text-navy-900">
              {formatEta(route.etaMinutes, t)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter toggles */}
      <div className="mb-1 flex flex-wrap gap-2">
        <FilterChip active={showDansal} onClick={() => setShowDansal((v) => !v)}>
          <Utensils className="h-3.5 w-3.5" /> {t("filters.dansal")}
        </FilterChip>
        <FilterChip active={showParking} onClick={() => setShowParking((v) => !v)}>
          <ParkingSquare className="h-3.5 w-3.5" /> {t("filters.parking")}
        </FilterChip>
      </div>
      {showParking && (
        <div className="mb-3 flex flex-wrap gap-2">
          {["all", "car", "bus", "threewheeler", "motorbike"].map((v) => (
            <FilterChip key={v} active={vehicle === v} onClick={() => setVehicle(v)}>
              {v === "all" ? t("filters.all") : t(`vehicle.${v}`)}
            </FilterChip>
          ))}
        </div>
      )}

      {/* Turn-by-turn */}
      <SectionTitle>{t("route.stepsTitle")}</SectionTitle>
      <ol className="mb-4 space-y-1">
        {route.segments.map((s, i) => (
          <li key={s.id + i} className="flex items-start gap-3 py-2 border-b border-dashed border-cream-200">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-700 text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <span className="text-sm text-navy-900 leading-relaxed">
              {localizedName(s, lang)}{" "}
              <ArrowRight className="inline h-3 w-3 text-red-500" />{" "}
              {localizedName(net.nodes.find((n) => n.id === s.toNodeId), lang)}
            </span>
          </li>
        ))}
      </ol>

      {/* Dansal on route */}
      {showDansal && (
        <>
          <SectionTitle>{t("dansal.title")}</SectionTitle>
          {dansalOnRoute.length === 0 ? (
            <InfoBox>{t("dansal.none")}</InfoBox>
          ) : (
            <div className="mb-4 space-y-2">
              {dansalOnRoute.map((d) => {
                const Icon = dansalIcon(d.type);
                return (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3 ${!d.active ? "opacity-50" : ""}`}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: dansalTint(d.type), color: dansalColor(d.type) }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-900 text-sm">{localizedName(d, lang)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`dansal.type.${d.type}`)} · {t("dansal.open", { hours: d.openHours || "—" })}
                    </p>
                  </div>
                  {!d.active && (
                    <Badge variant="inactive">{t("dansal.inactive")}</Badge>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Parking on route */}
      {showParking && (
        <>
          <SectionTitle>{t("parking.title")}</SectionTitle>
          {parkingOnRoute.length === 0 ? (
            <InfoBox>{t("parking.none")}</InfoBox>
          ) : (
            <div className="mb-4 space-y-2">
              {parkingOnRoute.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                    <ParkingSquare className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-900 text-sm">{localizedName(p, lang)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("parking.capacity", { n: p.capacity })} ·{" "}
                      {(p.vehicleTypes || []).map((v) => t(`vehicle.${v}`)).join(", ")}
                    </p>
                  </div>
                  <Badge variant={p.status as "available" | "filling" | "full"}>
                    {t(`parking.status.${p.status}`)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Actions */}
      {onOpenMaps && (
        <Button variant="saffron" className="w-full mb-2" onClick={onOpenMaps}>
          <Navigation className="mr-2 h-4 w-4" />
          {t("route.openInMaps")}
        </Button>
      )}
      <div className="flex gap-3 mt-1">
        <Button className="flex-1" onClick={onNew}>
          {t("route.newRoute")}
        </Button>
        <Button variant="ghost" size="icon" onClick={onReport}>
          <AlertTriangle className="h-4 w-4" />
        </Button>
      </div>

      <button
        className="mt-3 w-full text-center text-xs font-semibold text-navy-700 underline underline-offset-2"
        onClick={onReport}
      >
        {t("report.button")}
      </button>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground border-t border-cream-200 pt-3">
        {t("disclaimer")}
      </p>
    </Body>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Body({ children }: { children: React.ReactNode }) {
  return <div className="pb-2">{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-xl bg-cream-50 border border-cream-200 px-4 py-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function FilterChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
        active
          ? "bg-navy-700 text-white border-navy-700"
          : "bg-white text-muted-foreground border-cream-200 hover:border-navy-200"
      }`}
    >
      {children}
    </button>
  );
}
