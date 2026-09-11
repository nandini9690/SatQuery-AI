import { useState } from "react";
import {
  Activity,
  BoxSelect,
  ChevronDown,
  Cpu,
  Download,
  FlaskConical,
  Layers,
  Zap,
} from "lucide-react";
import type { ChatMessage, GroundingBox } from "../lib/types";
import { TASK_BADGE, TOOL_META } from "../lib/types";

/* ---------- small primitives ---------- */

function ToneBadge({ tone, children }: { tone: string; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    cyan: "border-primary/50 text-primary",
    teal: "border-secondary/50 text-secondary",
    amber: "border-accent/60 text-accent",
    violet: "border-violet-400/60 text-violet-300",
    neutral: "border-border text-muted",
  };
  return (
    <span
      className={`readout inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${tones[tone] ?? tones.neutral}`}
    >
      {children}
    </span>
  );
}

function ConfMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="label-chip">Confidence</span>
        <span className="readout text-xs text-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`Confidence ${pct} percent`}
        />
      </div>
    </div>
  );
}

/* ---------- image with grounding overlay ---------- */

function ImageWithBoxes({
  src,
  label,
  boxes,
  alt,
}: {
  src: string;
  label: string;
  boxes: GroundingBox[];
  alt: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <figure
      className="relative overflow-hidden rounded-lg border border-border bg-black"
      onMouseLeave={() => setHover(null)}
    >
      <img src={src} alt={alt} className="block w-full" loading="lazy" />
      {boxes.length > 0 && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {boxes.map((b, i) => {
            const [x1, y1, x2, y2] = b.bbox;
            const hov = hover === b.label;
            return (
              <g key={`${b.label}-${i}`}>
                <rect
                  x={x1 * 100}
                  y={y1 * 100}
                  width={(x2 - x1) * 100}
                  height={(y2 - y1) * 100}
                  fill={hov ? "rgba(251,191,36,0.18)" : "none"}
                  stroke={hov ? "#fbbf24" : "#f59e0b"}
                  strokeWidth={hov ? 2.2 : 1.2}
                />
                <text
                  x={x1 * 100}
                  y={Math.max(4, y1 * 100 - 2)}
                  fontSize={4.2}
                  fill={hov ? "#fbbf24" : "#fcd34d"}
                  stroke="rgba(0,0,0,0.55)"
                  strokeWidth={0.3}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  {b.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <figcaption className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 readout text-[9px] text-primary">
        {label}
      </figcaption>
      {boxes.length > 0 && (
        <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1.5">
          {boxes.map((b) => (
            <span
              key={b.label}
              onMouseEnter={() => setHover(b.label)}
              onMouseLeave={() => setHover(null)}
              className="readout cursor-default rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-amber-200"
            >
              {b.label} {Math.round(b.confidence * 100)}%
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}

/* ---------- execution trace ---------- */

function TraceRows({ trace }: { trace: NonNullable<ChatMessage["result"]>["trace"] }) {
  return (
    <ol className="space-y-2.5">
      {(trace ?? []).map((s) => (
        <li key={s.step} className="relative pl-6">
          <span className="absolute left-0 top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-primary/40 bg-surface-2 readout text-[9px] text-primary">
            {s.step}
          </span>
          <p className="text-xs font-semibold text-foreground">{s.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.detail}</p>
        </li>
      ))}
    </ol>
  );
}

/* ---------- results card (assistant message) ---------- */

interface Props {
  message: ChatMessage;
  onDownload: (m: ChatMessage) => void;
}

export default function ResultsCard({ message, onDownload }: Props) {
  const r = message.result!;
  const [traceOpen, setTraceOpen] = useState(true);
  const tone = TASK_BADGE[r.task]?.tone ?? "neutral";
  const isPair = (message.images?.length ?? 0) === 2;
  const boxes = r.task === "grounding" ? (r.evidence?.boxes ?? []) : [];
  const images = message.images ?? [];

  const pairBadge = isPair ? (
    r.task === "cross_modal_fusion" ? (
      <span className="readout inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
        <Layers className="h-3 w-3 text-secondary" aria-hidden="true" />
        Optical + SAR
      </span>
    ) : (
      <span className="readout inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
        <Layers className="h-3 w-3 text-violet-300" aria-hidden="true" />
        t1 → t2 pair
      </span>
    )
  ) : null;

  const stats: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Cpu className="h-3.5 w-3.5" aria-hidden="true" />, label: "Model", value: r.model ?? "—" },
    {
      icon: <Zap className="h-3.5 w-3.5" aria-hidden="true" />,
      label: "Latency",
      value: r.latency_ms != null ? `${r.latency_ms} ms` : "—",
    },
    {
      icon: <Activity className="h-3.5 w-3.5" aria-hidden="true" />,
      label: "Tool",
      value: r.tool_label ?? TOOL_META[r.tool ?? ""]?.label ?? "—",
    },
  ];

  return (
    <article className="panel animate-fade-up p-4 sm:p-5">
      {/* header badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ToneBadge tone={tone}>{TASK_BADGE[r.task]?.label ?? r.task}</ToneBadge>
        {r.tool && <ToneBadge tone="neutral">{TOOL_META[r.tool]?.label ?? r.tool}</ToneBadge>}
        {r.simulated && (
          <span className="readout inline-flex items-center gap-1 rounded border border-accent/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent">
            <FlaskConical className="h-3 w-3" aria-hidden="true" />
            Simulated
          </span>
        )}
        {pairBadge}
      </div>

      {/* answer */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{r.answer}</p>

      {/* imagery block */}
      {images.length > 0 && (
        <div className={`mt-4 grid gap-2 ${isPair ? "grid-cols-2" : "max-w-md"}`}>
          {images.map((im, i) => (
            <ImageWithBoxes
              key={im.id}
              src={im.dataUrl}
              label={im.label ?? im.modality}
              alt={im.name}
              boxes={i === 0 && boxes.length ? boxes : []}
            />
          ))}
        </div>
      )}

      {/* stats + confidence */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {stats.map((t) => (
          <div key={t.label} className="rounded-lg border border-border bg-surface/60 px-2.5 py-2">
            <div className="flex items-center gap-1 text-muted">
              {t.icon}
              <span className="label-chip">{t.label}</span>
            </div>
            <p className="readout mt-1 truncate text-[11px] text-foreground" title={t.value}>
              {t.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <ConfMeter value={r.confidence} />
      </div>

      {/* actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onDownload(message)}
          className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download report
        </button>
        <button
          onClick={() => setTraceOpen((v) => !v)}
          aria-expanded={traceOpen}
          className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
        >
          <BoxSelect className="h-3.5 w-3.5" aria-hidden="true" />
          Execution trace
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${traceOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {traceOpen && r.trace?.length ? (
        <div className="mt-3 rounded-lg border border-border bg-surface/50 p-3.5">
          <TraceRows trace={r.trace} />
        </div>
      ) : null}
    </article>
  );
}