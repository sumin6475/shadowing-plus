-- ============================================================================
-- 010 — Review bot: connect-token columns on review_settings
-- ============================================================================
-- Backs the "Connect Telegram" UI (settings modal → Notifications tab), which
-- replaces the manual SQL insert from the v0 setup runbook. Flow:
--   1. User clicks "Connect Telegram" → app mints a short random token, stores
--      it here with an expiry, and opens t.me/<bot>?start=<token>.
--   2. User taps Start in Telegram → the webhook receives "/start <token>",
--      looks up the row by connect_token, and fills in channel_user_ref (the
--      chat id) — see the telegram adapter's `/start` handling.
--   3. The token is one-time use: the webhook clears it after a successful
--      connect so it can't be replayed.
-- ============================================================================

ALTER TABLE review_settings
  ADD COLUMN IF NOT EXISTS connect_token TEXT,
  ADD COLUMN IF NOT EXISTS connect_token_expires_at TIMESTAMPTZ;

-- The webhook looks up a pending connection by token alone (it doesn't yet
-- know the user_id — that's the whole point of the handshake).
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_settings_connect_token
  ON review_settings(connect_token) WHERE connect_token IS NOT NULL;
