import { useEffect, useRef, useState } from "react";
import { Bot, BrainCircuit, Database, FlaskConical, Loader2, MessageSquare, Send, Sparkles, User } from "lucide-react";
import type { ChatMessage, LoadedImage } from "../lib/types";
import { KNOWLEDGE_BASE, MODEL_INFO } from "../lib/datasets";
import InputDock from "./InputDock";
import ResultsCard from "./ResultsCard";

interface Props {
  messages: ChatMessage[];
  busy: boolean;
  images: LoadedImage[];
  onImagesChange: (imgs: LoadedImage[]) => void;
  onSend: (query: string) => void;
  onDownloadReport: (m: ChatMessage) => void;
}

const SUGGESTED_QUERIES = [
  {
    text: "Describe the land-cover and major objects visible in this image.",
    tag: "VQA",
  },
  {
    text: "Highlight the water or built-up regions in this scene.",
    tag: "Grounding",
  },
  {
    text: "What changed between these two dates, and where?",
    tag: "Change",
  },
];

export default function ChatPane({
  messages,
  busy,
  images,
  onImagesChange,
  onSend,
  onDownloadReport,
}: Props) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function submit(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    onSend(q);
    setDraft("");
  }

  const empty = messages.length === 0;

  return (
    <section className="flex h-full min-w-0 flex-col" aria-label="Chat and results">
      {/* header */}
      <header className="flex items-center gap-2 border-b border-border bg-surface/30 px-4 py-3">
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-sm font-semibold text-foreground">Analysis console</h1>
        <span className="readout ml-auto hidden items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[10px] text-muted sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          satellite uplink · ready
        </span>
      </header>

      {/* scrollable message area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {empty ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/40 bg-surface glow-cyan">
              <Sparkles className="h-6 w-6 text-accent" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                Ready for reconnaissance
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Load a sample scene or upload an optical / SAR image pair, then ask about
                land-cover, change detection, or grounding.
              </p>
            </div>
            <ul className="w-full space-y-2">
              {SUGGESTED_QUERIES.map((s) => (
                <li key={s.text}>
                  <PromptButton q={s.text} disabled={images.length === 0} onPick={submit} />
                </li>
              ))}
            </ul>
            <KnowledgeBasePanel />
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((m) =>
              m.role === "user" ? (
                <UserMessageBubble key={m.id} m={m} />
              ) : (
                <div key={m.id} className="flex gap-2.5">
                  <Bot
                    className="mt-1 h-5 w-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    {m.error ? (
                      <ErrorBubble message={m.error} />
                    ) : m.result ? (
                      <ResultsCard message={m} onDownload={onDownloadReport} />
                    ) : (
                      <ThinkingBubble />
                    )}
                  </div>
                </div>
              ),
            )}
            {busy && <ThinkingInline />}
          </div>
        )}
      </div>

      {/* image dock + composer */}
      <div className="border-t border-border bg-surface/30 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <InputDock images={images} onChange={onImagesChange} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(draft);
            }}
            className="mt-3 flex items-end gap-2"
            aria-label="Ask about the imagery"
          >
            <label htmlFor="query-input" className="sr-only">
              Your question about the imagery
            </label>
            <textarea
              id="query-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(draft);
                }
              }}
              rows={2}
              placeholder={
                images.length === 0
                  ? "Add an image above, then ask…"
                  : "Ask about the scene (e.g. describe land-cover, what changed…)…"
              }
              className="max-h-40 flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/50 transition-colors focus:border-ring"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim() || images.length === 0}
              aria-label="Send query"
              className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function UserMessageBubble({ m }: { m: ChatMessage }) {
  return (
    <div className="flex justify-end gap-2.5">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-border bg-surface-2 px-4 py-3">
        <p className="text-sm leading-relaxed text-foreground">{m.query}</p>
        {m.images && m.images.length > 0 && (
          <div className="mt-2 flex gap-2">
            {m.images.map((im) => (
              <img
                key={im.id}
                src={im.dataUrl}
                alt={im.name}
                className="h-14 w-14 rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        )}
      </div>
      <User className="mt-1 h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3">
      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted">Analysing imagery…</p>
    </div>
  );
}

function ThinkingInline() {
  return (
    <div className="flex items-center gap-2 px-1 text-xs text-muted">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
      <span>Agent routing task · selecting tool · executing</span>
    </div>
  );
}

function ErrorBubble({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-2xl rounded-bl-sm border border-destructive/40 bg-destructive/10 px-4 py-3"
    >
      <p className="text-sm text-red-200">{message}</p>
    </div>
  );
}

function PromptButton({ q, disabled, onPick }: { q: string; disabled: boolean; onPick: (t: string) => void }) {
  return (
    <button
      onClick={() => onPick(q)}
      disabled={disabled}
      className="btn-press flex w-full items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
      <span className="truncate">{q}</span>
    </button>
  );
}

function KnowledgeBasePanel() {
  return (
    <div className="w-full rounded-2xl border border-border bg-surface/60 p-4 text-left">
      <p className="readout flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted">
        <Database className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        Models &amp; evaluation data
      </p>
      <ul className="mt-2 space-y-2.5">
        <li className="flex items-start gap-2">
          <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">
              Controller model · <span className="text-accent">{MODEL_INFO.name}</span>
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{MODEL_INFO.note}</p>
          </div>
        </li>
        {KNOWLEDGE_BASE.map((d) => (
          <li key={d.id} className="flex items-start gap-2">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {d.name}
                <span className="readout ml-1.5 rounded-full border border-border bg-surface-2 px-1.5 py-px text-[9px] text-muted">
                  {d.role}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">{d.summary}</p>
              <p className="readout mt-1 text-[9px] text-muted">
                {d.reference} · {d.modifiers}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}