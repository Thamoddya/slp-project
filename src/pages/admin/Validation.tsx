import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { validateNetwork } from "@/routing/validate";
import { localizedName } from "@/components/format";
import { Button } from "@/components/ui/button";
import type { NetworkState, ValidationIssue } from "@/types";

const LEVEL_STYLE: Record<string, string> = {
  error: "bg-red-50 border-red-200 text-red-800",
  warn: "bg-saffron-50 border-saffron-200 text-saffron-800",
};

const LEVEL_ICON: Record<string, React.ReactNode> = {
  error: <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />,
  warn: <AlertTriangle className="h-4 w-4 shrink-0 text-saffron-500" />,
};

function issueLabel(issue: ValidationIssue, lang: string): string {
  const nodeName = (n: { name_si: string; name_en: string } | undefined) =>
    n ? localizedName(n as never, lang) : "?";
  switch (issue.code) {
    case "unreachable": return `Unreachable entry: ${nodeName(issue.name)}`;
    case "orphan": return `Orphan node (no connections): ${nodeName(issue.name)}`;
    case "deadEnd": return `Dead end (no outgoing): ${nodeName(issue.name)}`;
    case "deadStart": return `Dead start (no incoming): ${nodeName(issue.name)}`;
    case "duplicate": return `Duplicate segment: ${nodeName(issue.from)} → ${nodeName(issue.to)}`;
    default: return issue.code;
  }
}

export default function Validation({ net }: { net: NetworkState }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 120));
    setIssues(validateNetwork(net.nodes, net.segments));
    setRunning(false);
  };

  const errors = issues?.filter((i) => i.level === "error") ?? [];
  const warns = issues?.filter((i) => i.level === "warn") ?? [];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="p-4">
        {/* Run button */}
        <Button className="w-full" onClick={run} disabled={running} size="lg">
          <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
          {running ? t("admin.validate.running") : t("admin.validate.run")}
        </Button>

        {/* Summary row */}
        {issues && (
          <div className="mt-4 flex gap-3">
            <SummaryChip count={errors.length} label={t("admin.validate.errors")} color="red" />
            <SummaryChip count={warns.length} label={t("admin.validate.warnings")} color="amber" />
          </div>
        )}

        {/* All-clear */}
        {issues && issues.length === 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-green-50 border border-green-200 px-4 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="font-semibold text-green-800 text-sm">{t("admin.validate.allClear")}</p>
          </div>
        )}

        {/* Issue list */}
        {issues && issues.length > 0 && (
          <div className="mt-4 space-y-2">
            {[...errors, ...warns].map((issue, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${LEVEL_STYLE[issue.level] || LEVEL_STYLE.warn}`}
              >
                {LEVEL_ICON[issue.level]}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{issueLabel(issue, lang)}</p>
                  {issue.nodeId && (
                    <p className="mt-0.5 font-mono text-[11px] opacity-70">{issue.nodeId}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Network stats */}
        <div className="mt-6 rounded-2xl bg-cream-50 border border-cream-200 divide-y divide-cream-200 overflow-hidden">
          {[
            { label: t("admin.stats.nodes"), value: net.nodes.length },
            { label: t("admin.stats.segments"), value: net.segments.length },
            { label: t("admin.stats.dansal"), value: net.dansal.length },
            { label: t("admin.stats.parking"), value: net.parking.length },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="font-bold text-navy-900">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ count, label, color }: { count: number; label: string; color: string }) {
  const styles: Record<string, string> = {
    red: "bg-red-50 border-red-200 text-red-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
  };
  return (
    <div className={`flex-1 rounded-xl border px-3 py-2.5 text-center ${styles[color]}`}>
      <p className="text-xl font-black">{count}</p>
      <p className="text-[11px] font-semibold">{label}</p>
    </div>
  );
}
