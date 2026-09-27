-- Weak points / current focus areas. A per-user todo list the learner
-- keeps next to the clip player: category, done/not done, and a star that
-- surfaces the item as a sticky note while shadowing.
--
-- Client queries use the anon key + auth.uid() (DEFAULT + RLS). There is no
-- service-key route for this table; if one is added later it MUST filter by
-- user_id itself (the service key bypasses RLS).

CREATE TABLE IF NOT EXISTS weak_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(trim(text)) BETWEEN 1 AND 240),
  category TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  starred BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weak_points_user
  ON weak_points(user_id, starred DESC, completed, position);

ALTER TABLE weak_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE weak_points FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weak_points_owner ON weak_points;
CREATE POLICY weak_points_owner ON weak_points
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
