import { setLanguage } from "@/i18n";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
        "relative flex items-center gap-2.5 px-3.5 py-3 pt-safe text-white shadow-topbar z-50 shrink-0 sm:gap-3 sm:px-4",
        "bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700",
        className,
      )}
      style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
    >
      {/* Soft Poson moon halo behind the crest */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-2 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-saffron-300/15 blur-2xl sm:left-3"
      />

      {/* SLP Crest */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        <img
          src="/logo.png"
          alt="Sri Lanka Police"
          className="h-7 w-7 object-contain"
          draggable={false}
        />
      </div>

      {/* Title */}
      <div className="relative min-w-0 flex-1 leading-tight">
        <h1 className="truncate text-[15px] font-bold tracking-tight">
          {t("app.title")}
        </h1>
        <p className="flex items-center gap-1.5 text-[11px] font-medium opacity-90">
          <span
            aria-hidden
            className="poson-moon-dot poson-moon-dot--sm poson-bob shrink-0"
          />
          <span className="truncate">{t("app.subtitle")}</span>
        </p>
      </div>

      {/* Right slot */}
      {right}

      {/* Language toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle language"
        className="relative shrink-0 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[13px] font-semibold transition-colors hover:bg-white/25 active:bg-white/30"
      >
        {t("lang.toggle")}
      </button>

      {/* Buddhist-flag 5-stripe hairline along the bottom edge */}
      <span
        aria-hidden
        className="poson-flag-strip pointer-events-none absolute inset-x-0 bottom-0 h-[3px] opacity-90"
      />
    </header>
  );
}
