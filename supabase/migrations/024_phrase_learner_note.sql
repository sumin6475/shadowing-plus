-- ============================================================================
-- 024 — phrase_items.learner_note
-- ============================================================================
-- Split "how it's used" (AI usage_note) from the learner's own memo.
-- Capture More / Phrase detail "Your note" write here. Existing usage_note
-- rows stay as how-it's-used; they are not copied into learner_note.
-- ============================================================================

ALTER TABLE public.phrase_items
  ADD COLUMN IF NOT EXISTS learner_note TEXT;
