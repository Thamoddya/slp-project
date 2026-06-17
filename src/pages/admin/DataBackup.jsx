import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import repo from "../../data/repo.js";

export default function DataBackup({ net }) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null);

  const doExport = async () => {
    const data = repo.isLive
      ? await repo.exportAll()
      : { nodes: net.nodes, segments: net.segments, dansal: net.dansal, parking: net.parking, config: net.config };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poson-network-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(t("admin.data.importWarn"))) {
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        await repo.replaceAll(data);
        setMsg({ ok: true });
      } catch {
        setMsg({ ok: false });
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="admin-panel">
      <div className="section-title" style={{ marginTop: 0 }}>{t("admin.data.title")}</div>
      {msg && <div className={"alert " + (msg.ok ? "success" : "error")}>{msg.ok ? "✓" : "✗"}</div>}
      <button className="btn btn-primary btn-block" style={{ marginBottom: 12 }} onClick={doExport}>
        {t("admin.data.export")}
      </button>
      <button className="btn btn-ghost btn-block" onClick={() => fileRef.current?.click()}>
        {t("admin.data.import")}
      </button>
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={doImport} />
      <div style={{ marginTop: 16, fontSize: 13, color: "var(--ink-soft)" }}>
        {net.nodes.length} nodes · {net.segments.length} segments · {net.dansal.length} dansal ·{" "}
        {net.parking.length} parking
      </div>
    </div>
  );
}
