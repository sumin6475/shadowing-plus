-- ============================================================================
-- 013 — practice_sessions (measurement: daily minutes + streak)
-- ============================================================================
-- Records active shadowing time so the Home dashboard can show real "minutes
-- shadowed per day" and a practice streak (replacing the placeholder panel).
--
-- Follows the direct-owner pattern from 008: user_id DEFAULT auth.uid() + RLS,
-- so the browser client inserts a row WITHOUT passing user_id (same as bookmarks
-- / folders) — the session fills it. video_id is ON DELETE SET NULL so deleting
-- a clip doesn't erase the practice time it earned (streak/minutes still count).
-- New table under RLS-on, so remember to ENABLE + FORCE RLS and add a policy.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  seconds integer NOT NULL DEFAULT 0 CHECK (seconds >= 0),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Per-user recent-first lookups (the dashboard reads the last ~30 days).
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_time
  ON public.practice_sessions(user_id, occurred_at DESC);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY practice_sessions_owner ON public.practice_sessions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
