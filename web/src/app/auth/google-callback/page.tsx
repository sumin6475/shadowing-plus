"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function safeNext(value: string | null): string {
  return value?.startsWith("/") ? value : "/app";
}

/**
 * OAuth must exchange its PKCE code in the same browser context that started
 * the login. In particular, a Chrome Identity window has separate storage
 * from the main tab, so the server callback cannot read its verifier cookie.
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
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }
      window.location.replace(safeNext(next));
    });
  }, [code, next]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Arial, sans-serif" }}>
      <p>{error ? `Google sign-in failed: ${error}` : "Signing you in with Google…"}</p>
    </main>
  );
}

function LoadingState() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
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
