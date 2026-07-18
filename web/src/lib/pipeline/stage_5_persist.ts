import { getJson, jobKey } from "@/lib/r2";
import { audioKeyFor, getJob, setJobReady, updateJobProgress } from "./jobs";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PipelineSegment } from "@/lib/types";

interface TranslatedTranscript {
  audio_duration_secs: number | null;
  segments: PipelineSegment[];
}

/**
 * Stage 5: Persist to Supabase.
 * Creates the videos row + bulk-inserts segments + marks the job as ready.
 */
export async function stage5Persist(jobId: string): Promise<string> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  await updateJobProgress(jobId, "persist", 0);

  const translated = await getJson<TranslatedTranscript>(
    jobKey(jobId, "segments_translated.json"),
  );

  const isYoutube = job.source_key.startsWith("youtube://");
  const ytVideoId = isYoutube ? job.source_key.replace("youtube://", "") : "";

  // Privacy: R2-backed media is stored as a bare object KEY, not a permanent
  // public URL. The player resolves keys → short-lived signed URLs at read time
  // (see /api/media/[videoId]), so uploads are never world-readable. YouTube
  // sources stay as external URLs (public by nature) and are passed through.
  const audioUrl = isYoutube ? job.source_key : audioKeyFor(job);
  const videoUrl = isYoutube
    ? `https://www.youtube.com/watch?v=${ytVideoId}`
    : (job.media_type === "video" ? job.source_key : null);

  const db = supabaseAdmin();

  const { data: videoRow, error: videoErr } = await db
    .from("videos")
    .insert({
      title: job.title,
      duration: translated.audio_duration_secs,
      audio_url: audioUrl,
      video_url: videoUrl,
      media_type: job.media_type,
      // Owner carried from the job. The service key bypasses RLS, so this must
      // be set explicitly (DEFAULT auth.uid() won't fire without a session).
      // Segments inherit ownership via a traversal RLS policy over videos.
      user_id: job.user_id,
    })
    .select()
    .single();
  if (videoErr) throw videoErr;
  const videoId = videoRow.id as string;
  await updateJobProgress(jobId, "persist", 30);

  const rows = translated.segments.map((s, i) => ({
    video_id: videoId,
    index: s.index ?? i,
    start_time: s.start,
    end_time: s.end,
    text: s.text,
    translation: s.translation ?? null,
    words: s.words ?? null,
  }));

  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await db.from("segments").insert(slice);
    if (error) throw error;
    const pct = 30 + Math.round((Math.min(i + BATCH, rows.length) / rows.length) * 65);
    await updateJobProgress(jobId, "persist", pct);
  }

  await setJobReady(jobId, videoId);
  return videoId;
}
