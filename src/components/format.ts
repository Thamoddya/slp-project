import type { TFunction } from "i18next";
import type { NetworkNode, Dansal, Parking, NetworkSegment } from "@/types";

type Localizable = Pick<NetworkNode | Dansal | Parking | NetworkSegment, "name_si" | "name_en">;

export function localizedName(doc: Partial<Localizable> | null | undefined, lang: string): string {
  if (!doc) return "";
  return (lang === "si" ? doc.name_si : doc.name_en) || doc.name_en || doc.name_si || "";
}

export function formatDistance(meters: number, t: TFunction): string {
  if (meters >= 1000) return t("route.km", { n: (meters / 1000).toFixed(1) });
  return t("route.meters", { n: Math.round(meters) });
}

export function formatEta(minutes: number, t: TFunction): string {
  return t("route.minutes", { n: Math.max(1, minutes) });
}

export function formatDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "si" ? "si-LK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function timeAgo(ts: number | { seconds: number } | null | undefined, lang: string): string {
  if (!ts) return "—";
  const d = new Date(typeof ts === "object" && "seconds" in ts ? ts.seconds * 1000 : ts);
  return d.toLocaleTimeString(lang === "si" ? "si-LK" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
