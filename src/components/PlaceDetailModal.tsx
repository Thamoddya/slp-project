import { formatDate, localizedName } from "@/components/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dansalColor, dansalIcon, dansalTint } from "@/lib/dansal";
import type { Dansal, LatLng, Parking } from "@/types";
import {
  Calendar,
  Clock,
  MapPin,
  Navigation2,
  ParkingSquare,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export type PlaceDetail =
  | { kind: "dansal"; data: Dansal }
  | { kind: "parking"; data: Parking };

interface PlaceDetailModalProps {
  place: PlaceDetail;
  onClose: () => void;
  /** Optional — current user position; passed as origin to Google Maps. */
  userPos?: LatLng | null;
}

const PARKING_STATUS_VARIANT: Record<string, "available" | "filling" | "full"> =
  {
    available: "available",
    filling: "filling",
    full: "full",
  };

export default function PlaceDetailModal({
  place,
  onClose,
  userPos,
}: PlaceDetailModalProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // Close on Escape, and lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const { lat, lng } = place.data;
  const name = localizedName(place.data, lang);
  const secondary = lang === "si" ? place.data.name_en : place.data.name_si;

  const openInMaps = () => {
    const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
    const dest = fmt({ lat, lng });
    const url = userPos
      ? `https://www.google.com/maps/dir/${fmt(userPos)}/${dest}/?travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-navy-950/55 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-sheet animate-slide-up sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Saffron Buddhist-flag accent at the very top */}
        <span
          aria-hidden
          className="poson-flag-strip absolute inset-x-0 top-0 h-[3px] opacity-90"
        />

        {/* Grip (mobile only — feels like a bottom sheet) */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-cream-300 sm:hidden" />

        {/* Close */}
        <button
          onClick={onClose}
          aria-label={t("more.close")}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-cream-100 active:bg-cream-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          {/* Header — icon + name */}
          <div className="mb-4 flex items-start gap-3.5">
            <PlaceIcon place={place} />
            <div className="min-w-0 flex-1">
              <PlaceTypeChip place={place} t={t} />
              <h2 className="mt-1.5 break-words text-[19px] font-extrabold leading-tight tracking-tight text-navy-900">
                {name || t("place.unknown")}
              </h2>
              {secondary && secondary !== name && (
                <p className="mt-0.5 break-words text-[12px] font-medium text-muted-foreground">
                  {secondary}
                </p>
              )}
            </div>
          </div>

          {/* Detail rows */}
          <div className="space-y-2.5">
            {place.kind === "dansal" ? (
              <DansalDetails dansal={place.data} t={t} lang={lang} />
            ) : (
              <ParkingDetails parking={place.data} t={t} />
            )}

            {/* Coordinates */}
            <DetailRow
              icon={<MapPin className="h-4 w-4" />}
              label={t("place.coords")}
              value={`${lat.toFixed(5)}, ${lng.toFixed(5)}`}
              mono
            />
          </div>

          {/* Actions */}
          <div className="mt-5 flex gap-2.5">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              {t("more.close")}
            </Button>
            <Button
              variant="saffron"
              className="flex-[1.6] gap-2 font-bold"
              onClick={openInMaps}
            >
              <Navigation2 className="h-4 w-4" />
              {t("route.openInMaps")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function PlaceIcon({ place }: { place: PlaceDetail }) {
  if (place.kind === "dansal") {
    const Icon = dansalIcon(place.data.type);
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-poson"
        style={{
          background: dansalTint(place.data.type),
          color: dansalColor(place.data.type),
        }}
      >
        <Icon className="h-6 w-6" />
      </div>
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy-50 text-navy-700 shadow-poson">
      <ParkingSquare className="h-6 w-6" />
    </div>
  );
}

function PlaceTypeChip({
  place,
  t,
}: {
  place: PlaceDetail;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (place.kind === "dansal") {
    const d = place.data;
    return (
      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ background: dansalTint(d.type), color: dansalColor(d.type) }}
        >
          {t(`dansal.type.${d.type}`)}
        </span>
        {!d.active && <Badge variant="inactive">{t("dansal.inactive")}</Badge>}
      </div>
    );
  }
  const p = place.data;
  const variant = PARKING_STATUS_VARIANT[p.status] || "available";
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-navy-700">
        {t("nav.parking")}
      </span>
      <Badge variant={variant}>{t(`parking.status.${p.status}`)}</Badge>
    </div>
  );
}

function DansalDetails({
  dansal,
  t,
  lang,
}: {
  dansal: Dansal;
  t: ReturnType<typeof useTranslation>["t"];
  lang: string;
}) {
  return (
    <>
      <DetailRow
        icon={<Clock className="h-4 w-4" />}
        label={t("place.openHours")}
        value={dansal.openHours || "—"}
      />
      {dansal.date && (
        <DetailRow
          icon={<Calendar className="h-4 w-4" />}
          label={t("request.date")}
          value={formatDate(dansal.date, lang)}
        />
      )}
    </>
  );
}

function ParkingDetails({
  parking,
  t,
}: {
  parking: Parking;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <>
      <DetailRow
        icon={<ParkingSquare className="h-4 w-4" />}
        label={t("place.capacity")}
        value={t("parking.capacity", { n: parking.capacity })}
      />
      <DetailRow
        icon={<Navigation2 className="h-4 w-4" />}
        label={t("place.vehicles")}
        value={t("parking.allVehicles")}
      />
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-cream-200 bg-cream-50/60 px-3.5 py-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-navy-700 shadow-sm">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={`truncate text-sm font-semibold text-navy-900 ${mono ? "font-mono text-[12px]" : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
