import { useState } from "react";
import { useTranslation } from "react-i18next";
import repo from "../../data/repo.js";
import { localizedName, timeAgo } from "../../components/format.js";

export default function ControlBoard({ net }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [sub, setSub] = useState("segments");

  const setSegStatus = (s, status) => repo.update("segments", s.id, { status });
  const setDansal = (d) => repo.update("dansal", d.id, { active: !d.active });
  const setParking = (p, status) => repo.update("parking", p.id, { status });

  return (
    <div className="admin-panel">
      <div className="toggles" style={{ marginBottom: 14 }}>
        {[
          ["segments", t("admin.control.segments")],
          ["dansal", t("admin.control.dansal")],
          ["parking", t("admin.control.parking")],
        ].map(([id, label]) => (
          <button key={id} className={"toggle " + (sub === id ? "on" : "")} onClick={() => setSub(id)}>
            {label}
          </button>
        ))}
      </div>

      {sub === "segments" &&
        net.segments.map((s) => (
          <div className="ctl-row" key={s.id}>
            <div className="nm">
              {localizedName(s, lang)}
              {s._changedAt && (
                <div style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 400 }}>
                  {t("admin.control.lastChanged", { time: timeAgo(s._changedAt, lang) })}
                </div>
              )}
            </div>
            <div className="seg-status">
              <button
                className={"on " + (s.status !== "closed" ? "available" : "")}
                style={s.status !== "closed" ? {} : { opacity: 0.5 }}
                onClick={() => setSegStatus(s, "open")}
              >
                {t("admin.control.open")}
              </button>
              <button
                className={"on " + (s.status === "closed" ? "full" : "")}
                style={s.status === "closed" ? {} : { opacity: 0.5 }}
                onClick={() => setSegStatus(s, "closed")}
              >
                {t("admin.control.closed")}
              </button>
            </div>
          </div>
        ))}

      {sub === "dansal" &&
        net.dansal.map((d) => (
          <div className="ctl-row" key={d.id}>
            <div className="nm">{localizedName(d, lang)}</div>
            <button className={"switch " + (d.active ? "on" : "")} onClick={() => setDansal(d)}>
              <span className="knob" />
            </button>
          </div>
        ))}

      {sub === "parking" &&
        net.parking.map((p) => (
          <div className="ctl-row" key={p.id}>
            <div className="nm">{localizedName(p, lang)}</div>
            <div className="seg-status">
              {["available", "filling", "full"].map((st) => (
                <button
                  key={st}
                  className={(p.status === st ? "on " : "") + st}
                  onClick={() => setParking(p, st)}
                >
                  {t("parking.status." + st)}
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
