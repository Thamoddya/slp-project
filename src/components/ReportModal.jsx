import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function ReportModal({ onClose, onSubmit }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSubmit(text.trim());
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,16,32,.55)",
        display: "grid",
        placeItems: "end center",
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div className="sheet" style={{ position: "relative", maxWidth: 520, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        {sent ? (
          <>
            <div className="alert success">{t("report.thanks")}</div>
            <button className="btn btn-primary btn-block" onClick={onClose}>
              OK
            </button>
          </>
        ) : (
          <>
            <div className="section-title" style={{ marginTop: 0 }}>{t("report.title")}</div>
            <textarea
              className="input"
              rows={4}
              placeholder={t("report.placeholder")}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="disclaimer">{t("report.locationNote")}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
                {t("admin.editor.cancel")}
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} disabled={busy} onClick={submit}>
                {t("report.submit")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
