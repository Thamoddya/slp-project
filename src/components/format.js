// Small shared formatters. `t` is the i18next translate fn.

export function formatDistance(meters, t) {
  if (meters >= 1000) return t("route.km", { n: (meters / 1000).toFixed(1) });
  return t("route.meters", { n: Math.round(meters) });
}

export function formatEta(minutes, t) {
  return t("route.minutes", { n: Math.max(1, minutes) });
}

export function localizedName(doc, lang) {
  if (!doc) return "";
  return (lang === "si" ? doc.name_si : doc.name_en) || doc.name_en || doc.name_si || "";
}

export function timeAgo(ts, lang) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "object" && ts.seconds ? ts.seconds * 1000 : ts);
  return d.toLocaleTimeString(lang === "si" ? "si-LK" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
