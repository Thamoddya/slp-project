import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X, Trash2, MapPin, Phone, Clock, Calendar, ShieldAlert } from "lucide-react";
import repo from "@/data/repo";
import { formatDate } from "@/components/format";
import { ANURADHAPURA_CENTER } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { DansalRequest } from "@/types";

const ts = (r: DansalRequest): number => {
  const c = r.createdAt;
  if (!c) return 0;
  return typeof c === "object" && "seconds" in c ? c.seconds * 1000 : (c as number);
};

export default function Requests() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [all, setAll] = useState<DansalRequest[]>([]);

  useEffect(() => repo.subscribeReports((d) => setAll(d as DansalRequest[])), []);

  const requests = all
    .filter((r) => r.kind === "dansal_request")
    .sort((a, b) => ts(b) - ts(a));

  // Approving creates a live Dansal (food) on the map, then marks the request
  // approved. Idempotent: re-approving won't create a second Dansal.
  const approve = async (r: DansalRequest) => {
    let dansalId = r.dansalId;
    if (!dansalId) {
      dansalId = await repo.add("dansal", {
        name_en: r.name_en || r.name_si || "Dansal",
        name_si: r.name_si || r.name_en || "Dansal",
        lat: typeof r.lat === "number" ? r.lat : ANURADHAPURA_CENTER.lat,
        lng: typeof r.lng === "number" ? r.lng : ANURADHAPURA_CENTER.lng,
        type: "food",
        active: true,
        openHours: r.openHours || "",
        date: r.date || "",
        nearestSegmentId: "",
      });
    }
    await repo.updateReport(r.id, { status: "approved", dansalId });
  };

  const setStatus = (r: DansalRequest, status: DansalRequest["status"]) =>
    repo.updateReport(r.id, { status });
  const del = (r: DansalRequest) => {
    if (window.confirm(t("admin.requests.confirmDelete"))) repo.removeReport(r.id);
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-3 p-4">
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-cream-200 bg-cream-50 px-4 py-10 text-center text-sm text-muted-foreground">
            {t("admin.requests.empty")}
          </div>
        ) : (
          requests.map((r) => {
            const status = r.status || "pending";
            return (
              <div key={r.id} className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
                <div className="flex gap-4 p-4">
                  {/* Proof image — admin only */}
                  {r.image ? (
                    <a href={r.image} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={r.image} alt="proof" className="h-24 w-24 rounded-xl border border-cream-200 object-cover" />
                    </a>
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-cream-300 bg-cream-50 text-center text-[10px] text-muted-foreground">
                      <ShieldAlert className="h-4 w-4" />
                      {t("admin.requests.noProof")}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-navy-900">{r.name_en || r.name_si || "—"}</p>
                      <Badge variant={status === "approved" ? "available" : status === "rejected" ? "full" : "filling"}>
                        {t(`admin.requests.status.${status}`)}
                      </Badge>
                    </div>
                    <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                      {r.openHours && <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {r.openHours}</p>}
                      {r.date && <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatDate(r.date, lang)}</p>}
                      {r.contact && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {r.contact}</p>}
                      {typeof r.lat === "number" && typeof r.lng === "number" && (
                        <a
                          href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 font-semibold text-navy-700 hover:underline"
                        >
                          <MapPin className="h-3.5 w-3.5" /> {t("admin.requests.viewLocation")}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-cream-200">
                  <button
                    onClick={() => approve(r)}
                    className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-green-700 transition-colors hover:bg-green-50"
                  >
                    <Check className="h-4 w-4" /> {t("admin.requests.approve")}
                  </button>
                  <button
                    onClick={() => setStatus(r, "rejected")}
                    className="flex flex-1 items-center justify-center gap-1.5 border-l border-cream-200 py-2.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-50"
                  >
                    <X className="h-4 w-4" /> {t("admin.requests.reject")}
                  </button>
                  <button
                    onClick={() => del(r)}
                    className="flex flex-1 items-center justify-center gap-1.5 border-l border-cream-200 py-2.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> {t("admin.requests.delete")}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
