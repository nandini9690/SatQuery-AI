import { Activity, FlaskConical, ListChecks } from "lucide-react";
import type { AnalysisResult } from "../lib/types";

interface Props {
  result: AnalysisResult | null;
}

export default function TracePanel({ result }: Props) {
  if (!result) {
    return (
      <div className="panel flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <ListChecks className="h-6 w-6 text-muted/50" aria-hidden="true" />
        <p className="text-sm font-medium text-muted">No active analysis</p>
        <p className="text-xs text-muted/70">
          Run a query to see the agentic execution trace here.
        </p>
      </div>
    );
  }

  return (
    <div className="panel flex h-full flex-col p-4">
      <header className="mb-3 flex items-center gap-2 border-b border-border pb-3">
        <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="font-heading text-sm font-semibold text-foreground">Execution trace</h2>
        {result.simulated && (
          <span className="readout ml-auto inline-flex items-center gap-1 rounded border border-accent/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-accent">
            <FlaskConical className="h-3 w-3" aria-hidden="true" />
            Simulated
          </span>
        )}
      </header>

      <dl className="readout mb-4 space-y-1.5 text-[11px]">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">task</dt>
          <dd className="text-foreground">{result.task_label}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">model</dt>
          <dd className="text-foreground">{result.model}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">latency</dt>
          <dd className="text-foreground">{result.latency_ms} ms</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">images</dt>
          <dd className="text-foreground">
            {result.metadata.images.map((i) => i.label).join(", ") || "—"}
          </dd>
        </div>
      </dl>

      <ol className="space-y-2.5 overflow-y-auto">
        {(result.trace ?? []).map((s) => (
          <li key={s.step} className="relative pl-6">
            <span className="absolute left-0 top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-primary/40 bg-surface-2 readout text-[9px] text-primary">
              {s.step}
            </span>
            <p className="text-xs font-semibold text-foreground">{s.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}