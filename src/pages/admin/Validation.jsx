import { useState } from "react";
import { useTranslation } from "react-i18next";
import { validateNetwork } from "../../routing/validate.js";
import { localizedName } from "../../components/format.js";

export default function Validation({ net }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [issues, setIssues] = useState(null);

  const run = () => setIssues(validateNetwork(net.nodes, net.segments));

  const describe = (it) => {
    const name = localizedName(it.name, lang);
    switch (it.code) {
      case "unreachable":
        return t("admin.validate.unreachable", { name });
      case "deadEnd":
        return t("admin.validate.deadEnd", { name });
      case "deadStart":
        return t("admin.validate.deadStart", { name });
      case "orphan":
        return t("admin.validate.orphan", { name });
      case "duplicate":
        return t("admin.validate.duplicate", {
          from: localizedName(it.from, lang),
          to: localizedName(it.to, lang),
        });
      default:
        return it.code;
    }
  };

  return (
    <div className="admin-panel">
      <button className="btn btn-primary btn-block" onClick={run}>
        {t("admin.validate.run")}
      </button>
      <div style={{ marginTop: 16 }}>
        {issues && issues.length === 0 && <div className="alert success">{t("admin.validate.allGood")}</div>}
        {issues &&
          issues.map((it, i) => (
            <div key={i} className={"alert " + (it.level === "error" ? "error" : "warn")}>
              {describe(it)}
            </div>
          ))}
      </div>
    </div>
  );
}
