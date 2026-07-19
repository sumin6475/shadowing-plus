"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Signs the user out (clears the @supabase/ssr session cookie) and sends them
 * to /login. `className` lets each placement match its surrounding chrome;
 * `label` accepts a node so placements can include an icon.
 */
export default function LogoutButton({
  className = "btn ghost",
  label = "Sign out",
}: {
  className?: string;
  label?: ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    await supabase.auth.signOut();
    // Refresh so the proxy re-evaluates with no session, then land on /login.
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleLogout}
      disabled={busy}
    >
      {busy ? "Signing out…" : label}
    </button>
  );
}
