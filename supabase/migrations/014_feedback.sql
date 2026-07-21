-- ============================================================================
-- 014 — feedback (beta feedback channel)
-- ============================================================================
-- Lets a signed-in user send free-text feedback from the app (ProfileMenu →
-- "Send feedback"). Same direct-owner + RLS pattern as bookmarks/practice
-- (user_id DEFAULT auth.uid()), so the browser client inserts without passing
-- user_id. `path` records which page they were on for context.
--
-- Reading: RLS scopes each user to their OWN rows, so to review ALL feedback the
-- owner reads this table in the Supabase dashboard (service role bypasses RLS)
-- or via a future service-key admin view. Good enough for beta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback(created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback FORCE ROW LEVEL SECURITY;

CREATE POLICY feedback_owner ON public.feedback
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
