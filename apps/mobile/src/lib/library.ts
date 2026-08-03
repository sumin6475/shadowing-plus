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
    .select("id, title, media_type, duration, created_at")
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
      }));
  } catch {
    processing = [];
  }

  return [...processing, ...ready];
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
