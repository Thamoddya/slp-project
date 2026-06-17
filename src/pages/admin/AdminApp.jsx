import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { onAuthChange, signOut } from "../../firebase/auth.js";
import { useNetwork } from "../../hooks/useNetwork.js";
import TopBar from "../../components/TopBar.jsx";
import Login from "./Login.jsx";
import Editor from "./Editor.jsx";
import ControlBoard from "./ControlBoard.jsx";
import Validation from "./Validation.jsx";
import DataBackup from "./DataBackup.jsx";

export default function AdminApp() {
  const { t } = useTranslation();
  const [user, setUser] = useState(undefined); // undefined = loading
  const [tab, setTab] = useState("control");
  const net = useNetwork();

  useEffect(() => onAuthChange(setUser), []);

  if (user === undefined) {
    return (
      <div className="app-shell">
        <div className="center-msg">
          <div className="spinner" />
        </div>
      </div>
    );
  }
  if (!user) return <Login />;

  const tabs = [
    ["control", t("admin.tabs.control")],
    ["editor", t("admin.tabs.editor")],
    ["validate", t("admin.tabs.validate")],
    ["data", t("admin.tabs.data")],
  ];

  return (
    <div className="app-shell admin">
      <TopBar
        right={
          <button className="lang-btn" onClick={signOut}>
            {t("admin.signOut")}
          </button>
        }
      />
      <nav className="admin-tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="admin-body">
        {!net.ready ? (
          <div className="center-msg"><div className="spinner" /></div>
        ) : tab === "control" ? (
          <ControlBoard net={net} />
        ) : tab === "editor" ? (
          <Editor net={net} />
        ) : tab === "validate" ? (
          <Validation net={net} />
        ) : (
          <DataBackup net={net} />
        )}
      </div>
    </div>
  );
}
