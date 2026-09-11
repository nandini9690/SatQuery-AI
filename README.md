# SatQuery AI

Agentic satellite-imagery analysis — mission control. Load an optical, SAR, optical+SAR
pair or bi-temporal change-pair scene, ask a question, and get a structured,
trace-annotated answer (with region-grounding overlays where applicable).

## Requirements

- Node.js 20+
- npm

## Install & run

```bash
npm install     # install dependencies
npm run dev     # Vite dev server → http://localhost:5173
npm run build   # production build → dist/
npm run preview # serve the production build
```

## Configuration — optional

The app is fully explorable in **demo mode** with zero configuration: bundled
sample scenes render locally and analysis runs through a built-in simulator, so
you never hit a blank page.

To enable live features (email/password sign-in, Gemini-powered analysis via the
`satoquery-analyze` Edge Function, saved reports):

1. Copy `.env.example` to `.env.local` (or set the variables in the NativelyAI
   platform's Environment settings panel).
2. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase
   project dashboard → Project Settings → API. Both are public by design.
3. Restart `npm run dev`.

| Variable                  | Required for            | Notes                     |
| ------------------------- | ----------------------- | ------------------------- |
| `VITE_SUPABASE_URL`       | live auth + analysis + reports | public config       |
| `VITE_SUPABASE_ANON_KEY`  | live auth + analysis + reports | public anon key     |

**Secrets never belong in `.env` or client code.** Provider keys (e.g. the
Gemini API key) live in the `satquery-analyze` Edge Function's secrets
(`Deno.env.get(...)`) and are called server-side only.

## Demo mode

When the two Supabase env vars are absent, the app boots directly into the
mission-control shell:

- a slim in-app banner — "Supabase not configured — running in demo mode" —
  replaces the blank screen; the UI stays fully navigable;
- the sample gallery (`src/lib/samples.ts`) renders procedural satellite-style
  preview scenes (optical / SAR / fusion pair / bi-temporal pair);
- `src/lib/analyze.ts` returns a local simulated result (`simulated: true`),
  so the results card, execution trace and HTML report download all work.

## Layout

- `src/App.tsx` — boot, session + demo-mode switch, mission-control shell
- `src/components/` — AuthScreen, input dock, chat, results, trace, history rail
- `src/lib/` — supabase client, samples, analysis, report generation, types
- `satquery-analyze` — Supabase Edge Function (Gemini calls, simulated fallback)