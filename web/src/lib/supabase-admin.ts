import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Service-key Supabase client for server-side use (API routes, pipeline stages).
 * Bypasses RLS. Never import this from a client component.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE config (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY)",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cached;
}
