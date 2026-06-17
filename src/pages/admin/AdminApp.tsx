import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { onAuthChange, signOut } from "@/firebase/auth";
import { useNetwork } from "@/hooks/useNetwork";
import TopBar from "@/components/layout/TopBar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Login from "./Login";
import Editor from "./Editor";
import ControlBoard from "./ControlBoard";
import Validation from "./Validation";
import DataBackup from "./DataBackup";
import type { AdminUser } from "@/types";

export default function AdminApp() {
  const { t } = useTranslation();
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined);
  const net = useNetwork();

  useEffect(() => onAuthChange(setUser), []);

  if (user === undefined) {
    return (
      <div className="admin-shell flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-cream-300 border-t-navy-700" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="admin-shell flex flex-col">
      <TopBar
        right={
          <button
            onClick={() => signOut()}
            className="shrink-0 flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-white/25 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("admin.signOut")}
          </button>
        }
      />

      {!net.ready ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-cream-300 border-t-navy-700" />
        </div>
      ) : (
        <Tabs defaultValue="control" className="flex flex-1 min-h-0 flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="control">{t("admin.tabs.control")}</TabsTrigger>
            <TabsTrigger value="editor">{t("admin.tabs.editor")}</TabsTrigger>
            <TabsTrigger value="validate">{t("admin.tabs.validate")}</TabsTrigger>
            <TabsTrigger value="data">{t("admin.tabs.data")}</TabsTrigger>
          </TabsList>

          <TabsContent value="control">
            <ControlBoard net={net} />
          </TabsContent>
          <TabsContent value="editor" className="overflow-hidden">
            <Editor net={net} />
          </TabsContent>
          <TabsContent value="validate">
            <Validation net={net} />
          </TabsContent>
          <TabsContent value="data">
            <DataBackup net={net} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
