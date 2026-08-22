-- ============================================================================
-- 021 — practice_recordings (in-player voice takes)
-- ============================================================================
-- Optional shadowing takes captured from the clip player. Playback of the
-- original clip stays independent: these rows store the learner's microphone
-- only. Audio lives in private R2 (recordings/{userId}/{videoId}/{id}.ext);
-- this table is the metadata index. RLS is owner-only. Paste into the
-- Supabase SQL Editor after 020.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.practice_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  r2_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  duration_seconds numeric(8, 2) NOT NULL CHECK (duration_seconds >= 0),
  bytes integer NOT NULL CHECK (bytes >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practice_recordings_user_video
  ON public.practice_recordings(user_id, video_id, created_at DESC);

ALTER TABLE public.practice_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_recordings FORCE ROW LEVEL SECURITY;

CREATE POLICY practice_recordings_owner ON public.practice_recordings
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
