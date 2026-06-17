import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n/index.js";

export default function TopBar({ right }) {
  const { t, i18n } = useTranslation();
  const toggle = () => setLanguage(i18n.language === "si" ? "en" : "si");
  return (
    <header className="topbar">
      <div className="crest">SLP</div>
      <div className="titles">
        <h1>{t("app.title")}</h1>
        <p>{t("app.subtitle")}</p>
      </div>
      {right}
      <button className="lang-btn" onClick={toggle} aria-label="Toggle language">
        {t("lang.toggle")}
      </button>
    </header>
  );
}
