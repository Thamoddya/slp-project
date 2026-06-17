import { useState } from "react";
import { useTranslation } from "react-i18next";
import { signInAndNotify } from "../../firebase/auth.js";
import { firebaseEnabled } from "../../firebase/config.js";
import TopBar from "../../components/TopBar.jsx";

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(false);
    setBusy(true);
    try {
      await signInAndNotify(email, password);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <TopBar />
      <div className="login-wrap">
        <form className="login-card" onSubmit={submit}>
          <h2>{t("admin.login")}</h2>
          {!firebaseEnabled && <div className="alert info">{t("admin.demoNote")}</div>}
          {err && <div className="alert error">{t("admin.loginError")}</div>}
          <div className="field">
            <label>{t("admin.email")}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div className="field">
            <label>{t("admin.password")}</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {t("admin.signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}
