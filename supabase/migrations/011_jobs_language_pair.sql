-- ============================================================================
-- 011 — Per-clip language pair on jobs (and videos)
-- ============================================================================
-- Until now the pipeline read a fixed pair (eng → Korean) from
-- web/src/lib/pipeline/languages.ts, so the Settings → Language tab could offer
-- choices that never reached the pipeline. This makes the pair travel per clip.
--
-- Why `jobs`, not `videos`: the pipeline is driven entirely off the jobs table
-- (getJob(jobId)); a `videos` row is only created at stage 5 (persist), long
-- after transcribe/translate need to know the languages. So the source of truth
-- during processing is `jobs`. We also add the columns to `videos` so persist
-- can copy the pair onto the finished clip for later use by the library/player.
--
-- Backward-compatible: existing rows and any upload that omits the pair fall
-- back to the DEFAULTs below, preserving today's eng → Korean behavior.
--
--   source_lang  ISO 639-3 code fed to the ASR provider. e.g. 'eng','spa','cmn','jpn'.
--   target_lang  Plain English label interpolated into the translation prompt
--                verbatim (same shape as the old TRANSLATION_LANGUAGE). e.g. 'Korean','English'.
--
-- These are new COLUMNS on existing tables, not new tables, so Supabase does
-- not re-enable RLS here; the existing 008 per-user policies on jobs/videos
-- remain in force.
-- ============================================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source_lang TEXT NOT NULL DEFAULT 'eng',
  ADD COLUMN IF NOT EXISTS target_lang TEXT NOT NULL DEFAULT 'Korean';

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS source_lang TEXT NOT NULL DEFAULT 'eng',
  ADD COLUMN IF NOT EXISTS target_lang TEXT NOT NULL DEFAULT 'Korean';
