import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUserId } from "@/lib/supabase-server";

// Backs the settings modal's "Connect Telegram" flow (replaces the v0 setup
// runbook's manual SQL insert). GET reports whether the signed-in user already
// has a channel connected; POST mints a short-lived one-time token and returns
// the t.me deep link to open; DELETE disconnects (channel -> 'none').
//
// The token itself is completed by the Telegram webhook's "/start <token>"
// handling (web/src/lib/bot/telegram.ts + the webhook route), which fills in
// channel_user_ref once the user taps Start.
export const dynamic = "force-dynamic";

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes — plenty for a tab-switch to Telegram

interface SettingsRow {
  channel: "none" | "slack" | "telegram";
  channel_user_ref: string | null;
  enabled: boolean;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from("review_settings")
    .select("channel, channel_user_ref, enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as SettingsRow | null;
  return NextResponse.json({
    connected: Boolean(row?.channel === "telegram" && row.channel_user_ref),
    enabled: row?.enabled ?? false,
  });
}

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_USERNAME is not configured" },
      { status: 500 },
    );
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  // Upsert on user_id (the table's unique index) so re-clicking "Connect"
  // just replaces the pending token rather than erroring.
  const { error } = await supabaseAdmin()
    .from("review_settings")
    .upsert(
      { user_id: userId, connect_token: token, connect_token_expires_at: expiresAt },
      { onConflict: "user_id" },
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deepLink: `https://t.me/${botUsername}?start=${token}`,
    expiresAt,
  });
}

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseAdmin()
    .from("review_settings")
    .update({
      channel: "none",
      channel_user_ref: null,
      enabled: false,
      connect_token: null,
      connect_token_expires_at: null,
    })
    .eq("user_id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
