-- SHADOW-2026 rebuild: fresh schema. Drops everything from the old Vibe-era
-- system. Run once on the target Supabase project; old migrations 001-003
-- are obsolete after this.

DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS segments CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;

-- ---------------- folders ----------------
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE folders DISABLE ROW LEVEL SECURITY;

-- ---------------- videos ----------------
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  duration FLOAT,
  audio_url TEXT NOT NULL,
  video_url TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'audio')),
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_videos_folder_id ON videos(folder_id);

-- ---------------- segments ----------------
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  index INT NOT NULL,
  start_time FLOAT NOT NULL,
  end_time FLOAT NOT NULL,
  text TEXT NOT NULL,
  translation TEXT,
  words JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE segments DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_segments_video_id ON segments(video_id);
CREATE INDEX idx_segments_video_time ON segments(video_id, start_time);

-- ---------------- bookmarks ----------------
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bookmarks_segment_id ON bookmarks(segment_id);

-- ---------------- jobs ----------------
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'audio')),
  source_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'extracting',
      'transcribing',
      'postprocessing',
      'translating',
      'persisting',
      'ready',
      'failed'
    )),
  current_stage TEXT
    CHECK (current_stage IS NULL OR current_stage IN (
      'extract', 'transcribe', 'postprocess', 'translate', 'persist'
    )),
  progress INT NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Realtime: the home page subscribes to the jobs feed for live progress.
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
