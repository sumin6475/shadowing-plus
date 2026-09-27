import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

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

const configuredSupabaseUrl = supabaseUrl;
const configuredSupabaseAnonKey = supabaseAnonKey;

/** Expo Router SSR runs this module in Node. RN AsyncStorage's web impl reads `window`. */
const isWebSsr = Platform.OS === "web" && typeof window === "undefined";

const authStorage = {
  getItem: (key: string) => (isWebSsr ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) => (isWebSsr ? Promise.resolve() : AsyncStorage.setItem(key, value)),
  removeItem: (key: string) => (isWebSsr ? Promise.resolve() : AsyncStorage.removeItem(key)),
};

export const supabase = createClient(configuredSupabaseUrl, configuredSupabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: !isWebSsr,
    persistSession: !isWebSsr,
    // No URL to parse on native — OAuth redirects are handled explicitly later.
    detectSessionInUrl: false,
  },
});

export type SocialProviderAvailability = {
  apple: boolean;
  google: boolean;
};

/** Reads the public GoTrue provider flags so the app never presents a dead OAuth button. */
export async function getSocialProviderAvailability(): Promise<SocialProviderAvailability> {
  const response = await fetch(`${configuredSupabaseUrl}/auth/v1/settings`, {
    headers: { apikey: configuredSupabaseAnonKey },
  });
  if (!response.ok) throw new Error("Couldn’t load sign-up options.");
  const settings = (await response.json()) as {
    external?: Partial<Record<keyof SocialProviderAvailability, boolean>>;
  };
  const apple = settings.external?.apple === true;
  return {
    apple,
    // App Review Guideline 4.8 requires an equivalent Apple option whenever
    // Google sign-in is offered. Keep email available and hide Google until
    // the production Apple provider is genuinely enabled.
    google: apple && settings.external?.google === true,
  };
}
