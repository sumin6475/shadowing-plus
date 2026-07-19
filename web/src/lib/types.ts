// ---------------- DB row types ----------------

export interface Folder {
  id: string;
  name: string;
  position: number;
  color: string | null;
  created_at: string;
}

export type MediaType = "video" | "audio";

export type PracticeStatus = "none" | "focusing" | "done";

// Loop button cycles: off → clip (whole clip) → sentence (current focus line).
export type LoopMode = "off" | "clip" | "sentence";

export interface Video {
  id: string;
  title: string;
  duration: number | null;
  audio_url: string;
  video_url: string | null;
  media_type: MediaType;
  folder_id: string | null;
  // Migration 005. Older DB copies may return null/undefined; callers should
  // coalesce to "none".
  practice_status: PracticeStatus;
  created_at: string;
}

export interface WordEntry {
  word: string;
  start?: number | null;
  end?: number | null;
  meaning?: string;
}

export interface Segment {
  id: string;
  video_id: string;
  index: number;
  start_time: number;
  end_time: number;
  text: string;
  translation: string | null;
  words: WordEntry[] | null;
  created_at: string;
}

export type SrsVerdict = "again" | "good" | "easy";

export interface Bookmark {
  id: string;
  segment_id: string;
  memo: string | null;
  created_at: string;
  // SRS state (migration 004_bookmarks_srs.sql). Always non-null after backfill but Supabase
  // still returns `null` if the column is absent on an older copy of the DB,
  // so the runtime should tolerate that.
  ease_factor: number;
  interval_days: number;
  due_at: string;
  last_verdict: SrsVerdict | null;
  last_reviewed_at: string | null;
  lapses: number;
  segment?: Segment & { video?: Video };
}

export type JobStatus =
  | "pending"
  | "extracting"
  | "transcribing"
  | "postprocessing"
  | "translating"
  | "persisting"
  | "ready"
  | "failed";

export type StageName =
  | "extract"
  | "transcribe"
  | "postprocess"
  | "translate"
  | "persist";

export interface Job {
  id: string;
  video_id: string | null;
  title: string;
  media_type: MediaType;
  source_key: string;
  status: JobStatus;
  current_stage: StageName | null;
  progress: number;
  error: string | null;
  // Owner (migration 008_auth_rls.sql). Set at createJob time from the session.
  user_id: string;
  // Per-clip language pair (migration 011_jobs_language_pair.sql). source_lang is
  // an ISO 639-3 code for the ASR provider; target_lang is the plain English
  // label interpolated into the translation prompt. Older DB copies / rows
  // created before 011 return null — callers coalesce via languagePairForJob().
  source_lang: string | null;
  target_lang: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------- Pipeline-internal types ----------------
// These flow between stages 1-4 via JSON files in R2.
// Field names match ElevenLabs/Vibe ASR output (start/end, not start_time/end_time).

export interface PipelineWord {
  word: string;
  start: number | null;
  end: number | null;
}

export interface PipelineSegment {
  index?: number;
  text: string;
  start: number;
  end: number;
  words?: PipelineWord[] | null;
  translation?: string | null;
}
