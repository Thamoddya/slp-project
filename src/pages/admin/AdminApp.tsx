import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, LayoutGrid, Map, ShieldCheck, Database, Inbox } from "lucide-react";
import { onAuthChange, signOut } from "@/firebase/auth";
import { useNetwork } from "@/hooks/useNetwork";
import repo from "@/data/repo";
import TopBar from "@/components/layout/TopBar";
import Login from "./Login";
import Editor from "./Editor";
import ControlBoard from "./ControlBoard";
import Validation from "./Validation";
import DataBackup from "./DataBackup";
import Requests from "./Requests";
import type { AdminUser, DansalRequest } from "@/types";

type Tab = "control" | "requests" | "editor" | "validate" | "data";

const TABS: { id: Tab; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { id: "control", icon: LayoutGrid, labelKey: "admin.tabs.control" },
  { id: "requests", icon: Inbox, labelKey: "admin.tabs.requests" },
  { id: "editor", icon: Map, labelKey: "admin.tabs.editor" },
  { id: "validate", icon: ShieldCheck, labelKey: "admin.tabs.validate" },
  { id: "data", icon: Database, labelKey: "admin.tabs.data" },
];

export default function AdminApp() {
  const { t } = useTranslation();
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("control");
  const [pendingRequests, setPendingRequests] = useState(0);
  const net = useNetwork();

  useEffect(() => onAuthChange(setUser), []);

  useEffect(() => {
    if (!user) return;
    return repo.subscribeReports((d) => {
      const reqs = d as DansalRequest[];
      setPendingRequests(reqs.filter((r) => r.kind === "dansal_request" && (r.status || "pending") === "pending").length);
    });
  }, [user]);

  if (user === undefined) {
    return (
      <div className="flex h-dvh items-center justify-center bg-cream-50">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-cream-300 border-t-navy-700" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-cream-50" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Top bar */}
      <TopBar
        right={
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-white/25 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("admin.signOut")}</span>
          </button>
        }
      />

      {/* Tab bar */}
      <div className="flex shrink-0 bg-white border-b border-cream-200 shadow-sm">
        {TABS.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex flex-1 items-center justify-center gap-2 py-3 px-2 text-sm font-semibold border-b-2 transition-all ${
              tab === id
                ? "border-navy-700 text-navy-700"
                : "border-transparent text-muted-foreground hover:text-navy-700 hover:border-cream-300"
            }`}
          >
            <span className="relative">
              <Icon className="h-4 w-4 shrink-0" />
              {id === "requests" && pendingRequests > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {pendingRequests}
                </span>
              )}
            </span>
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {!net.ready ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-cream-300 border-t-navy-700" />
        </div>
      ) : (
        <div className={`flex flex-1 min-h-0 ${tab === "editor" ? "overflow-hidden" : "overflow-y-auto"}`}>
          {tab === "control" && <ControlBoard net={net} />}
          {tab === "requests" && <Requests />}
          {tab === "editor" && <Editor net={net} />}
          {tab === "validate" && <Validation net={net} />}
          {tab === "data" && <DataBackup net={net} />}
        </div>
      )}
    </div>
  );
}
