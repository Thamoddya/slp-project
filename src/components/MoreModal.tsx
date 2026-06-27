import { setLanguage } from "@/i18n";
import {
  AlertTriangle,
  ChevronRight,
  Languages,
  ShieldCheck,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface MoreModalProps {
  onClose: () => void;
  onReport: () => void;
}

export default function MoreModal({ onClose, onReport }: MoreModalProps) {
  const { t, i18n } = useTranslation();
  const toggleLang = () => setLanguage(i18n.language === "si" ? "en" : "si");

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-navy-950/55 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white shadow-sheet p-6 animate-slide-up"
        style={{
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-cream-300" />
        <button
          onClick={onClose}
          aria-label={t("more.close")}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-cream-100"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-4 text-lg font-bold text-navy-900">
          {t("more.title")}
        </h2>

        {/* Action rows */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-cream-200">
          <button
            onClick={toggleLang}
            className="flex w-full items-center gap-3 border-b border-cream-100 px-4 py-3.5 text-left transition-colors hover:bg-cream-50"
          >
            <Languages className="h-5 w-5 shrink-0 text-navy-700" />
            <span className="flex-1 text-sm font-semibold text-navy-900">
              {t("more.language")}
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              {t("lang.toggle")}
            </span>
          </button>

          <button
            onClick={() => {
              onClose();
              onReport();
            }}
            className="flex w-full items-center gap-3 border-b border-cream-100 px-4 py-3.5 text-left transition-colors hover:bg-cream-50"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-saffron-500" />
            <span className="flex-1 text-sm font-semibold text-navy-900">
              {t("more.report")}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <Link
            to="/admin"
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left no-underline transition-colors hover:bg-cream-50"
          >
            <ShieldCheck className="h-5 w-5 shrink-0 text-navy-700" />
            <span className="flex-1 text-sm font-semibold text-navy-900">
              {t("more.admin")}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="mb-5 rounded-xl bg-cream-50 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
          {t("disclaimer")}
        </p>

        {/* Credits */}
        <div className="flex flex-col items-center gap-3 border-t border-cream-200 pt-5 text-center">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Sri Lanka Police"
              className="h-14 w-14 object-contain opacity-90"
              draggable={false}
            />
            <img
              src="/texta.png"
              alt="Texta World"
              className="h-14 object-contain"
              draggable={false}
            />
            <img
              src="/danidu.png"
              alt="Texta World"
              className="h-14 object-cover"
              draggable={false}
            />
          </div>
          <p className="text-[11px] font-medium text-muted-foreground">
            Developed by{" "}
            <a
              href="https://thamoddya.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-navy-700 hover:text-navy-900"
            >
              Thamoddya Dissanayake
            </a>{" "}
            (
            <a
              href="https://www.facebook.com/profile.php?id=100093553135022"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground"
            >
              Texta World
            </a>
            )
          </p>
        </div>
      </div>
    </div>
  );
}
