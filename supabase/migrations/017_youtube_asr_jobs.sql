-- 017 — Private YouTube ASR fallback job state.
-- Caption imports remain the default. `youtube_asr` jobs retain the YouTube
-- reference for playback but acquire a temporary R2 audio object before Stage 2.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS ingestion_mode TEXT NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS asr_nonce TEXT;

ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_ingestion_mode_check;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_ingestion_mode_check
  CHECK (ingestion_mode IN ('upload', 'youtube_captions', 'youtube_asr'));

ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN (
    'pending', 'acquiring', 'extracting', 'transcribing', 'postprocessing',
    'translating', 'persisting', 'ready', 'failed'
  ));

ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_current_stage_check;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_current_stage_check
  CHECK (current_stage IS NULL OR current_stage IN (
    'acquire', 'extract', 'transcribe', 'postprocess', 'translate', 'persist'
  ));

CREATE INDEX IF NOT EXISTS idx_jobs_youtube_asr_acquiring
  ON jobs (user_id, source_key)
  WHERE ingestion_mode = 'youtube_asr' AND status = 'acquiring';
