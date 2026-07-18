import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUserId } from "@/lib/supabase-server";
import { gradeBookmark } from "@/lib/bot/grade-bookmark";
import type { SrsVerdict } from "@/lib/types";

const VALID_VERDICTS: SrsVerdict[] = ["again", "good", "easy"];

interface VerdictBody {
  verdict?: string;
  // Raw state override for undo. When provided, the API skips applyVerdict
  // and writes these fields directly. Used by client-side undo.
  restore?: {
    ease_factor: number;
    interval_days: number;
    lapses: number;
    due_at?: string | null;
    last_verdict?: SrsVerdict | null;
    last_reviewed_at?: string | null;
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as VerdictBody;

  if (body.restore) {
    const r = body.restore;
    const { error: updErr } = await supabaseAdmin()
      .from("bookmarks")
      .update({
        ease_factor: r.ease_factor,
        interval_days: r.interval_days,
        lapses: r.lapses,
        due_at: r.due_at ?? null,
        last_verdict: r.last_verdict ?? null,
        last_reviewed_at: r.last_reviewed_at ?? null,
      })
      .eq("id", id)
      .eq("user_id", userId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const verdict = body.verdict as SrsVerdict | undefined;
  if (!verdict || !VALID_VERDICTS.includes(verdict)) {
    return NextResponse.json({ error: "Invalid verdict" }, { status: 400 });
  }

  // Shared with the Review bot's webhook (lib/bot/grade-bookmark.ts).
  const result = await gradeBookmark(id, userId, verdict);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }
    return NextResponse.json({ error: result.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: result.next });
}
