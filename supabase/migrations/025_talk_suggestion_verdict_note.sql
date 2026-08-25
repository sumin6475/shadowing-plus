-- ============================================================================
-- 025 — talk_suggestion_feedback.verdict_note
-- ============================================================================
-- Learner-written reason for Dislike / Not sure. Separate from `why`, which
-- stores the AI coaching grounds shown with the suggestion.
-- ============================================================================

ALTER TABLE public.talk_suggestion_feedback
  ADD COLUMN IF NOT EXISTS verdict_note TEXT;
