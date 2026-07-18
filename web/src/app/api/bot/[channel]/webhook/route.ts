import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAdapter, type ChannelName } from "@/lib/bot/get-adapter";
import { gradeBookmark } from "@/lib/bot/grade-bookmark";

// Inbound webhook for the Review bot (button taps + text). Channel-agnostic:
// the [channel] param picks the adapter, which verifies the request and
// normalizes the payload. Grading maps the channel ref → app user via
// review_settings (never trust the payload for identity).
export const dynamic = "force-dynamic";

function isChannel(v: string): v is ChannelName {
  return v === "telegram" || v === "slack";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel } = await params;
  if (!isChannel(channel)) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 404 });
  }

  const adapter = getAdapter(channel);
  const rawBody = await req.text();

  // 1. Authenticate the request came from the channel.
  if (!(await adapter.verifySignature(req, rawBody))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Normalize the payload.
  const event = await adapter.parseInbound(rawBody);
  if (event.kind === "ignore") {
    return NextResponse.json({ ok: true });
  }

  if (event.kind === "connect") {
    // Complete the "Connect Telegram" handshake: find the pending row this
    // token was minted for, attach the tapper's chat id, and burn the token
    // (one-time use — see migration 010).
    const db = supabaseAdmin();
    const { data: pending } = await db
      .from("review_settings")
      .select("user_id, connect_token_expires_at")
      .eq("connect_token", event.token)
      .maybeSingle();

    if (
      pending &&
      pending.connect_token_expires_at &&
      new Date(pending.connect_token_expires_at as string) > new Date()
    ) {
      await db
        .from("review_settings")
        .update({
          channel,
          channel_user_ref: event.userRef,
          enabled: true,
          connect_token: null,
          connect_token_expires_at: null,
        })
        .eq("user_id", pending.user_id as string);
      try {
        await adapter.acknowledgeConnect?.(event.userRef);
      } catch {
        /* ignore — connection already persisted */
      }
    }
    return NextResponse.json({ ok: true });
  }

  // 3. Resolve the app user from the CHANNEL ref (not the payload) so a tap can
  //    only grade the bookmarks of whoever owns that channel connection.
  const { data: settings } = await supabaseAdmin()
    .from("review_settings")
    .select("user_id, channel")
    .eq("channel", channel)
    .eq("channel_user_ref", event.userRef)
    .maybeSingle();

  if (!settings) {
    // Unknown sender — ack so the channel doesn't retry, but do nothing.
    return NextResponse.json({ ok: true });
  }
  const userId = settings.user_id as string;

  if (event.kind === "verdict") {
    const result = await gradeBookmark(event.bookmarkId, userId, event.verdict);
    if (result.ok) {
      // Best-effort UI confirmation; never blocks the response.
      try {
        await adapter.acknowledgeGrade(
          event.userRef,
          "", // v0: no stored message ref; adapter no-ops gracefully
          event.bookmarkId,
          event.verdict,
          event.ackRef,
        );
      } catch {
        /* ignore */
      }
    }
    return NextResponse.json({ ok: true });
  }

  // event.kind === "text": free-text inbound (island/miss capture) is a later
  // feature — acknowledge for now so the bot doesn't error.
  return NextResponse.json({ ok: true });
}
