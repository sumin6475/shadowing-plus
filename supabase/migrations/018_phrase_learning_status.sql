-- Phrase Bank learning-status + SRS (Phase 3: phrase evidence / spaced review).
--
-- A phrase moves new → recognizing → practicing → ready via a learner "quick
-- check" (it is never advanced by a display or an AI suggestion), and carries
-- SM-2-lite scheduling so it can resurface for review. The fifth design state,
-- `refresh` ("Needs refresh"), is DERIVED in the app from an overdue due_at —
-- it is not a stored value, so no cron is needed to expire phrases.
--
-- Two-step add (nullable → backfill → default) mirrors 004_bookmarks_srs.sql so
-- the DEFAULT columns don't force a full table rewrite.

ALTER TABLE phrase_items
  ADD COLUMN IF NOT EXISTS learning_status   TEXT,
  ADD COLUMN IF NOT EXISTS ease_factor       REAL,
  ADD COLUMN IF NOT EXISTS interval_days     REAL,
  ADD COLUMN IF NOT EXISTS due_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lapses            INT,
  ADD COLUMN IF NOT EXISTS last_reviewed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_practiced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS island            TEXT,
  ADD COLUMN IF NOT EXISTS tags              TEXT[];

UPDATE phrase_items SET
  learning_status = COALESCE(learning_status, 'new'),
  ease_factor     = COALESCE(ease_factor, 2.5),
  interval_days   = COALESCE(interval_days, 0),
  due_at          = COALESCE(due_at, created_at),
  lapses          = COALESCE(lapses, 0),
  tags            = COALESCE(tags, '{}');

ALTER TABLE phrase_items
  ALTER COLUMN learning_status SET DEFAULT 'new',
  ALTER COLUMN learning_status SET NOT NULL,
  ALTER COLUMN ease_factor     SET DEFAULT 2.5,
  ALTER COLUMN interval_days   SET DEFAULT 0,
  ALTER COLUMN due_at          SET DEFAULT now(),
  ALTER COLUMN lapses          SET DEFAULT 0,
  ALTER COLUMN tags            SET DEFAULT '{}',
  ALTER COLUMN tags            SET NOT NULL;

-- Only the four stored states are constrained; `refresh` is display-only.
-- Wrapped so a re-run doesn't error on the already-present constraint.
DO $$ BEGIN
  ALTER TABLE phrase_items ADD CONSTRAINT phrase_items_learning_status_chk
    CHECK (learning_status IN ('new', 'recognizing', 'practicing', 'ready'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_phrase_items_due_at ON phrase_items(due_at);
