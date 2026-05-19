"use client";

import { useEffect, useState } from "react";

const QUERY = "(max-width: 768px)";

// SSR-safe matchMedia hook. Returns false on the server and during the first
// client render to match desktop, then flips to the real value after mount.
// CSS handles the visual layout switch via @media — this hook is only used
// to gate effects (keyboard listeners, observers, realtime subscriptions)
// to the active shell so we don't double up work in both shells.
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(QUERY);
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  return isMobile;
}
