import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { applyVerdict, type SrsState } from "@/lib/srs";
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
      .eq("id", id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const verdict = body.verdict as SrsVerdict | undefined;
  if (!verdict || !VALID_VERDICTS.includes(verdict)) {
    return NextResponse.json({ error: "Invalid verdict" }, { status: 400 });
  }

  const { data: row, error } = await supabaseAdmin()
    .from("bookmarks")
    .select("ease_factor, interval_days, lapses")
    .eq("id", id)
    .single();
  if (error || !row) {
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
  }

  const state: SrsState = {
    ease_factor: row.ease_factor ?? 2.5,
    interval_days: row.interval_days ?? 0,
    lapses: row.lapses ?? 0,
  };
  const next = applyVerdict(state, verdict);

  const { error: updErr } = await supabaseAdmin()
    .from("bookmarks")
    .update({
      ease_factor: next.ease_factor,
      interval_days: next.interval_days,
      due_at: next.due_at,
      last_verdict: next.last_verdict,
      last_reviewed_at: next.last_reviewed_at,
      lapses: next.lapses,
    })
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: next });
}
