import { useTranslation } from "react-i18next";

/**
 * Full-screen splash shown while the road network + map boot.
 * Poson-poya feel: a calm pure-white field, a soft full-moon halo behind the
 * SLP crest, and gentle motion — professional and smooth, not flashy.
 */
export default function Preloader() {
  const { t } = useTranslation();

  return (
    <div className="preloader-fade fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-white px-8">
      {/* Soft Poson glow field */}
      <div className="pointer-events-none absolute inset-0 preloader-glow" />

      <div className="relative flex flex-col items-center gap-7">
        {/* Crest inside a full-moon halo */}
        <div className="relative grid place-items-center">
          <span className="absolute h-44 w-44 rounded-full bg-saffron-100/60 blur-2xl preloader-breathe" />
          <span className="absolute h-32 w-32 rounded-full ring-1 ring-saffron-200 preloader-ring" />
          <div className="relative grid h-28 w-28 place-items-center rounded-[30px] bg-white shadow-poson-lg preloader-float">
            <img
              src="/logo.png"
              alt="Sri Lanka Police"
              className="h-20 w-20 object-contain"
              draggable={false}
            />
          </div>
        </div>

        {/* Wordmark */}
        <div className="text-center">
          <h1 className="text-[19px] font-black tracking-tight text-navy-900">
            {t("app.title")}
          </h1>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {t("app.subtitle")}
          </p>
        </div>

        {/* Slim shimmer loader */}
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-cream-200">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-navy-700 via-navy-500 to-saffron-400 preloader-bar" />
        </div>
      </div>

      {/* Powered-by footer */}
      <div className="absolute inset-x-0 bottom-9 flex flex-col items-center gap-1">
        <p className="text-[11px] font-medium text-muted-foreground">{t("more.poweredBy")}</p>
        <img src="/texta.png" alt="Texta World" className="h-12 object-contain" draggable={false} />
      </div>
    </div>
  );
}
