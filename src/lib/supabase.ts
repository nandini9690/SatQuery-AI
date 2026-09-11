import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when both Supabase env vars are present — live auth, analysis and reports work. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Public project config, exported for direct Edge Function calls (the anon key
 * is safe to ship to the browser — it only gates public read access, and the
 * analysis function additionally verifies the caller's session JWT).
 */
export const SUPABASE_URL = supabaseUrl ?? "";
export const SUPABASE_ANON_KEY = supabaseAnonKey ?? "";

/**
 * Supabase client, or `null` when the env vars are missing.
 *
 * The app never crashes on boot because of missing config: it falls back to a
 * fully explorable demo mode (bundled sample scenes + local simulated analysis).
 * This export is nullable on purpose — every consumer must handle `null`.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Thrown by code paths that genuinely need a live client (storage, auth). */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  return supabase;
}