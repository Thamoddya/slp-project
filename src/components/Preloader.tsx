import { useTranslation } from "react-i18next";

/**
 * Full-screen splash shown while the road network + map boot.
 * Uses the SLP crest (public/logo.png) on a soft cream backdrop.
 */
export default function Preloader() {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-cream-50 to-cream-100 px-8">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* Crest in a soft halo */}
        <div className="relative flex h-32 w-32 items-center justify-center rounded-[28px] bg-white shadow-poson-lg">
          <span className="absolute inset-0 rounded-[28px] ring-1 ring-navy-100" />
          <img
            src="/logo.png"
            alt="Sri Lanka Police"
            className="h-24 w-24 object-contain animate-pulse"
            draggable={false}
          />
        </div>

        {/* Wordmark */}
        <div className="text-center">
          <h1 className="text-lg font-black tracking-tight text-navy-900">
            {t("app.title")}
          </h1>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {t("app.subtitle")}
          </p>
        </div>

        {/* Loader bar */}
        <div className="mt-2 h-1.5 w-44 overflow-hidden rounded-full bg-cream-300">
          <div className="h-full w-1/2 rounded-full bg-navy-700 preloader-bar" />
        </div>
      </div>

      {/* Powered-by footer */}
      <div className="absolute inset-x-0 bottom-8 text-center">
        <p className="text-[11px] font-medium text-muted-foreground">
          {t("more.poweredBy")}
        </p>
      </div>
    </div>
  );
}
