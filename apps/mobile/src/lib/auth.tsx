import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getSocialProviderAvailability,
  supabase,
  type SocialProviderAvailability,
} from "./supabase";

WebBrowser.maybeCompleteAuthSession();

type SocialProvider = "apple" | "google";

interface AuthState {
  /** The current Supabase session, or null when signed out. */
  session: Session | null;
  /** True until the initial session has been read from storage. */
  loading: boolean;
  socialProviders: SocialProviderAvailability | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<"signed_in" | "confirmation_required">;
  signInWithSocial: (provider: SocialProvider) => Promise<"signed_in" | "cancelled">;
  signOut: () => Promise<void>;
}

async function createSessionFromUrl(url: string): Promise<Session | null> {
  const [base, hash = ""] = url.split("#", 2);
  const query = new URL(base).searchParams;
  const fragment = new URLSearchParams(hash);
  const errorDescription = fragment.get("error_description") ?? query.get("error_description");
  if (errorDescription) throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, " ")));

  const accessToken = fragment.get("access_token") ?? query.get("access_token");
  const refreshToken = fragment.get("refresh_token") ?? query.get("refresh_token");
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data.session;
  }

  const code = query.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }
  return null;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Wraps the app and exposes the Supabase auth session. Reads the persisted
 * session once on mount, then subscribes to auth changes (sign-in, sign-out,
 * token refresh) so the route guard reacts automatically.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [socialProviders, setSocialProviders] = useState<SocialProviderAvailability | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    getSocialProviderAvailability()
      .then((providers) => {
        if (active) setSocialProviders(providers);
      })
      .catch(() => {
        // Email remains available if the public provider settings request fails.
        if (active) setSocialProviders({ apple: false, google: false });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      socialProviders,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      },
      async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        return data.session ? "signed_in" : "confirmation_required";
      },
      async signInWithSocial(provider) {
        const redirectTo = Linking.createURL("auth/callback");
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (!data.url) throw new Error(`Couldn’t start ${provider === "apple" ? "Apple" : "Google"} sign in.`);

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
          dismissButtonStyle: "cancel",
          preferEphemeralSession: false,
        });
        if (result.type !== "success") return "cancelled";
        const socialSession = await createSessionFromUrl(result.url);
        if (!socialSession) throw new Error("Sign in returned without a session. Please try again.");
        return "signed_in";
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, socialProviders],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
