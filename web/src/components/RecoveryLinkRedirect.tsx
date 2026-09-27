"use client";

import { useEffect } from "react";

// Supabase falls back to the Site URL (`/`) when a reset link's redirect isn't
// allow-listed, or when the reset is sent from the dashboard. Those links carry
// their tokens in the hash (#access_token=…&type=recovery), which the proxy
// can't see — so forward them to the reset form from the client, keeping the
// hash intact.
export default function RecoveryLinkRedirect() {
  useEffect(() => {
    const { hash, pathname } = window.location;
    if (pathname === "/auth/reset-password") return;
    if (!/[#&]type=recovery(&|$)/.test(hash)) return;
    window.location.replace(`/auth/reset-password${hash}`);
  }, []);
  return null;
}
