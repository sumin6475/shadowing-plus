-- videos 테이블
CREATE TABLE videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  duration FLOAT,
  audio_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- segments 테이블
CREATE TABLE segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  index INT NOT NULL,
  start_time FLOAT NOT NULL,
  end_time FLOAT NOT NULL,
  text TEXT NOT NULL,
  translation TEXT,
  words JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_segments_video_id ON segments(video_id);
CREATE INDEX idx_segments_video_time ON segments(video_id, start_time);

-- bookmarks 테이블
CREATE TABLE bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bookmarks_segment_id ON bookmarks(segment_id);
