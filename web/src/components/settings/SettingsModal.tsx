"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import ProfilePanel from "./ProfilePanel";
import UsagePanel from "./UsagePanel";
import LanguagePanel from "./LanguagePanel";
import NotificationsPanel from "./NotificationsPanel";
import "./settings-modal.css";

type Tab = "profile" | "usage" | "language" | "notifications";

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "usage", label: "Usage" },
  { key: "language", label: "Language" },
  { key: "notifications", label: "Notifications" },
];

export default function SettingsModal({
  open,
  onClose,
  initialTab = "profile",
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [email, setEmail] = useState<string | null>(null);

  // The modal unmounts when closed (returns null below), so this state resets
  // to initialTab on each reopen without an effect.

  // Resolve the signed-in user's email once the modal is open.
  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Portal to <body> so no ancestor stacking context (e.g. the sidebar's
  // `transform`) can trap this fixed overlay behind the page content.
  return createPortal(
    <div className="set-overlay" onClick={onClose} role="presentation">
      <div
        className="set-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="set-nav" aria-label="Settings sections">
          <div className="set-nav-title">Settings</div>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={"set-nav-item" + (tab === t.key ? " active" : "")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="set-body">
          <header className="set-body-head">
            <h2 className="set-body-title">
              {TABS.find((t) => t.key === tab)?.label}
            </h2>
            <button
              type="button"
              className="set-close"
              onClick={onClose}
              aria-label="Close settings"
            >
              ✕
            </button>
          </header>
          <div className="set-body-scroll">
            {tab === "profile" && <ProfilePanel email={email} />}
            {tab === "usage" && <UsagePanel />}
            {tab === "language" && <LanguagePanel />}
            {tab === "notifications" && <NotificationsPanel />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
