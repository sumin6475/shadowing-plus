-- Personal vocabulary and phrase collection. This deliberately remains
-- separate from sentence bookmarks: a phrase is learned for its meaning in a
-- particular context, not scheduled as a full shadowing sentence.
CREATE TABLE IF NOT EXISTS phrase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  segment_id UUID REFERENCES segments(id) ON DELETE SET NULL,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 240),
  normalized_text TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'phrase'
    CHECK (kind IN ('word', 'phrasal_verb', 'pattern', 'idiom', 'phrase')),
  meaning_ko TEXT,
  usage_note TEXT,
  source_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  start_time FLOAT,
  end_time FLOAT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, segment_id, normalized_text)
);

CREATE INDEX IF NOT EXISTS idx_phrase_items_user_created
  ON phrase_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phrase_items_video ON phrase_items(video_id);

ALTER TABLE phrase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrase_items FORCE ROW LEVEL SECURITY;
CREATE POLICY phrase_items_owner ON phrase_items
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
