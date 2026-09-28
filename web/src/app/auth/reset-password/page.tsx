"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { passwordChecks } from "@/lib/password-policy";
import "../../login/login.css";

// Where every password-reset email lands — web AND the Myne app. The app
// sends its reset link here (`?from=app`) instead of a custom-scheme deep
// link, because in-app mail browsers (Gmail etc.) can't open
// `shadowingplus://` and showed a blank page.
//
// A recovery link can arrive in three shapes, depending on who sent it:
//   • #access_token=…&type=recovery   implicit flow (the app, the web's
//                                      "Forgot password", the dashboard)
//   • ?code=…                          PKCE flow (same browser only)
//   • ?token_hash=…&type=recovery      a custom email template
// With no link params and a live session, it doubles as "change password".

type Phase = "verifying" | "form" | "done" | "invalid";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const fromApp = searchParams.get("from") === "app";

  const [phase, setPhase] = useState<Phase>("verifying");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pw = passwordChecks(password);
  const valid = pw.length && pw.case && pw.number;
  const match = password.length > 0 && password === confirm;
  const canSubmit = valid && match && !busy;

  useEffect(() => {
    let active = true;
    async function establish(): Promise<string | null> {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      const linkErr = hash.get("error_description") ?? query.get("error_description");
      if (linkErr) return linkErr.replace(/\+/g, " ");

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        // Drop the tokens from the address bar before anything else runs.
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        return error?.message ?? null;
      }

      const tokenHash = query.get("token_hash");
      if (tokenHash && query.get("type") === "recovery") {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        return error?.message ?? null;
      }

      const code = query.get("code");
      if (code) {
        // The browser client may already have exchanged it on init.
        const { data } = await supabase.auth.getSession();
        if (data.session) return null;
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        return error?.message ?? null;
      }

      const { data } = await supabase.auth.getUser();
      return data.user ? null : "missing";
    }

    establish()
      .then((err) => {
        if (!active) return;
        if (err) {
          setLinkError(err === "missing" ? null : err);
          setPhase("invalid");
        } else {
          setPhase("form");
        }
      })
      .catch((e) => {
        if (!active) return;
        setLinkError(e instanceof Error ? e.message : null);
        setPhase("invalid");
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    // App learners finish in the app — don't leave a stray web session behind.
    if (fromApp) await supabase.auth.signOut({ scope: "local" });
    setPhase("done");
    setBusy(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="login-title">{fromApp ? "Myne" : <>Shadowing<span className="login-plus">+</span></>}</p>

        {phase === "verifying" && <p className="login-sent">Checking your reset link…</p>}

        {phase === "invalid" && (
          <>
            <p className="login-sent">
              This reset link is invalid or has expired. Links work once and
              expire after an hour — request a new one and open the latest email.
            </p>
            {linkError && <p className="login-error">{linkError}</p>}
            {!fromApp && (
              <p className="login-switch">
                <Link href="/login" className="login-link">Back to sign in</Link>
              </p>
            )}
          </>
        )}

        {phase === "done" &&
          (fromApp ? (
            <>
              <p className="login-sent">
                Your password is updated. Go back to the Myne app and sign in
                with your new password.
              </p>
              <a href="shadowingplus://" className="login-btn reset-open-app">
                Open Myne
              </a>
            </>
          ) : (
            <>
              <p className="login-sent">Your password is updated.</p>
              <Link href="/app" className="login-btn reset-open-app">
                Continue
              </Link>
            </>
          ))}

        {phase === "form" && (
          <form onSubmit={handleSubmit} className="login-form">
            <p className="login-sent">Choose a new password for your account.</p>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              required
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Repeat new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="login-input"
              required
            />
            <ul className="login-reqs" aria-label="Password requirements">
              <li className={pw.length ? "met" : ""}>At least 8 characters</li>
              <li className={pw.case ? "met" : ""}>Upper &amp; lowercase letters</li>
              <li className={pw.number ? "met" : ""}>At least one number</li>
              <li className={match ? "met" : ""}>Both passwords match</li>
            </ul>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={!canSubmit}>
              {busy ? "…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
