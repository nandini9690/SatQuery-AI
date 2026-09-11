import { useEffect, useState } from "react";
import {
  Check,
  FileText,
  History,
  Loader2,
  LogOut,
  Plus,
  Save,
  Satellite,
  User,
} from "lucide-react";
import { listSavedReports, type StoredReport } from "../lib/reports";
import type { ChatMessage } from "../lib/types";

interface Props {
  messages: ChatMessage[];
  onNewSession: () => void;
  onSignOut: () => void;
  userEmail: string | null;
  onSaveCurrent: () => Promise<void>;
}

export default function HistoryRail({
  messages,
  onNewSession,
  onSignOut,
  userEmail,
  onSaveCurrent,
}: Props) {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    let mounted = true;
    listSavedReports()
      .then((r) => mounted && setReports(r))
      .catch(() => mounted && setReports([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [messages.length, saving]);

  async function handleSave() {
    const last = [...messages].reverse().find((m) => m.result);
    if (!last) return;
    setSaving(true);
    try {
      await onSaveCurrent();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside
      className="flex h-full flex-col border-r border-border bg-surface/30"
      aria-label="Session and report history"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-surface glow-cyan">
          <Satellite className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <span className="font-heading text-sm font-bold tracking-tight text-foreground">
          SatQuery <span className="text-primary">AI</span>
        </span>
      </div>

      {/* Session actions */}
      <div className="px-3 pb-3">
        <button
          onClick={onNewSession}
          className="btn-press flex w-full items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-foreground hover:border-primary/50"
        >
          <Plus className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          New session
        </button>
      </div>

      {/* Report history */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <h2 className="label-chip mb-2 flex items-center gap-1.5 px-1">
          <History className="h-3 w-3" aria-hidden="true" />
          Saved reports
        </h2>
        {loading ? (
          <p className="px-1 py-2 text-xs text-muted">Loading…</p>
        ) : reports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center">
            <p className="text-xs text-muted">No reports yet.</p>
            <p className="mt-1 text-[11px] text-muted/70">
              Run an analysis, then save it here to share later.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {reports.map((r) => (
              <li key={r.path}>
                <button
                  onClick={() => r.url && window.open(r.url, "_blank", "noopener")}
                  className="btn-press flex w-full items-center gap-2 rounded-lg border border-border bg-surface/60 px-2.5 py-2 text-left hover:border-primary/40"
                  title="Open report"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                  <span className="readout truncate text-[11px] text-muted">{r.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Save current */}
        <button
          onClick={handleSave}
          disabled={saving || !messages.some((m) => m.result)}
          className="btn-press mt-3 flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : savedFlash ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {savedFlash ? "Saved to reports" : "Save latest analysis"}
        </button>
      </div>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted">
            <User className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{userEmail ?? "Operator"}</p>
            <p className="readout text-[10px] text-muted">mission-control · demo</p>
          </div>
          <button
            onClick={onSignOut}
            aria-label="Sign out"
            className="btn-press rounded-lg p-1.5 text-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}