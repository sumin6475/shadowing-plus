"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import "./feedback.css";

// Beta feedback channel. A signed-in user types free-text feedback; it's
// inserted into the `feedback` table (migration 014) via the RLS-scoped client
// (user_id fills from auth.uid()). `path` captures the current page for context.
export default function FeedbackModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape. The parent mounts this only while open, so state starts
  // fresh each time and needs no reset effect.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    const msg = message.trim();
    if (!msg) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("feedback").insert({
      message: msg,
      path: typeof window !== "undefined" ? window.location.pathname : null,
    });
    setBusy(false);
    if (error) {
      setError("Couldn't send — please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="fb-backdrop" onClick={onClose}>
      <div
        className="fb-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Send feedback"
      >
        {sent ? (
          <div className="fb-done">
            <div className="fb-title">Thanks for the feedback 🙏</div>
            <p className="fb-sub">
              It goes straight to the person building Shadowing+.
            </p>
            <div className="fb-actions">
              <button type="button" className="fb-send" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="fb-title">Send feedback</div>
            <p className="fb-sub">
              Bugs, ideas, anything — it shapes what gets built next.
            </p>
            <textarea
              className="fb-text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's working, what's not…"
              rows={5}
              autoFocus
            />
            {error && <p className="fb-error">{error}</p>}
            <div className="fb-actions">
              <button type="button" className="fb-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="fb-send"
                onClick={submit}
                disabled={busy || !message.trim()}
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
