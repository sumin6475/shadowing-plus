// library.ts — real Library data. Ready clips come from the `videos` table via
// the RLS-scoped Supabase client (rows are auto-filtered to the signed-in user
// by auth.uid()); in-flight uploads come from the web API's /api/jobs. If the
// jobs API is unreachable we still show the ready clips.
import type { Job, MediaType } from "@/types/api";

import { fetchJobs } from "./jobs";
import { supabase } from "./supabase";

export interface LibraryEntry {
  id: string;
  title: string;
  mediaType: MediaType;
  /** Clip length in seconds (ready clips only). */
  durationSec: number | null;
  ready: boolean;
  /** 0–1 while a job is processing; null for ready clips. */
  progress: number | null;
  /** Human status while processing (e.g. "Transcribing"); null when ready. */
  statusLabel: string | null;
  /** User-starred (ready clips only; processing rows are always false). */
  favorite: boolean;
}

// Job statuses that mean "still working" — everything before `ready`/`failed`.
const PROCESSING: Job["status"][] = [
  "pending",
  "acquiring",
  "extracting",
  "transcribing",
  "postprocessing",
  "translating",
  "persisting",
];

function jobStatusLabel(status: Job["status"]): string {
  const map: Partial<Record<Job["status"], string>> = {
    pending: "Queued",
    acquiring: "Fetching",
    extracting: "Extracting",
    transcribing: "Transcribing",
    postprocessing: "Cleaning up",
    translating: "Translating",
    persisting: "Saving",
  };
  return map[status] ?? "Processing";
}

/** Ready clips (newest first) plus any in-flight uploads on top. */
export async function fetchLibrary(): Promise<LibraryEntry[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("id, title, media_type, duration, created_at, is_favorite")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const ready: LibraryEntry[] = (data ?? []).map((v) => ({
    id: v.id as string,
    title: (v.title as string) || "Untitled clip",
    mediaType: (v.media_type as MediaType) ?? "video",
    durationSec: (v.duration as number | null) ?? null,
    ready: true,
    progress: null,
    statusLabel: null,
    favorite: (v.is_favorite as boolean) ?? false,
  }));

  // Best-effort: surface uploads that are still processing. A missing session or
  // an unreachable API just means we show the ready clips only.
  let processing: LibraryEntry[] = [];
  try {
    const jobs = await fetchJobs();
    processing = jobs
      .filter((j) => PROCESSING.includes(j.status))
      .map((j) => ({
        id: j.id,
        title: j.title || "Untitled clip",
        mediaType: j.media_type,
        durationSec: null,
        ready: false,
        progress: typeof j.progress === "number" ? j.progress : 0,
        statusLabel: jobStatusLabel(j.status),
        favorite: false,
      }));
  } catch {
    processing = [];
  }

  return [...processing, ...ready];
}

/**
 * Permanently delete a clip and everything under it: its segments and any
 * bookmarks saved from them cascade away (FK ON DELETE CASCADE). RLS-scoped to
 * the owner. The R2 media object is left orphaned — there's no mobile route to
 * delete from R2 yet (a storage-cleanup follow-up), which only costs storage.
 */
export async function deleteClip(videoId: string): Promise<void> {
  const { error } = await supabase.from("videos").delete().eq("id", videoId);
  if (error) throw new Error(error.message);
}

/** Star / unstar a clip (RLS-scoped). Needs migration 021 (videos.is_favorite). */
export async function setClipFavorite(videoId: string, favorite: boolean): Promise<void> {
  const { error } = await supabase.from("videos").update({ is_favorite: favorite }).eq("id", videoId);
  if (error) throw new Error(error.message);
}

export interface TranscriptLine {
  id: string;
  index: number;
  /** Seconds from clip start. */
  start: number;
  end: number;
  text: string;
  translation: string | null;
}

/** Transcript lines for one clip, in order (segments table, RLS-scoped). */
export async function fetchSegments(videoId: string): Promise<TranscriptLine[]> {
  const { data, error } = await supabase
    .from("segments")
    .select("id, index, start_time, end_time, text, translation")
    .eq("video_id", videoId)
    .order("index", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((s) => ({
    id: s.id as string,
    index: (s.index as number) ?? 0,
    start: (s.start_time as number) ?? 0,
    end: (s.end_time as number) ?? 0,
    text: (s.text as string) ?? "",
    translation: (s.translation as string | null) ?? null,
  }));
}

export interface ClipMedia {
  /** Short-lived signed R2 URL, an external http(s) URL, or a "youtube://…"
   *  reference (not directly playable). Null when the clip has no audio. */
  audioUrl: string | null;
  videoUrl: string | null;
}

/** Resolve a clip's playable media URLs via the `media-url` Supabase Edge
 *  Function (owner-scoped by RLS; signs the private R2 keys). NOT the Vercel
 *  route — the native app can't reach Vercel (see the Protocol-error postmortem).
 *  Audio still streams straight from R2. */
export async function fetchClipMedia(videoId: string): Promise<ClipMedia> {
  const { data, error } = await supabase.functions.invoke<ClipMedia>("media-url", { body: { videoId } });
  if (error) throw new Error(error.message || "Couldn’t load this clip’s media.");
  return data ?? { audioUrl: null, videoUrl: null };
}

/** True when a media URL can be played directly by the audio player. */
export function isPlayableUrl(url: string | null): url is string {
  return !!url && (url.startsWith("http://") || url.startsWith("https://"));
}

/** Seconds → "m:ss" (or "h:mm:ss"), matching the clip-time style in the design. */
export function formatDuration(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return "—";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(ss)}` : `${m}:${two(ss)}`;
}
