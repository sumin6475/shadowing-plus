-- ============================================================================
-- 023 — talk_suggestion_feedback
-- ============================================================================
-- One row per AI suggestion shown after a self-talk session (want + example
-- are separate rows). The learner can mark Like / Dislike / Not sure. Null
-- verdict means the suggestion was shown but not rated yet. Later used to
-- improve the talk-diagnose prompt (and, if it ever happens, a trained ranker).
-- Owner-only RLS; dashboard/service role reads the full set.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.talk_suggestion_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  talk_session_id UUID REFERENCES public.talk_sessions(id) ON DELETE SET NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
  focus TEXT NOT NULL,
  moment_index INT NOT NULL,
  moment_label TEXT,
  slot TEXT NOT NULL CHECK (slot IN ('want', 'example')),
  said TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  why TEXT,
  source TEXT NOT NULL CHECK (source IN ('saved', 'generated')),
  phrase_item_id UUID REFERENCES public.phrase_items(id) ON DELETE SET NULL,
  model TEXT,
  verdict TEXT CHECK (verdict IN ('like', 'dislike', 'unsure')),
  verdict_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talk_suggestion_feedback_user
  ON public.talk_suggestion_feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_talk_suggestion_feedback_focus
  ON public.talk_suggestion_feedback(focus, verdict, created_at DESC);

ALTER TABLE public.talk_suggestion_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talk_suggestion_feedback FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS talk_suggestion_feedback_owner ON public.talk_suggestion_feedback;
CREATE POLICY talk_suggestion_feedback_owner ON public.talk_suggestion_feedback
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- If 023 was already applied with fits/forced, widen the check without rebuilding the table.
ALTER TABLE public.talk_suggestion_feedback DROP CONSTRAINT IF EXISTS talk_suggestion_feedback_verdict_check;
ALTER TABLE public.talk_suggestion_feedback
  ADD CONSTRAINT talk_suggestion_feedback_verdict_check
  CHECK (verdict IS NULL OR verdict IN ('like', 'dislike', 'unsure'));
