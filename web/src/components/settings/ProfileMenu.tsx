"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ChevronDownIcon,
  GearIcon,
  SignOutIcon,
} from "@/components/home/Icons";
import SettingsModal from "./SettingsModal";
import FeedbackModal from "./FeedbackModal";
import "./profile-menu.css";

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 9.5a2 2 0 0 1-2 2H5l-3 2.5v-9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// Sidebar-foot identity: an avatar+email button that opens a dropdown (email,
// Settings, Sign out). "Settings" opens the modal; "Sign out" clears the
// session. This replaces the old Settings link + inline sign-out button.
export default function ProfileMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
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
        className={"pm-trigger" + (menuOpen ? " open" : "")}
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="pm-avatar" aria-hidden="true">{initial}</span>
        <span className="pm-email" title={email ?? undefined}>
          {email ?? "Account"}
        </span>
        <span
          className={"pm-chevron" + (menuOpen ? " up" : "")}
          aria-hidden="true"
        >
          <ChevronDownIcon />
        </span>
      </button>

      {menuOpen && (
        <div className="pm-menu" role="menu">
          <div className="pm-menu-email" title={email ?? undefined}>
            {email ?? "Signed in"}
          </div>
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
            <span className="pm-menu-ic">
              <GearIcon />
            </span>
            Settings
          </button>
          <button
            type="button"
            className="pm-menu-item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setFeedbackOpen(true);
            }}
          >
            <span className="pm-menu-ic">
              <MessageIcon />
            </span>
            Send feedback
          </button>
          <button
            type="button"
            className="pm-menu-item pm-menu-danger"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
          >
            <span className="pm-menu-ic">
              <SignOutIcon />
            </span>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}

      <SettingsModal open={modalOpen} onClose={() => setModalOpen(false)} />
      {feedbackOpen && (
        <FeedbackModal onClose={() => setFeedbackOpen(false)} />
      )}
    </div>
  );
}
