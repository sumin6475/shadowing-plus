// phrases.ts — the Phrase Bank = saved bookmarks (SRS-tracked segments joined
// to their clip), read via the RLS-scoped Supabase client. Mirrors the join the
// web practice page uses. The SRS status is derived from the bookmark's
// interval / due-date / verdict so it maps onto the design's status badges.
import type { Status } from "@/design/data";

import { apiJson } from "./api";
import { supabase } from "./supabase";

export type SrsVerdict = "again" | "good" | "easy";

export interface VerdictState {
  due_at: string;
  interval_days: number;
  ease_factor: number;
  last_verdict: SrsVerdict | null;
  last_reviewed_at: string | null;
  lapses: number;
}

export interface PhraseItem {
  /** bookmark id */
  id: string;
  text: string;
  translation: string | null;
  status: Status;
  /** clip title the phrase was saved from */
  source: string;
  startSec: number;
  endSec: number;
  videoId: string | null;
  memo: string | null;
  createdAt: string;
  dueAt: string;
  intervalDays: number;
  lastReviewedAt: string | null;
}

function isDue(dueAt: string): boolean {
  return new Date(dueAt).getTime() <= Date.now();
}

function deriveStatus(b: {
  last_verdict: string | null;
  due_at: string;
  interval_days: number | null;
}): Status {
  if (!b.last_verdict) return "New";
  if (isDue(b.due_at)) return "Needs refresh";
  const iv = b.interval_days ?? 0;
  if (iv >= 21) return "Ready to use";
  if (iv >= 3) return "Practicing";
  return "Recognizing";
}

// The nested select returns to-one relations as objects, but supabase-js can
// hand back a single-element array for some shapes — normalise either way.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** All saved phrases, newest first. */
export async function fetchBookmarks(): Promise<PhraseItem[]> {
  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      "id, memo, created_at, due_at, interval_days, last_verdict, last_reviewed_at, segment:segments!inner(id, text, translation, start_time, end_time, video:videos!inner(id, title))",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((b) => {
    const seg = one(b.segment as Record<string, unknown> | Record<string, unknown>[] | null);
    const vid = seg ? one(seg.video as Record<string, unknown> | Record<string, unknown>[] | null) : null;
    return {
      id: b.id as string,
      text: (seg?.text as string) ?? "",
      translation: (seg?.translation as string | null) ?? null,
      status: deriveStatus({
        last_verdict: b.last_verdict as string | null,
        due_at: b.due_at as string,
        interval_days: b.interval_days as number | null,
      }),
      source: (vid?.title as string) ?? "Saved clip",
      startSec: (seg?.start_time as number) ?? 0,
      endSec: (seg?.end_time as number) ?? (seg?.start_time as number) ?? 0,
      videoId: (vid?.id as string) ?? null,
      memo: (b.memo as string | null) ?? null,
      createdAt: b.created_at as string,
      dueAt: b.due_at as string,
      intervalDays: (b.interval_days as number) ?? 0,
      lastReviewedAt: (b.last_reviewed_at as string | null) ?? null,
    } satisfies PhraseItem;
  });
}

export function phraseIsDue(p: PhraseItem): boolean {
  return isDue(p.dueAt);
}

/**
 * Save a transcript segment as a bookmark (RLS-scoped, owner filled in by the
 * DB — same as the web player's client insert). Idempotent: if the segment is
 * already bookmarked we report "already" instead of creating a duplicate.
 */
export async function saveBookmark(segmentId: string, memo?: string | null): Promise<"saved" | "already"> {
  const { data: existing, error: selErr } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("segment_id", segmentId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (existing) return "already";

  const trimmed = memo?.trim();
  const { error } = await supabase.from("bookmarks").insert({ segment_id: segmentId, memo: trimmed ? trimmed : null });
  if (error) throw new Error(error.message);
  return "saved";
}

/** Update a bookmark's note (RLS-scoped). Empty string clears it. */
export async function updateMemo(bookmarkId: string, memo: string): Promise<void> {
  const trimmed = memo.trim();
  const { error } = await supabase.from("bookmarks").update({ memo: trimmed ? trimmed : null }).eq("id", bookmarkId);
  if (error) throw new Error(error.message);
}

/** Case/space-fold a phrase so dedup ignores incidental spacing. Copied by hand
 *  from web/src/lib/phrases.ts (normalizePhrase) — keep in sync. */
function normalizePhrase(value: string): string {
  return value.toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}

/**
 * Save a phrase captured from a Speak session moment into the Phrase Bank
 * (`phrase_items`). Mirrors the web `saveManualPhrase` cold-start path: there's
 * no source media, so `segment_id`/`video_id` stay NULL and `status` is 'ready'.
 * The AI suggestion the learner just saw becomes the phrase (`text`) and its
 * example becomes the `usage_note`; we don't fabricate a Korean meaning. Deduped
 * against the user's other segmentless phrases by normalized text. RLS needs an
 * explicit `user_id` (phrase_items has no auth.uid() default), read from the
 * session. Returns "already" if an identical phrase is already banked.
 */
export async function createSpeakPhrase(input: {
  text: string;
  example?: string | null;
  storyId?: string | null;
  said?: string | null;
}): Promise<"saved" | "already"> {
  const text = input.text.replace(/\s+/g, " ").trim().slice(0, 240);
  if (!text) throw new Error("Nothing to save.");
  const normalized = normalizePhrase(text);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("You’re signed out.");

  // Dedup against this user's other segmentless (manual/speak) phrases. The
  // table's UNIQUE (user_id, segment_id, normalized_text) treats NULL segment_ids
  // as distinct, so we check explicitly.
  const { data: existing, error: selErr } = await supabase
    .from("phrase_items")
    .select("id")
    .eq("user_id", userId)
    .is("segment_id", null)
    .eq("normalized_text", normalized)
    .limit(1);
  if (selErr) throw new Error(selErr.message);
  if (existing && existing.length > 0) return "already";

  const note = input.example?.replace(/\s+/g, " ").trim().slice(0, 500) || null;
  const { error } = await supabase.from("phrase_items").insert({
    user_id: userId,
    text,
    normalized_text: normalized,
    usage_note: note,
    source_context: { source: "speak", story_id: input.storyId ?? null, said: input.said ?? null },
    status: "ready",
  });
  if (error) throw new Error(error.message);
  return "saved";
}

/**
 * Submit an SM-2 review verdict for a bookmark via the web API (POST
 * /api/bookmarks/[id]/verdict). The server applies the SRS update and returns
 * the new state (due date, interval, …). Returns null if the state is absent.
 */
export async function submitVerdict(bookmarkId: string, verdict: SrsVerdict): Promise<VerdictState | null> {
  const res = await apiJson<{ ok: boolean; state?: VerdictState }>(`/api/bookmarks/${bookmarkId}/verdict`, {
    method: "POST",
    body: JSON.stringify({ verdict }),
  });
  return res.state ?? null;
}

/** ISO timestamp → "today" / "yesterday" / "N days ago" / "N weeks ago". */
export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

/** ISO due date → "due now" / "in N days" for the next-review hint. */
export function dueHint(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "due now";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

/** Saves per day for the last 7 days (oldest→today), for the Today bar chart. */
export function weeklyCounts(createdAts: string[]): { label: string; count: number }[] {
  const DOW = ["S", "M", "T", "W", "T", "F", "S"];
  const now = new Date();
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    return { key: d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(), label: DOW[d.getDay()], count: 0 };
  });
  for (const iso of createdAts) {
    const d = new Date(iso);
    const key = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
    const b = buckets.find((x) => x.key === key);
    if (b) b.count += 1;
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}

/** Real cumulative-over-time counts for the bank chart (N sample points). */
export function cumulativeSeries(createdAts: string[], n = 15): { points: number[]; max: number } {
  const total = createdAts.length;
  if (total === 0) return { points: [0, 0], max: 1 };
  const times = createdAts.map((t) => new Date(t).getTime()).sort((a, b) => a - b);
  const t0 = times[0];
  const t1 = Date.now();
  if (t1 <= t0) return { points: [total, total], max: total };
  const points = Array.from({ length: n }, (_, k) => {
    const cutoff = t0 + ((k + 1) / n) * (t1 - t0);
    return times.filter((t) => t <= cutoff).length;
  });
  return { points, max: total };
}
