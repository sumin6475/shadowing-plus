-- Speaking Memory Island — the "Explain what I do" workspace.
--
-- Phase 1 uses `islands` + `island_beats` (rough answer → editable beats).
-- `island_attempts` / `island_repairs` / `island_phrase_events` are created now
-- but only wired in Phase 3 (attempt → repair → retry), so this is the only
-- island migration a beta needs to apply.
--
-- A beat is a learner-owned message unit: AI may *organize* the rough answer
-- into beats (source = 'ai_structured') but must not invent facts. Every table
-- is owner-scoped with ENABLE + FORCE ROW LEVEL SECURITY; service-key routes
-- must additionally filter by user_id (the service key bypasses RLS).

CREATE TABLE IF NOT EXISTS islands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'explain_what_i_do'
    CHECK (kind IN ('explain_what_i_do')),
  title TEXT,
  raw_answer TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'shaping', 'ready', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One active island per (user, kind); archived ones don't block a fresh start.
CREATE UNIQUE INDEX IF NOT EXISTS idx_islands_user_kind_active
  ON islands(user_id, kind) WHERE status <> 'archived';

CREATE TABLE IF NOT EXISTS island_beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  island_id UUID NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  text TEXT NOT NULL DEFAULT '',
  evidence TEXT,
  source TEXT NOT NULL DEFAULT 'learner'
    CHECK (source IN ('learner', 'ai_structured')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_island_beats_island ON island_beats(island_id, position);

CREATE TABLE IF NOT EXISTS island_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  island_id UUID NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_no INT NOT NULL DEFAULT 1,
  transcript TEXT,
  duration_seconds FLOAT,
  audio_key TEXT,
  audio_content_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_island_attempts_island ON island_attempts(island_id, created_at);

CREATE TABLE IF NOT EXISTS island_repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  island_id UUID NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  beat_id UUID REFERENCES island_beats(id) ON DELETE SET NULL,
  phrase_item_id UUID REFERENCES phrase_items(id) ON DELETE SET NULL,
  diagnosis TEXT CHECK (diagnosis IN ('meaning', 'new_language', 'retrieval', 'pressure')),
  drill TEXT,
  ease_factor REAL DEFAULT 2.5,
  interval_days REAL DEFAULT 0,
  due_at TIMESTAMPTZ,
  lapses INT DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_island_repairs_island ON island_repairs(island_id);

-- Append-only evidence for honest phrase progress + analytics.
CREATE TABLE IF NOT EXISTS island_phrase_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  island_id UUID REFERENCES islands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  phrase_item_id UUID REFERENCES phrase_items(id) ON DELETE SET NULL,
  event TEXT NOT NULL CHECK (event IN ('saved', 'shadowed', 'retrieved', 'used', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_island_phrase_events_user ON island_phrase_events(user_id, created_at);

-- Owner-only, forced RLS on every island table.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['islands', 'island_beats', 'island_attempts', 'island_repairs', 'island_phrase_events'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_owner ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_owner ON %I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t, t);
  END LOOP;
END $$;
