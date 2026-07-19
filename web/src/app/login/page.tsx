"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./login.css";

type Mode = "signin" | "signup";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") ?? "/app";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Seeded lazily from a ?error= (e.g. a failed OAuth redirect) so the initial
  // client render matches the server — the initializer runs once, client-side,
  // during the first render rather than reading searchParams on every render.
  const [error, setError] = useState<string | null>(
    () => searchParams.get("error"),
  );
  const [confirmSent, setConfirmSent] = useState(false);

  const safeNext = next.startsWith("/") ? next : "/app";

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mail = email.trim();
    if (!mail || !password) return;
    setBusy(true);
    setError(null);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      // If email confirmation is required, there's no session yet — tell the
      // user to confirm. If it's disabled in Supabase, a session comes back and
      // we can go straight in.
      if (data.session) {
        router.push(safeNext);
        router.refresh();
      } else {
        setConfirmSent(true);
        setBusy(false);
      }
      return;
    }

    // Sign in
    const { error } = await supabase.auth.signInWithPassword({
      email: mail,
      password,
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    // Session cookie is set by @supabase/ssr; refresh so the proxy sees it.
    router.push(safeNext);
    router.refresh();
  }

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    // On success the browser navigates to Google; only errors return here.
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Shadowing Plus</h1>

        {confirmSent ? (
          <p className="login-sent">
            Almost there — check <b>{email}</b> to confirm your account, then
            come back and sign in.
          </p>
        ) : (
          <>
            <button
              type="button"
              className="login-google"
              onClick={handleGoogle}
              disabled={busy}
            >
              <GoogleGlyph />
              Continue with Google
            </button>

            <div className="login-divider">
              <span>or</span>
            </div>

            <form onSubmit={handlePasswordSubmit} className="login-form">
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                required
              />
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                minLength={6}
                required
              />
              <button type="submit" className="login-btn" disabled={busy}>
                {busy
                  ? "…"
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </button>
              {error && <p className="login-error">{error}</p>}
            </form>

            <p className="login-switch">
              {mode === "signin" ? (
                <>
                  New here?{" "}
                  <button
                    type="button"
                    className="login-link"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                    }}
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="login-link"
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                    }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
