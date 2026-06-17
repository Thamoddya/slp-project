import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import repo from "@/data/repo";
import { Button } from "@/components/ui/button";
import type { NetworkState } from "@/types";

type Status = "idle" | "success" | "error";

export default function DataBackup({ net }: { net: NetworkState }) {
  const { t } = useTranslation();
  const importRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");

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

      let imported = 0;

      if (Array.isArray(data.nodes)) {
        for (const n of data.nodes) {
          if (n.id) { await repo.set("nodes", n.id, n); imported++; }
        }
      }
      if (Array.isArray(data.segments)) {
        for (const s of data.segments) {
          if (s.id) { await repo.set("segments", s.id, s); imported++; }
        }
      }
      if (Array.isArray(data.dansal)) {
        for (const d of data.dansal) {
          if (d.id) { await repo.set("dansal", d.id, d); imported++; }
        }
      }
      if (Array.isArray(data.parking)) {
        for (const p of data.parking) {
          if (p.id) { await repo.set("parking", p.id, p); imported++; }
        }
      }

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
      </div>
    </div>
  );
}
