-- ============================================================================
-- 027 — talk_suggestion_feedback structured coaching detail
-- ============================================================================
-- The talk-diagnose Edge Function now returns separated coaching fields
-- (diagnosis_tag, action, explanation) instead of only a combined `why`.
-- These columns are nullable so every pre-027 row keeps rendering through the
-- existing `why` fallback; nothing is backfilled heuristically.
-- `schema_version` lets the client distinguish structured rows (2) from legacy
-- rows (NULL / 1) without guessing from null structured fields.
-- ============================================================================

ALTER TABLE public.talk_suggestion_feedback
  ADD COLUMN IF NOT EXISTS diagnosis_tag TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS explanation TEXT,
  ADD COLUMN IF NOT EXISTS schema_version INT;

-- Session detail reads feedback by talk_session_id; the user+created_at index
-- doesn't cover that path.
CREATE INDEX IF NOT EXISTS idx_talk_suggestion_feedback_session
  ON public.talk_suggestion_feedback(talk_session_id);
