import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import si from "./si.json";

const STORAGE_KEY = "poson.lang";
const saved = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, si: { translation: si } },
  lng: saved || "si",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(lng: string): void {
  i18n.changeLanguage(lng);
  if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, lng);
  if (typeof document !== "undefined") document.documentElement.lang = lng;
}

export default i18n;
