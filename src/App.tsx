import { useCallback, useEffect, useState } from "react";
import { Satellite, TriangleAlert, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { runAnalysis } from "./lib/analyze";
import { downloadReport, saveReportSnapshot } from "./lib/reports";
import type { ChatMessage, LoadedImage } from "./lib/types";
import AuthScreen from "./components/AuthScreen";
import ChatPane from "./components/ChatPane";
import HistoryRail from "./components/HistoryRail";
import TracePanel from "./components/TracePanel";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [demoNotice, setDemoNotice] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [images, setImages] = useState<LoadedImage[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      // Demo mode (env vars absent): no session bootstrap — render directly.
      setChecked(true);
      return () => {
        mounted = false;
      };
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setEmail(data.session?.user.email ?? null);
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s);
      setEmail(s?.user.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSend = useCallback(
    async (query: string) => {
      if (busy || images.length === 0) return;
      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        query,
        images: [...images],
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setBusy(true);
      try {
        const result = await runAnalysis(query, images);
        const assistant: ChatMessage = {
          id: uid(),
          role: "assistant",
          result,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, assistant]);
        setImages([]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "The analysis failed. Please try again.";
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", error: msg, createdAt: Date.now() },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, images],
  );

  const handleDownload = useCallback((m: ChatMessage) => {
    downloadReport(m);
  }, []);

  const handleSave = useCallback(async () => {
    if (!supabase) return; // demo mode — nothing to persist
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant?.result) return;
    await saveReportSnapshot(lastAssistant);
  }, [messages]);

  const handleSignOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setMessages([]);
    setImages([]);
  }, []);

  if (!checked) {
    return (
      <div className="flex h-full items-center justify-center">
        <Satellite className="h-8 w-8 animate-pulse text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (!session && isSupabaseConfigured) {
    return <AuthScreen onAuthed={() => undefined} />;
  }

  const latestResult = [...messages].reverse().find((m) => m.result)?.result ?? null;
  const demo = !isSupabaseConfigured;

  return (
    <div className="flex h-full flex-col">
      {demo && demoNotice && (
        <div
          role="note"
          className="flex shrink-0 items-center gap-2 border-b border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-foreground sm:px-4"
        >
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate">
            Supabase not configured — running in{" "}
            <span className="font-medium text-accent">demo mode</span>. Sample scenes work; live
            analysis, sign-in and saved reports are disabled.{" "}
            <code className="readout text-[10px] text-muted">cp .env.example .env.local</code>
          </p>
          <button
            type="button"
            onClick={() => setDemoNotice(false)}
            aria-label="Dismiss demo notice"
            className="btn-press rounded-md p-1 text-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-72 shrink-0 md:block">
        <HistoryRail
          messages={messages}
          onNewSession={() => {
            setMessages([]);
            setImages([]);
          }}
          onSignOut={handleSignOut}
          userEmail={demo ? "Demo (not signed in)" : email}
          onSaveCurrent={handleSave}
        />
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatPane
          messages={messages}
          busy={busy}
          images={images}
          onImagesChange={setImages}
          onSend={handleSend}
          onDownloadReport={handleDownload}
        />
      </main>

      <div className="hidden w-80 shrink-0 xl:block">
          <TracePanel result={latestResult} />
        </div>
      </div>
    </div>
  );
}