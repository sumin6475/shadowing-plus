// talk-feedback.ts — log each self-talk suggestion and Like / Dislike / Not sure.
import { supabase } from "./supabase";
import type { TalkFocus } from "./talk-focus";
import type { TalkMoment } from "../types/api";

export type SuggestionSlot = "want" | "example";
export type SuggestionVerdict = "like" | "dislike" | "unsure";

export function suggestionKey(momentIndex: number, slot: SuggestionSlot): string {
  return `${momentIndex}:${slot}`;
}

/** Insert one row per shown suggestion. Returns id keyed by `${index}:${slot}`. */
export async function logTalkSuggestions(input: {
  moments: TalkMoment[];
  focus: TalkFocus;
  talkSessionId?: string | null;
  storyId?: string | null;
  model?: string;
}): Promise<Record<string, string>> {
  const rows = input.moments.flatMap((moment, momentIndex) => {
    const want = {
      talk_session_id: input.talkSessionId ?? null,
      story_id: input.storyId ?? null,
      focus: input.focus,
      moment_index: momentIndex,
      moment_label: moment.label,
      slot: "want" as const,
      said: moment.said,
      suggestion: moment.want,
      why: moment.why?.trim() || null,
      source: moment.source,
      phrase_item_id: moment.phraseItemId,
      model: input.model ?? "gpt-4o-mini",
    };
    const example = moment.example?.trim()
      ? {
          ...want,
          slot: "example" as const,
          suggestion: moment.example.trim(),
          why: moment.exampleWhy?.trim() || null,
          source: "generated" as const,
          phrase_item_id: null,
        }
      : null;
    return example ? [want, example] : [want];
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

export async function rateTalkSuggestion(id: string, verdict: SuggestionVerdict): Promise<void> {
  const { error } = await supabase
    .from("talk_suggestion_feedback")
    .update({ verdict, verdict_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
