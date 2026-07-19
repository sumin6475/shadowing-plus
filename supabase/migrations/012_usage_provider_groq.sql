-- ============================================================================
-- 012 — Allow 'groq' as a usage_events provider
-- ============================================================================
-- The ASR routing work (A3) sends non-zh/ja transcription to Groq Whisper and
-- records the spend via recordUsage(provider: 'groq'). But migration 006 pinned
-- usage_events.provider to a CHECK of ('openai','elevenlabs'), so those inserts
-- were rejected — "violates check constraint usage_events_provider_check" — and
-- Groq cost silently never landed in the cost report (recordUsage swallows the
-- error as non-fatal so the pipeline still succeeds).
--
-- Drop and re-add the constraint with 'groq' included. Idempotent: safe to run
-- even if 006's constraint was already dropped by a prior attempt.
-- ============================================================================

ALTER TABLE usage_events
  DROP CONSTRAINT IF EXISTS usage_events_provider_check;

ALTER TABLE usage_events
  ADD CONSTRAINT usage_events_provider_check
  CHECK (provider IN ('openai', 'elevenlabs', 'groq'));
