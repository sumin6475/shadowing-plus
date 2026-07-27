import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * React Native Supabase client (anon key, RLS-scoped).
 *
 * The native analog of the web app's browser client: same Supabase project,
 * same anon key, but session state lives in AsyncStorage instead of cookies
 * (there is no cookie jar on native). `@supabase/ssr` is web-only and is NOT
 * used here.
 *
 * The service key must never reach this bundle — anything needing a server
 * secret goes through the deployed web API (see lib/api.ts) with a Bearer token.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill in the same values the web app uses.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL to parse on native — OAuth redirects are handled explicitly later.
    detectSessionInUrl: false,
  },
});
