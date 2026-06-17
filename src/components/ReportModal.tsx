import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ReportModalProps {
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}

export default function ReportModal({ onClose, onSubmit }: ReportModalProps) {
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
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-navy-950/55 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white shadow-sheet p-6 animate-slide-up"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grip */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-cream-300" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-cream-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="text-center text-base font-semibold text-navy-900">{t("report.thanks")}</p>
            <Button className="w-full" onClick={onClose}>OK</Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-saffron-500" />
              <h2 className="text-lg font-bold text-navy-900">{t("report.title")}</h2>
            </div>
            <Textarea
              rows={4}
              placeholder={t("report.placeholder")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mb-3"
            />
            <p className="mb-4 text-xs text-muted-foreground">{t("report.locationNote")}</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                {t("admin.editor.cancel")}
              </Button>
              <Button
                className="flex-[2]"
                disabled={busy || !text.trim()}
                onClick={submit}
              >
                {t("report.submit")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
