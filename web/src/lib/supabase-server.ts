import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (anon key) bound to the request's auth cookies.
 * Use this in Route Handlers / Server Components to identify the caller —
 * `client.auth.getUser()` returns the verified session user. RLS scopes any
 * `.from()` queries made through it to that user.
 *
 * Distinct from `supabase-admin.ts` (service key, bypasses RLS): use the admin
 * client for pipeline inserts that act on behalf of a user, and this one to
 * learn *who* the caller is.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Must match proxy.ts / auth/callback's cookieOptions — see the note
      // there on why `secure` needs to be forced (production only; it breaks
      // local http://localhost sign-in otherwise).
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a Server Component the cookie store is read-only; the proxy
          // refreshes the session cookie instead, so a throw here is expected
          // and safe to ignore.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // no-op: session refresh handled by proxy.ts
          }
        },
      },
    },
  );
}

/**
 * Resolve the authenticated user's id from the request cookies, or null if the
 * caller has no valid session. Route handlers use this to scope service-key
 * queries by `user_id` (the service key bypasses RLS, so this filter is the
 * enforcement point).
 */
export async function getSessionUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
