-- SRS (spaced repetition) state on bookmarks. Drives /practice queue.
-- SM-2-lite: ease_factor, interval_days, due_at, lapses + last verdict.
-- Two-step approach so the DEFAULT now() column doesn't trigger a full table rewrite.

ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS ease_factor      REAL,
  ADD COLUMN IF NOT EXISTS interval_days    REAL,
  ADD COLUMN IF NOT EXISTS due_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_verdict     TEXT,
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lapses           INT;

UPDATE bookmarks SET
  ease_factor   = COALESCE(ease_factor, 2.5),
  interval_days = COALESCE(interval_days, 0),
  due_at        = COALESCE(due_at, created_at),
  lapses        = COALESCE(lapses, 0);

ALTER TABLE bookmarks
  ALTER COLUMN ease_factor   SET DEFAULT 2.5,
  ALTER COLUMN interval_days SET DEFAULT 0,
  ALTER COLUMN due_at        SET DEFAULT now(),
  ALTER COLUMN lapses        SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bookmarks_due_at ON bookmarks(due_at);
