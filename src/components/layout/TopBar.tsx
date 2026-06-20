import { useTranslation } from "react-i18next";
import { setLanguage } from "@/i18n";
import { cn } from "@/lib/utils";

interface TopBarProps {
  right?: React.ReactNode;
  className?: string;
}

export default function TopBar({ right, className }: TopBarProps) {
  const { t, i18n } = useTranslation();
  const toggle = () => setLanguage(i18n.language === "si" ? "en" : "si");

  return (
    <header
      className={cn(
        "flex items-center gap-3 px-4 py-3 pt-safe bg-gradient-to-r from-navy-800 to-navy-700 text-white shadow-topbar z-50 shrink-0",
        className
      )}
      style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
    >
      {/* SLP Crest */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        <img src="/logo.png" alt="Sri Lanka Police" className="h-7 w-7 object-contain" draggable={false} />
      </div>

      {/* Title */}
      <div className="min-w-0 flex-1 leading-tight">
        <h1 className="truncate text-[15px] font-bold tracking-tight">{t("app.title")}</h1>
        <p className="text-[11px] font-medium opacity-80">{t("app.subtitle")}</p>
      </div>

      {/* Right slot */}
      {right}

      {/* Language toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle language"
        className="shrink-0 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[13px] font-semibold transition-colors hover:bg-white/25 active:bg-white/30"
      >
        {t("lang.toggle")}
      </button>
    </header>
  );
}
