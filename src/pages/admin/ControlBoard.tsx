import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye } from "lucide-react";
import repo from "@/data/repo";
import { localizedName, timeAgo } from "@/components/format";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { NetworkState, NetworkSegment, Dansal, Parking } from "@/types";

const SECTION_KEYS = ["segments", "dansal", "parking"] as const;
type Section = (typeof SECTION_KEYS)[number];

export default function ControlBoard({ net }: { net: NetworkState }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [sub, setSub] = useState<Section>("segments");
  const [visits, setVisits] = useState<number | null>(null);

  useEffect(() => repo.subscribeStats((s) => setVisits(s.visits ?? 0)), []);

  const setSegStatus = (s: NetworkSegment, status: "open" | "closed") =>
    repo.update("segments", s.id, { status });
  const toggleDansal = (d: Dansal) =>
    repo.update("dansal", d.id, { active: !d.active });
  const setParkingStatus = (p: Parking, status: string) =>
    repo.update("parking", p.id, { status });

  return (
    <div className="flex flex-col h-full w-full">
      {/* Visit count */}
      <div className="shrink-0 border-b border-cream-200 bg-white px-4 py-3">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-navy-100 bg-navy-50 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-700 text-white">
            <Eye className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("admin.control.visits")}
            </p>
            <p className="text-2xl font-black tabular-nums text-navy-900">
              {visits === null ? "…" : visits.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 px-4 py-3 bg-cream-50 border-b border-cream-200 shrink-0">
        <div className="mx-auto flex w-full max-w-md gap-1">
          {SECTION_KEYS.map((id) => (
            <button
              key={id}
              onClick={() => setSub(id)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                sub === id
                  ? "bg-navy-700 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-cream-100"
              }`}
            >
              {t(`admin.control.${id}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
        {/* ── Segments ─────────────────────────────────────────────────── */}
        {sub === "segments" &&
          net.segments.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-2xl bg-white border border-cream-200 px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy-900 text-sm">{localizedName(s, lang)}</p>
                {s._changedAt && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("admin.control.lastChanged", { time: timeAgo(s._changedAt, lang) })}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setSegStatus(s, "open")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border ${
                    s.status !== "closed"
                      ? "bg-green-500 text-white border-green-500 shadow-sm"
                      : "bg-white text-muted-foreground border-cream-200 hover:border-green-300"
                  }`}
                >
                  {t("admin.control.open")}
                </button>
                <button
                  onClick={() => setSegStatus(s, "closed")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border ${
                    s.status === "closed"
                      ? "bg-red-500 text-white border-red-500 shadow-sm"
                      : "bg-white text-muted-foreground border-cream-200 hover:border-red-300"
                  }`}
                >
                  {t("admin.control.closed")}
                </button>
              </div>
            </div>
          ))}

        {/* ── Dansal ────────────────────────────────────────────────────── */}
        {sub === "dansal" &&
          net.dansal.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-2xl bg-white border border-cream-200 px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy-900 text-sm">{localizedName(d, lang)}</p>
                <Badge className="mt-1" variant={d.active ? "active" : "inactive"}>
                  {d.active ? t("admin.control.active") : t("admin.control.inactive")}
                </Badge>
              </div>
              <Switch
                checked={d.active}
                onCheckedChange={() => toggleDansal(d)}
              />
            </div>
          ))}

        {/* ── Parking ───────────────────────────────────────────────────── */}
        {sub === "parking" &&
          net.parking.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl bg-white border border-cream-200 px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy-900 text-sm">{localizedName(p, lang)}</p>
                <Badge className="mt-1" variant={p.status as "available" | "filling" | "full"}>
                  {t(`parking.status.${p.status}`)}
                </Badge>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {(["available", "filling", "full"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setParkingStatus(p, st)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all border ${
                      p.status === st
                        ? st === "available"
                          ? "bg-green-500 text-white border-green-500"
                          : st === "filling"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-red-500 text-white border-red-500"
                        : "bg-white text-muted-foreground border-cream-200"
                    }`}
                  >
                    {t(`parking.status.${st}`)}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
