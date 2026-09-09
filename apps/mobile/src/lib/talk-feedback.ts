// talk-feedback.ts — log each self-talk suggestion and Like / Dislike / Not sure.
import { supabase } from "./supabase";
import type { TalkFocus } from "./talk-focus";
import type { TalkMoment } from "../types/api";

export type SuggestionSlot = "want";
export type SuggestionVerdict = "like" | "dislike" | "unsure";

export function suggestionKey(momentIndex: number, slot: SuggestionSlot): string {
  return `${momentIndex}:${slot}`;
}

/** Insert the single shown suggestion. Returns id keyed by `${index}:want`. */
export async function logTalkSuggestions(input: {
  moments: TalkMoment[];
  focus: TalkFocus;
  talkSessionId?: string | null;
  storyId?: string | null;
  model?: string;
}): Promise<Record<string, string>> {
  const rows = input.moments.map((moment, momentIndex) => {
    const structuredWhy = [moment.action?.trim(), moment.explanation?.trim()].filter(Boolean).join(" ");
    return {
      talk_session_id: input.talkSessionId ?? null,
      story_id: input.storyId ?? null,
      focus: input.focus,
      moment_index: momentIndex,
      moment_label: moment.label,
      slot: "want" as const,
      said: moment.said,
      suggestion: moment.want,
      why: structuredWhy || moment.why?.trim() || null,
      source: moment.source,
      phrase_item_id: moment.phraseItemId,
      model: input.model ?? "gpt-4o-mini",
      // Structured coaching (migration 027). Legacy rows keep null and the
      // client falls back to `why`.
      diagnosis_tag: moment.diagnosisTag?.trim() || null,
      action: moment.action?.trim() || null,
      explanation: moment.explanation?.trim() || null,
      schema_version: 2,
    };
  });
  if (!rows.length) return {};
  const { data, error } = await supabase.from("talk_suggestion_feedback").insert(rows).select("id, moment_index, slot");
  if (error) throw new Error(error.message);
  const ids: Record<string, string> = {};
  for (const row of data ?? []) {
    ids[suggestionKey(row.moment_index as number, row.slot as SuggestionSlot)] = row.id as string;
  }
  return ids;
}

export interface TalkFeedbackRecord {
  id: string;
  said: string;
  want: string;
  why: string | null;
  focus: string | null;
  momentLabel: string | null;
  diagnosisTag: string | null;
  action: string | null;
  explanation: string | null;
}

type FeedbackRowLoose = Record<string, unknown>;

/** Load one saved coaching feedback row by its stable id (historical detail).
 *  Tries the structured columns first; falls back to the legacy select when the
 *  linked database has not applied migration 027 yet. */
export async function fetchTalkFeedbackById(id: string): Promise<TalkFeedbackRecord | null> {
  const selectStructured = "id, said, suggestion, why, focus, moment_label, diagnosis_tag, action, explanation";
  const selectLegacy = "id, said, suggestion, why, focus, moment_label";

  const first = await supabase.from("talk_suggestion_feedback").select(selectStructured).eq("id", id).limit(1);
  let rows: { data: FeedbackRowLoose[] | null; error: { message: string } | null };
  if (first.error && /diagnosis_tag|action|explanation/i.test(first.error.message)) {
    const second = await supabase.from("talk_suggestion_feedback").select(selectLegacy).eq("id", id).limit(1);
    rows = second as unknown as { data: FeedbackRowLoose[] | null; error: { message: string } | null };
  } else {
    rows = first as unknown as { data: FeedbackRowLoose[] | null; error: { message: string } | null };
  }
  if (rows.error) throw new Error(rows.error.message);
  const row = (rows.data ?? [])[0];
  if (!row) return null;
  return {
    id: row.id as string,
    said: (row.said as string) ?? "",
    want: (row.suggestion as string) ?? "",
    why: (row.why as string | null) ?? null,
    focus: (row.focus as string | null) ?? null,
    momentLabel: (row.moment_label as string | null) ?? null,
    diagnosisTag: (row.diagnosis_tag as string | null) ?? null,
    action: (row.action as string | null) ?? null,
    explanation: (row.explanation as string | null) ?? null,
  };
}

export async function rateTalkSuggestion(
  id: string,
  verdict: SuggestionVerdict,
  note?: string | null,
): Promise<void> {
  const verdictAt = new Date().toISOString();
  const patch: { verdict: SuggestionVerdict; verdict_at: string; verdict_note?: string | null } = {
    verdict,
    verdict_at: verdictAt,
  };
  if (note !== undefined) patch.verdict_note = note || null;
  const { error } = await supabase.from("talk_suggestion_feedback").update(patch).eq("id", id);
  if (error && /verdict_note/i.test(error.message)) {
    const retry = await supabase
      .from("talk_suggestion_feedback")
      .update({ verdict, verdict_at: verdictAt })
      .eq("id", id);
    if (retry.error) throw new Error(retry.error.message);
    return;
  }
  if (error) throw new Error(error.message);
}
