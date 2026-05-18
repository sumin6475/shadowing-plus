// ---------------- DB row types ----------------

export interface Folder {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export type MediaType = "video" | "audio";

export interface Video {
  id: string;
  title: string;
  duration: number | null;
  audio_url: string;
  video_url: string | null;
  media_type: MediaType;
  folder_id: string | null;
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

export interface Bookmark {
  id: string;
  segment_id: string;
  memo: string | null;
  created_at: string;
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
