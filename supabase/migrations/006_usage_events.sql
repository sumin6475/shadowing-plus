-- Usage / cost tracking. Every billable API call (OpenAI translation,
-- ElevenLabs transcription) writes one row here so the Settings page can
-- aggregate token usage and estimated spend. cost_usd is computed and stored
-- at insert time (see web/src/lib/usage.ts) so reads are a simple SUM.

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  -- Snapshot of the clip/job title so the row stays meaningful after the
  -- job (and its title) is deleted.
  label TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'elevenlabs')),
  model TEXT NOT NULL,
  -- What the call was for: 'translate', 'profile' (OpenAI) or 'transcribe' (ElevenLabs).
  kind TEXT NOT NULL,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  audio_seconds FLOAT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE usage_events DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_job_id ON usage_events(job_id);
