import { supabaseAdmin } from "@/lib/supabase-admin";
import { applyVerdict, type SrsNext, type SrsState } from "@/lib/srs";
import type { SrsVerdict } from "@/lib/types";

// Shared grading logic: fetch a bookmark's SRS state (scoped to its owner),
// apply the verdict, and persist. Both the HTTP verdict route and the Review
// bot's webhook call this so the SM-2 update lives in exactly one place
// (ver2.0 phase-0 design §2, decision ②).

export type GradeResult =
  | { ok: true; next: SrsNext }
  | { ok: false; reason: "not_found" | "db_error"; message?: string };

export async function gradeBookmark(
  bookmarkId: string,
  userId: string,
  verdict: SrsVerdict,
  now: Date = new Date(),
): Promise<GradeResult> {
  const db = supabaseAdmin();

  const { data: row, error } = await db
    .from("bookmarks")
    .select("ease_factor, interval_days, lapses")
    .eq("id", bookmarkId)
    .eq("user_id", userId)
    .single();
  if (error || !row) {
    return { ok: false, reason: "not_found" };
  }

  const state: SrsState = {
    ease_factor: row.ease_factor ?? 2.5,
    interval_days: row.interval_days ?? 0,
    lapses: row.lapses ?? 0,
  };
  const next = applyVerdict(state, verdict, now);

  const { error: updErr } = await db
    .from("bookmarks")
    .update({
      ease_factor: next.ease_factor,
      interval_days: next.interval_days,
      due_at: next.due_at,
      last_verdict: next.last_verdict,
      last_reviewed_at: next.last_reviewed_at,
      lapses: next.lapses,
    })
    .eq("id", bookmarkId)
    .eq("user_id", userId);
  if (updErr) {
    return { ok: false, reason: "db_error", message: updErr.message };
  }

  return { ok: true, next };
}
