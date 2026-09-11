import { useState } from "react";
import { Eye, EyeOff, Loader2, Satellite } from "lucide-react";
import { supabase } from "../lib/supabase";

type Mode = "signin" | "signup";

interface Props {
  onAuthed: () => void;
}

export default function AuthScreen({ onAuthed }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!supabase) {
      setError(
        "Supabase isn't configured — the app is running in demo mode. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in.",
      );
      return;
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setError(
            err.message.includes("Invalid login credentials")
              ? "That email and password combination didn't match. Try again."
              : err.message,
          );
          return;
        }
        onAuthed();
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) {
          setError(
            err.message.includes("already registered")
              ? "An account already exists for that email — sign in instead."
              : err.message,
          );
          return;
        }
        if (data.session) {
          onAuthed();
        } else {
          setNotice(
            "Account created! Check your inbox for a confirmation link, then sign in.",
          );
          setMode("signin");
          setPassword("");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const toggle = mode === "signin" ? "signup" : "signin";

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-up">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-surface glow-cyan">
            <Satellite className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            SatQuery AI
          </h1>
          <p className="mt-2 text-sm text-muted">
            Agentic satellite-imagery analysis — mission control
          </p>
        </div>

        <div className="panel p-6 sm:p-8">
          {/* Mode tabs */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1"
          >
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                id={`tab-${m}`}
                aria-selected={mode === m}
                aria-controls={`panel-${m}`}
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setNotice(null);
                }}
                className={`btn-press rounded-lg px-4 py-2 text-sm font-medium ${
                  mode === m
                    ? "bg-primary text-on-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form
            role={mode === "signin" ? "form" : "form"}
            aria-label={mode === "signin" ? "Sign in" : "Create account"}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/50 transition-colors focus:border-ring"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signin" ? "Your password" : "At least 6 characters"}
                  className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-11 text-sm text-foreground placeholder:text-muted/50 transition-colors focus:border-ring"
                  required
                />
                <button
                  type="button"
                  aria-pressed={showPw}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((v) => !v)}
                  className="btn-press absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-foreground"
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-red-200"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm text-cyan-100"
              >
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-press flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {mode === "signin" ? "Signing in…" : "Creating account…"}
                </>
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(toggle);
                setError(null);
                setNotice(null);
              }}
              className="btn-press font-medium text-primary hover:text-secondary"
            >
              {toggle === "signin" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted/70">
          Demo build · remote-sensing analysis via Google Gemini · no keys exposed
        </p>
      </div>
    </div>
  );
}