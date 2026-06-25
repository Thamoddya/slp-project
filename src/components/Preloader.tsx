import { useTranslation } from "react-i18next";

/**
 * Full-screen splash shown while the road network + map boot.
 * Poson-poya feel: a calm pure-white field, a soft full-moon halo behind the
 * logos, and gentle motion — professional and smooth, not flashy.
 */
export default function Preloader() {
  const { t } = useTranslation();

  return (
    <div className="preloader-fade fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-white px-8">
      {/* Soft Poson glow field */}
      <div className="pointer-events-none absolute inset-0 preloader-glow" />

      <div className="relative flex flex-col items-center gap-7">
        {/* Both logos, side by side, in a full-moon halo */}
        <div className="relative grid place-items-center">
          <span className="absolute h-48 w-48 rounded-full bg-saffron-100/60 blur-2xl preloader-breathe" />
          <div className="relative flex items-center gap-4 rounded-[28px] bg-white px-6 py-4 shadow-poson-lg preloader-float">
            <img
              src="/logo.png"
              alt="Sri Lanka Police"
              className="h-16 w-16 object-contain"
              draggable={false}
            />
            <span className="h-12 w-px bg-cream-200" />
            <img
              src="/texta.png"
              alt="Texta World"
              className="h-12 object-contain"
              draggable={false}
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[19px] font-black tracking-tight text-navy-900 text-center">
          {t("app.title")}
        </h1>

        {/* Slim shimmer loader */}
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-cream-200">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-navy-700 via-navy-500 to-saffron-400 preloader-bar" />
        </div>
      </div>

      {/* Footer credit */}
      <div className="absolute inset-x-0 bottom-9 text-center">
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
  );
}
