import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDueReviewCards } from "@/lib/bot/review-data";
import { getAdapter, type ChannelName } from "@/lib/bot/get-adapter";

// Daily Review-bot trigger. Vercel Cron hits this (see web/vercel.json). For
// each enabled user, resolve today's due cards and send them via their channel.
// CRON_SECRET-guarded like the reaper route.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

interface SettingsRow {
  user_id: string;
  channel: ChannelName | "none";
  channel_user_ref: string | null;
  batch_size: number;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = appBaseUrl();
  const now = new Date();

  const { data, error } = await supabaseAdmin()
    .from("review_settings")
    .select("user_id, channel, channel_user_ref, batch_size")
    .eq("enabled", true)
    .neq("channel", "none");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as SettingsRow[];
  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const s of rows) {
    if (s.channel === "none" || !s.channel_user_ref) {
      skipped++;
      continue;
    }
    try {
      const cards = await getDueReviewCards(
        s.user_id,
        base,
        s.batch_size,
        s.channel,
        s.channel_user_ref,
        now,
      );
      if (cards.length === 0) {
        skipped++; // nothing due — don't send an empty ping
        continue;
      }
      const adapter = getAdapter(s.channel);
      await adapter.sendReviewBatch(s.channel_user_ref, cards);
      sent++;
    } catch (e) {
      // One user's failure must not stop the rest.
      failures.push(`${s.user_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, failures });
}
