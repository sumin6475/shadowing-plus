-- ============================================================================
-- 009 — Review bot: per-user channel + schedule settings
-- ============================================================================
-- The Review bot delivers due bookmarks to a messenger (Slack / Telegram) on a
-- schedule and grades them via button taps. This table records, per user, which
-- channel to send to, the channel-specific address, and the daily schedule.
--
-- Channel-agnostic on purpose: `channel` + `channel_user_ref` cover both Slack
-- (user/DM id) and Telegram (chat id) without a schema change when switching.
--
-- Safe to run after 008 (auth/RLS). RLS is ON like every other owned table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS review_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Delivery channel. 'none' = bot off (default until the user connects one).
  channel TEXT NOT NULL DEFAULT 'none'
    CHECK (channel IN ('none', 'slack', 'telegram')),
  -- Channel-specific address to send to (Slack user/DM id, Telegram chat id).
  channel_user_ref TEXT,

  -- Daily send window, in the user's timezone. On Vercel Hobby cron fires once
  -- per day at an arbitrary minute within the hour, so this is the target hour.
  review_hour INT NOT NULL DEFAULT 9 CHECK (review_hour BETWEEN 0 AND 23),
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  -- Max cards per daily message (matches select-due's default batch).
  batch_size INT NOT NULL DEFAULT 5 CHECK (batch_size BETWEEN 1 AND 20),
  -- Master on/off independent of `channel` so a user can pause without losing
  -- their connected channel ref.
  enabled BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One settings row per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_settings_user_id
  ON review_settings(user_id);

-- The cron route (service key) looks up who is due to receive a batch.
CREATE INDEX IF NOT EXISTS idx_review_settings_enabled
  ON review_settings(enabled) WHERE enabled = true;

ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_settings FORCE ROW LEVEL SECURITY;

-- Owner-only, like every other table (008 pattern). The cron/webhook routes use
-- the service key (bypasses RLS) and scope by user_id in application code.
CREATE POLICY review_settings_owner ON review_settings
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
