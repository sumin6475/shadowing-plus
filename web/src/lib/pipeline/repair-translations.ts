import type { SupabaseClient } from "@supabase/supabase-js";
import { languagePairForJob } from "./languages";
import { translateLines } from "./stage_4_translate";
import {
  packTranslateBatches,
  translationNeedsRetry,
} from "./translate-map";

const REPAIR_BATCH = 10;
const REPAIR_CHAR_BUDGET = 2800;

export type TranslationUpdate = { id: string; translation: string };
export type RepairMode = "missing" | "all";

/**
 * Re-translate segments on an already-persisted clip.
 * `missing` (default) only fills empty / failed / far-too-short lines.
 * `all` overwrites every line so a shifted batch can be realigned.
 * Ownership is `video.user_id === userId`.
 */
export async function repairVideoTranslations(
  db: SupabaseClient,
  userId: string,
  videoId: string,
  mode: RepairMode = "missing",
): Promise<TranslationUpdate[]> {
  const { data: video, error: videoError } = await db
    .from("videos")
    .select("id, title, user_id, source_lang, target_lang")
    .eq("id", videoId)
    .maybeSingle();
  if (videoError) throw videoError;
  if (!video || video.user_id !== userId) return [];

  const { data: rows, error: segError } = await db
    .from("segments")
    .select("id, index, text, translation")
    .eq("video_id", videoId)
    .order("index");
  if (segError) throw segError;
  const segments = rows ?? [];
  const target =
    mode === "all"
      ? segments
      : segments.filter((s) => translationNeedsRetry(s.text, s.translation));
  if (target.length === 0) return [];

  const pair = languagePairForJob(video);
  const packs = packTranslateBatches(
    target.map((s) => s.text.length),
    REPAIR_BATCH,
    REPAIR_CHAR_BUDGET,
  );
  const updates: TranslationUpdate[] = [];

  for (const { start, count } of packs) {
    const batch = target.slice(start, start + count);
    const firstIdx = segments.findIndex((s) => s.id === batch[0].id);
    const lastIdx = segments.findIndex((s) => s.id === batch[batch.length - 1].id);
    const translations = await translateLines(
      batch,
      pair,
      { jobId: null, userId, label: video.title ?? null },
      {
        before: segments
          .slice(Math.max(0, firstIdx - 2), Math.max(0, firstIdx))
          .map((s) => s.text)
          .join(" "),
        after: segments
          .slice(lastIdx + 1, lastIdx + 3)
          .map((s) => s.text)
          .join(" "),
      },
    );
    for (let i = 0; i < batch.length; i++) {
      const next = translations[i];
      if (translationNeedsRetry(batch[i].text, next)) continue;
      const { error } = await db
        .from("segments")
        .update({ translation: next })
        .eq("id", batch[i].id)
        .eq("video_id", videoId);
      if (error) throw error;
      updates.push({ id: batch[i].id, translation: next });
    }
  }
  return updates;
}
