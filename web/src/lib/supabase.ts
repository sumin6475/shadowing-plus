import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser Supabase client (anon key) that reads the auth session from cookies
 * set by `@supabase/ssr`. Once a user is logged in, RLS scopes every `.from()`
 * query automatically — the existing client query code does not change.
 *
 * Kept as `supabase` (the historical export name) so the ~30 client call sites
 * across the app don't need to change their imports.
 */
// Must match the server clients' cookieOptions (proxy.ts, auth/callback,
// supabase-server.ts) — see the note there on why `secure` needs to be
// forced for the session cookie to survive Telegram's in-app browser.
// Only forced in production: a `secure` cookie is dropped outright on
// http://localhost, which broke local sign-in (PKCE code verifier never
// persisted, so /auth/callback always failed with "code verifier not found").
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: { secure: process.env.NODE_ENV === "production" },
});
