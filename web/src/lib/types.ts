export interface Video {
  id: string;
  title: string;
  duration: number | null;
  audio_url: string;
  local_video_path: string | null;
  created_at: string;
}

export interface WordEntry {
  word: string;
  start?: number;
  end?: number;
  meaning: string;
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
