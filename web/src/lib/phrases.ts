import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordUsage } from "@/lib/usage";

// Shared Phrase Bank logic. Both the founder-only Chrome extension route
// (api/extension/phrases) and the authenticated web player route (api/phrases)
// save an identical `phrase_items` row from an identical selection → they only
// differ in how the caller is authenticated. That auth stays in each route; the
// validation, containment check, dedup, context fetch, insert, and AI
// explanation live here so the two surfaces can never drift apart.

const MODEL = "gpt-4o-mini";

/** Columns returned to any Phrase Bank client. Keep in sync with the UI types. */
export const PHRASE_SELECT_COLUMNS =
  "id, text, kind, meaning_ko, usage_note, start_time, end_time, status, created_at";

export const PHRASE_KINDS = ["word", "phrasal_verb", "pattern", "idiom", "phrase"] as const;
export type PhraseKind = (typeof PHRASE_KINDS)[number];

type SegmentRow = {
  id: string;
  index: number;
  text: string;
  translation: string | null;
  start_time: number;
  end_time: number;
  video: { id: string; title: string; user_id: string } | null;
};

/** Case/space-fold a phrase so containment and dedup ignore incidental spacing. */
export function normalizePhrase(value: string) {
  return value.toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}

/** Coerce untrusted input to a bounded, single-spaced string (empty if not a string). */
export function asPhraseText(value: unknown, limit: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
}

/**
 * True when `phrase` is a non-empty selection that lies within a *single*
 * `subtitle`, ignoring case and incidental spacing. This is the containment
 * guard that keeps a web-player save honest: the learner can only bank text
 * that actually appears in one of their own subtitles, not arbitrary pasted
 * third-party text. Pure so it can be unit-tested independently of the DB.
 */
export function phraseInSubtitle(subtitle: string, phrase: string): boolean {
  const normalized = normalizePhrase(phrase);
  return normalized.length > 0 && normalizePhrase(subtitle).includes(normalized);
}

async function explainPhrase(input: {
  phrase: string;
  context: Pick<SegmentRow, "text" | "translation">[];
  userId: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured.");
  const transcript = input.context
    .map((segment, index) => `${index + 1}. ${segment.text}${segment.translation ? `\n   Korean: ${segment.translation}` : ""}`)
    .join("\n");
  const response = await new OpenAI({ apiKey }).chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [{
      role: "user",
      content: `Explain one English expression for a Korean learner. The learner selected: "${input.phrase}"\n\nIt appears in this local video transcript:\n${transcript}\n\nReturn JSON only:\n{"kind":"word|phrasal_verb|pattern|idiom|phrase","meaning_ko":"natural Korean meaning in this context (one short sentence)","usage_note":"brief English explanation of the nuance or grammar in this context (max 24 words)"}\nDo not give a generic dictionary entry. Use the supplied surrounding context.`,
    }],
  });
  await recordUsage({
    userId: input.userId,
    label: `Phrase: ${input.phrase}`,
    provider: "openai",
    model: MODEL,
    kind: "phrase_explain",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  });
  const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
  const kind = asPhraseText(parsed.kind, 32);
  return {
    kind: (PHRASE_KINDS as readonly string[]).includes(kind) ? kind : "phrase",
    meaning: asPhraseText(parsed.meaning_ko, 500),
    note: asPhraseText(parsed.usage_note, 500),
  };
}

export type SavePhraseOutcome =
  | { ok: true; item: Record<string, unknown>; alreadySaved: boolean }
  | { ok: false; status: number; error: string };

/**
 * Validate a selection against the user's own subtitle, persist it as a
 * `phrase_items` row, and attach a context-aware Korean explanation.
 *
 * `db` MUST be a service-key client (RLS-bypassing): ownership is enforced here
 * by checking `segment.video.user_id === userId`, not by RLS. A failed
 * explanation is non-fatal — the row is saved with `status: 'failed'` so the
 * learner keeps the phrase and the UI can show a retry-later state.
 */
export async function savePhrase(
  db: SupabaseClient,
  userId: string,
  rawSegmentId: unknown,
  rawText: unknown,
): Promise<SavePhraseOutcome> {
  const segmentId = asPhraseText(rawSegmentId, 64);
  const text = asPhraseText(rawText, 240);
  if (!/^[0-9a-f-]{36}$/i.test(segmentId) || !text) {
    return { ok: false, status: 400, error: "Select a phrase from one subtitle." };
  }

  const { data: rawSegment, error: segmentError } = await db
    .from("segments")
    .select("id, index, text, translation, start_time, end_time, video:videos!inner(id, title, user_id)")
    .eq("id", segmentId)
    .maybeSingle();
  const segment = rawSegment as SegmentRow | null;
  if (segmentError) return { ok: false, status: 500, error: segmentError.message };
  if (!segment || segment.video?.user_id !== userId) {
    return { ok: false, status: 404, error: "Subtitle not found." };
  }

  const normalized = normalizePhrase(text);
  if (!phraseInSubtitle(segment.text, text)) {
    return { ok: false, status: 400, error: "The selected phrase must come from one subtitle." };
  }

  const { data: existing, error: existingError } = await db
    .from("phrase_items")
    .select(PHRASE_SELECT_COLUMNS)
    .eq("user_id", userId)
    .eq("segment_id", segment.id)
    .eq("normalized_text", normalized)
    .maybeSingle();
  if (existingError) return { ok: false, status: 500, error: existingError.message };
  if (existing) return { ok: true, item: existing, alreadySaved: true };

  const { data: nearby, error: contextError } = await db
    .from("segments")
    .select("text, translation")
    .eq("video_id", segment.video.id)
    .gte("index", Math.max(0, segment.index - 2))
    .lte("index", segment.index + 2)
    .order("index");
  if (contextError) return { ok: false, status: 500, error: contextError.message };

  const { data: created, error: createError } = await db
    .from("phrase_items")
    .insert({
      user_id: userId,
      video_id: segment.video.id,
      segment_id: segment.id,
      text,
      normalized_text: normalized,
      start_time: segment.start_time,
      end_time: segment.end_time,
      source_context: { source: "own_upload", sentence: segment.text, translation: segment.translation, nearby: nearby ?? [] },
    })
    .select(PHRASE_SELECT_COLUMNS)
    .single();
  if (createError) return { ok: false, status: 500, error: createError.message };

  try {
    const explanation = await explainPhrase({
      phrase: text,
      context: (nearby ?? []) as Pick<SegmentRow, "text" | "translation">[],
      userId,
    });
    const { data: ready, error: updateError } = await db
      .from("phrase_items")
      .update({ kind: explanation.kind, meaning_ko: explanation.meaning, usage_note: explanation.note, status: "ready", updated_at: new Date().toISOString() })
      .eq("id", created.id)
      .select(PHRASE_SELECT_COLUMNS)
      .single();
    if (updateError) throw updateError;
    return { ok: true, item: ready, alreadySaved: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Phrase explanation failed.";
    await db.from("phrase_items").update({ status: "failed", error: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", created.id);
    return { ok: true, item: { ...created, status: "failed" }, alreadySaved: false };
  }
}

/**
 * Cold-start path: persist a learner-typed phrase that has no source media.
 *
 * Unlike `savePhrase`, there is no subtitle to contain-check and no surrounding
 * context to explain, so the row is stored with `segment_id`/`video_id` NULL and
 * `status: 'ready'` using the learner's own optional meaning/usage — we do NOT
 * fabricate an AI "context" the learner never saw. Deduped against the user's
 * other manual (segmentless) rows by normalized text, because the table's UNIQUE
 * (user_id, segment_id, normalized_text) treats NULL segment_ids as distinct.
 *
 * `db` MUST be a service-key client; ownership is the passed `userId`.
 */
export async function saveManualPhrase(
  db: SupabaseClient,
  userId: string,
  rawText: unknown,
  rawMeaning?: unknown,
  rawNote?: unknown,
): Promise<SavePhraseOutcome> {
  const text = asPhraseText(rawText, 240);
  if (!text) return { ok: false, status: 400, error: "Enter a phrase to save." };
  const normalized = normalizePhrase(text);
  const meaning = asPhraseText(rawMeaning, 500);
  const note = asPhraseText(rawNote, 500);

  const { data: existing, error: existingError } = await db
    .from("phrase_items")
    .select(PHRASE_SELECT_COLUMNS)
    .eq("user_id", userId)
    .is("segment_id", null)
    .eq("normalized_text", normalized)
    .limit(1);
  if (existingError) return { ok: false, status: 500, error: existingError.message };
  if (existing && existing.length > 0) return { ok: true, item: existing[0], alreadySaved: true };

  const { data: created, error: createError } = await db
    .from("phrase_items")
    .insert({
      user_id: userId,
      text,
      normalized_text: normalized,
      meaning_ko: meaning || null,
      usage_note: note || null,
      source_context: { source: "manual" },
      status: "ready",
    })
    .select(PHRASE_SELECT_COLUMNS)
    .single();
  if (createError) return { ok: false, status: 500, error: createError.message };
  return { ok: true, item: created, alreadySaved: false };
}
