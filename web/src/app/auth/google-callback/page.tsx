"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * How long to wait for the browser client to finish its own code exchange
 * before treating the sign-in as failed. Generous: it's one network round trip,
 * but a cold mobile connection can be slow and a false failure here is worse
 * than a slightly long spinner.
 */
const EXCHANGE_TIMEOUT_MS = 15_000;

const SHELL: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  fontFamily: "Arial, sans-serif",
};

function safeNext(value: string | null): string {
  return value?.startsWith("/") ? value : "/app";
}

/**
 * OAuth must exchange its PKCE code in the same browser context that started
 * the login. In particular, a Chrome Identity window has separate storage
 * from the main tab, so the server callback cannot read its verifier cookie.
 *
 * This page does NOT call exchangeCodeForSession itself. `createBrowserClient`
 * hard-codes `detectSessionInUrl: true` — and applies it *after* the caller's
 * `auth` options, so it can't be turned off — meaning the client exchanges
 * `?code=` on its own as soon as this module is imported. Calling the exchange
 * here as well raced that one over a single-use verifier: the loser found the
 * verifier already consumed and rendered "PKCE code verifier not found in
 * storage" even though sign-in had actually succeeded (going back showed the
 * user logged in). So: wait for the client's exchange, don't duplicate it.
 */
function GoogleCallbackContent() {
  const params = useSearchParams();
  const code = params.get("code");
  const next = params.get("next");
  const [error, setError] = useState<string | null>(() =>
    code ? null : "Missing authorization code.",
  );

  useEffect(() => {
    if (!code) return;
    let settled = false;

    // Full reload rather than a router push, so the proxy sees the new session
    // cookie when it gates the destination.
    function finish() {
      if (settled) return;
      settled = true;
      window.location.replace(safeNext(next));
    }

    // The exchange may land after this effect subscribes...
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish();
    });

    // ...or it may already have completed while this component was mounting.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish();
    });

    const timer = setTimeout(() => {
      if (settled) return;
      // Last check before giving up — the auth state event can be missed if the
      // exchange resolved in the gap between the two calls above.
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) finish();
        else if (!settled) setError("Timed out completing Google sign-in.");
      });
    }, EXCHANGE_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [code, next]);

  if (!error) return <LoadingState />;

  return (
    <main style={SHELL}>
      <div style={{ textAlign: "center" }}>
        <p>Google sign-in failed: {error}</p>
        <Link href={`/login?next=${encodeURIComponent(safeNext(next))}`}>
          Back to sign in
        </Link>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <main style={SHELL}>
      <p>Signing you in with Google…</p>
    </main>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
