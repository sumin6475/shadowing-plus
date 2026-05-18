import { getJson, jobKey, putJson } from "@/lib/r2";
import { updateJobProgress } from "./jobs";
import {
  mergeDuplicates,
  dropEmpty,
  fixTiming,
  regroupSentences,
  removeHallucinations,
} from "./postprocess";
import type { PipelineSegment } from "@/lib/types";

interface RawTranscript {
  audio_duration_secs: number | null;
  segments: PipelineSegment[];
}

interface PostprocessedTranscript {
  audio_duration_secs: number | null;
  segments: PipelineSegment[];
}

/**
 * Stage 3: Pure post-processing.
 * Reads raw_transcript.json → applies merge_duplicates → drop_empty
 * → fix_timing → regroup_sentences → remove_hallucinations → writes segments.json.
 */
export async function stage3Postprocess(jobId: string): Promise<void> {
  await updateJobProgress(jobId, "postprocess", 0);
  const raw = await getJson<RawTranscript>(jobKey(jobId, "raw_transcript.json"));

  const audioDuration = raw.audio_duration_secs ?? Number.POSITIVE_INFINITY;
  let segments = raw.segments;

  segments = mergeDuplicates(segments);
  await updateJobProgress(jobId, "postprocess", 20);

  segments = dropEmpty(segments);
  await updateJobProgress(jobId, "postprocess", 35);

  segments = fixTiming(segments, audioDuration);
  await updateJobProgress(jobId, "postprocess", 55);

  segments = regroupSentences(segments);
  await updateJobProgress(jobId, "postprocess", 75);

  segments = removeHallucinations(segments);
  await updateJobProgress(jobId, "postprocess", 95);

  const out: PostprocessedTranscript = {
    audio_duration_secs: raw.audio_duration_secs,
    segments,
  };
  await putJson(jobKey(jobId, "segments.json"), out);
  await updateJobProgress(jobId, "postprocess", 100);
}
