import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Upload, CheckCircle2, AlertTriangle, CopyX } from "lucide-react";
import repo from "@/data/repo";
import { Button } from "@/components/ui/button";
import type { NetworkState, AppConfig, Dansal, Parking } from "@/types";

type Status = "idle" | "success" | "error";

export default function DataBackup({ net }: { net: NetworkState }) {
  const { t } = useTranslation();
  const importRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Remove duplicate Dansal / parking (same name + roughly same location),
  // keeping the first of each. Coordinates rounded to ~100 m.
  const removeDuplicates = async () => {
    if (!window.confirm(t("admin.backup.dedupeWarn"))) return;
    setBusy(true);
    try {
      const sig = (x: Dansal | Parking) =>
        `${(x.name_en || x.name_si || "").trim().toLowerCase()}|${x.lat.toFixed(3)}|${x.lng.toFixed(3)}`;
      let removed = 0;
      const sweep = async (coll: "dansal" | "parking", items: (Dansal | Parking)[]) => {
        const seen = new Set<string>();
        for (const it of items) {
          const k = sig(it);
          if (seen.has(k)) { await repo.remove(coll, it.id); removed++; }
          else seen.add(k);
        }
      };
      await sweep("dansal", net.dansal);
      await sweep("parking", net.parking);
      setStatus("success");
      setStatusMsg(t("admin.backup.dedupeDone", { n: removed }));
    } catch {
      setStatus("error");
      setStatusMsg(t("admin.backup.importError"));
    } finally {
      setBusy(false);
    }
  };

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      nodes: net.nodes,
      segments: net.segments,
      dansal: net.dansal,
      parking: net.parking,
      config: net.config,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slp-network-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const hasNetwork = Array.isArray(data.nodes) || Array.isArray(data.segments);
      if (!hasNetwork) {
        setStatus("error");
        setStatusMsg(t("admin.backup.importError"));
        return;
      }

      // Replace the road network so no leftover/duplicate roads survive (which
      // could create wrong one-way routes). Collections the file omits are kept
      // as-is — e.g. importing a routes-only file preserves existing Dansal/parking.
      if (!window.confirm(t("admin.data.importWarn"))) return;

      const nodes = Array.isArray(data.nodes) ? data.nodes : net.nodes;
      const segments = Array.isArray(data.segments) ? data.segments : net.segments;
      const dansal = Array.isArray(data.dansal) ? data.dansal : net.dansal;
      const parking = Array.isArray(data.parking) ? data.parking : net.parking;
      const config = (data.config || net.config) as AppConfig;

      await repo.replaceAll({ nodes, segments, dansal, parking, config });

      const imported = nodes.length + segments.length + dansal.length + parking.length;
      setStatus("success");
      setStatusMsg(t("admin.backup.importedN", { n: imported }));
    } catch {
      setStatus("error");
      setStatusMsg(t("admin.backup.importError"));
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Status feedback */}
        {status !== "idle" && (
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              status === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {status === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
            )}
            <p className="text-sm font-semibold">{statusMsg}</p>
            <button
              onClick={() => setStatus("idle")}
              className="ml-auto text-xs font-bold opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Network stats */}
        <div className="rounded-2xl bg-cream-50 border border-cream-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-cream-200">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("admin.backup.networkStats")}
            </p>
          </div>
          <div className="divide-y divide-cream-200">
            {[
              { label: t("admin.stats.nodes"), value: net.nodes.length },
              { label: t("admin.stats.segments"), value: net.segments.length },
              {
                label: t("admin.stats.openSegments"),
                value: net.segments.filter((s) => s.status !== "closed").length,
              },
              { label: t("admin.stats.dansal"), value: net.dansal.length },
              {
                label: t("admin.stats.activeDansal"),
                value: net.dansal.filter((d) => d.active).length,
              },
              { label: t("admin.stats.parking"), value: net.parking.length },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-black text-navy-900 tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Export */}
        <div className="rounded-2xl bg-white border border-cream-200 p-4 space-y-3">
          <p className="font-semibold text-navy-900 text-sm">{t("admin.backup.exportTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("admin.backup.exportHint")}</p>
          <Button className="w-full" onClick={exportData}>
            <Download className="mr-2 h-4 w-4" />
            {t("admin.backup.export")}
          </Button>
        </div>

        {/* Import */}
        <div className="rounded-2xl bg-white border border-cream-200 p-4 space-y-3">
          <p className="font-semibold text-navy-900 text-sm">{t("admin.backup.importTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("admin.backup.importHint")}</p>
          <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={handleImportFile} />
          <Button variant="outline" className="w-full" onClick={() => importRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            {t("admin.backup.import")}
          </Button>
        </div>

        {/* Cleanup */}
        <div className="rounded-2xl bg-white border border-cream-200 p-4 space-y-3">
          <p className="font-semibold text-navy-900 text-sm">{t("admin.backup.dedupeTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("admin.backup.dedupeHint")}</p>
          <Button variant="outline" className="w-full" disabled={busy} onClick={removeDuplicates}>
            <CopyX className="mr-2 h-4 w-4" />
            {t("admin.backup.dedupe")}
          </Button>
        </div>
      </div>
    </div>
  );
}
