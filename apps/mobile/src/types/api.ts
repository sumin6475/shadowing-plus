// Copied from web/src/lib/types.ts @ 3d30821.
// Keep in sync with the web app; promote to packages/shared-types on ship.
//
// This is the DB-row subset the mobile app consumes (via the Supabase SDK and
// the web API). The pipeline-internal types (PipelineSegment/PipelineWord) are
// intentionally NOT copied — the mobile app never runs the pipeline.

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
  // SRS state (migration 004_bookmarks_srs.sql). Always non-null after backfill
  // but Supabase still returns `null` if the column is absent on an older copy
  // of the DB, so the runtime should tolerate that.
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
  | "acquiring"
  | "extracting"
  | "transcribing"
  | "postprocessing"
  | "translating"
  | "persisting"
  | "ready"
  | "failed";

export type StageName =
  | "acquire"
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
  ingestion_mode: "upload" | "youtube_captions" | "youtube_asr";
  asr_nonce: string | null;
  status: JobStatus;
  current_stage: StageName | null;
  progress: number;
  error: string | null;
  // Owner (migration 008_auth_rls.sql). Set at createJob time from the session.
  user_id: string;
  // Per-clip language pair (migration 011_jobs_language_pair.sql). source_lang
  // is an ISO 639-3 code for the ASR provider; target_lang is the plain English
  // label. Older rows return null — coalesce as the web app does.
  source_lang: string | null;
  target_lang: string | null;
  created_at: string;
  updated_at: string;
}

// Response shape of POST /api/talk/diagnose. Copied by hand from
// web/src/lib/talk-diagnose.ts (TalkMoment). One improvable "moment" the AI
// surfaced from a Speak session transcript. Not a DB row — the route is
// stateless and nothing is persisted server-side.
export interface TalkMoment {
  /** ≤4 words naming what this moment is about. */
  label: string;
  /** A verbatim span copied from the transcript. */
  said: string;
  /** A more natural way to say it, in the learner's voice (≤10 words). */
  want: string;
  /** One short example sentence that uses `want`. */
  example: string;
}

// Help for a moment the learner tapped "Stuck" during a Speak session and jotted
// a quick note (often in their native language) about what they wanted to say
// but couldn't. talk-stuck turns each note into the natural English expression.
// A SEPARATE analysis from TalkMoment; nothing is persisted.
export interface StuckHelp {
  /** Timestamp in the session, "m:ss" — echoes the note's timestamp. */
  at: string;
  /** The natural English way to say what they noted (≤14 words). */
  phrase: string;
  /** One example sentence that uses `phrase`. */
  example: string;
}
