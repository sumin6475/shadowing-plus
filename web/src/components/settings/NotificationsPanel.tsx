"use client";

import { useCallback, useEffect, useState } from "react";

// "Connect Telegram" — replaces the v0 setup runbook's manual SQL insert.
// Flow: POST mints a one-time token + t.me deep link, we open it in a new tab,
// then poll GET until the webhook (which handles "/start <token>") reports the
// connection as live. See web/src/app/api/bot/connect/route.ts.

type Status = "loading" | "disconnected" | "connecting" | "connected" | "error";

const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // matches the token TTL server-side

export default function NotificationsPanel() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/bot/connect");
      if (!res.ok) throw new Error("Failed to load status");
      const data = (await res.json()) as { connected: boolean };
      setStatus(data.connected ? "connected" : "disconnected");
    } catch {
      setStatus("error");
      setErrorMsg("Couldn't load your notification settings.");
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // While "connecting", poll for the webhook to have completed the handshake.
  useEffect(() => {
    if (status !== "connecting") return;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    const interval = window.setInterval(async () => {
      if (Date.now() > deadline) {
        window.clearInterval(interval);
        setStatus("disconnected");
        setErrorMsg("Connection timed out — try again.");
        return;
      }
      const res = await fetch("/api/bot/connect");
      if (!res.ok) return;
      const data = (await res.json()) as { connected: boolean };
      if (data.connected) {
        window.clearInterval(interval);
        setStatus("connected");
      }
    }, POLL_MS);
    return () => window.clearInterval(interval);
  }, [status]);

  async function connect() {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/bot/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start connection");
      window.open(data.deepLink as string, "_blank", "noopener,noreferrer");
      setStatus("connecting");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Failed to start connection");
    }
  }

  async function disconnect() {
    setErrorMsg(null);
    const prev = status;
    setStatus("loading");
    try {
      const res = await fetch("/api/bot/connect", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setStatus("disconnected");
    } catch {
      setStatus(prev);
      setErrorMsg("Failed to disconnect — try again.");
    }
  }

  return (
    <div className="set-panel">
      <div className="set-field">
        <div className="set-field-label">Daily review via Telegram</div>
        <p className="set-field-help">
          Get your due bookmarks sent to Telegram once a day, with buttons to
          grade each one — no need to open the app.
        </p>

        {status === "loading" && <p className="set-note">Loading…</p>}

        {status === "disconnected" && (
          <button type="button" className="set-btn" onClick={connect}>
            Connect Telegram
          </button>
        )}

        {status === "connecting" && (
          <>
            <p className="set-note">
              Opened Telegram — tap <strong>Start</strong> in the chat to finish
              connecting. This updates automatically.
            </p>
            <button type="button" className="set-btn" disabled>
              Waiting for Telegram…
            </button>
          </>
        )}

        {status === "connected" && (
          <>
            <p className="set-saved">✓ Connected</p>
            <button type="button" className="set-danger-btn" onClick={disconnect}>
              Disconnect
            </button>
          </>
        )}

        {status === "error" && (
          <button type="button" className="set-btn" onClick={connect}>
            Try again
          </button>
        )}

        {errorMsg && <p className="set-field-help">{errorMsg}</p>}
      </div>
    </div>
  );
}
