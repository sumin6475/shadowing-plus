"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SettingsModal from "./SettingsModal";
import "./profile-menu.css";

// Sidebar-foot identity: an avatar+email button that opens a dropdown (email,
// Settings, Sign out). "Settings" opens the modal; "Sign out" clears the
// session. This replaces the old Settings link + inline sign-out button.
export default function ProfileMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const initial = (email?.trim()?.[0] ?? "?").toUpperCase();

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="pm-root" ref={rootRef}>
      <button
        type="button"
        className="pm-trigger"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="pm-avatar">{initial}</span>
        <span className="pm-email">{email ?? "Account"}</span>
        <span className="pm-chevron">⌄</span>
      </button>

      {menuOpen && (
        <div className="pm-menu" role="menu">
          <div className="pm-menu-email">{email ?? "Signed in"}</div>
          <div className="pm-menu-sep" />
          <button
            type="button"
            className="pm-menu-item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setModalOpen(true);
            }}
          >
            Settings
          </button>
          <button
            type="button"
            className="pm-menu-item pm-menu-danger"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}

      <SettingsModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
