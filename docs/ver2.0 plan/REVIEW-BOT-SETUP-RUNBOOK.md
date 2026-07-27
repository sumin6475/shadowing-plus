# Review bot (Telegram) — setup runbook

The Review-bot **code is built and verified** (build + tests green). It delivers
your due bookmarks to Telegram daily and grades them via button taps. To make it
work end-to-end you need to: create a Telegram bot, apply a migration, set env
vars, register the webhook, and connect your Telegram chat to your account.

## What was built (for reference)
- `web/src/lib/bot/` — `select-due.ts` (pure, tested), `grade-bookmark.ts`
  (shared grading, also used by the app's verdict route), `channel.ts`
  (ChannelAdapter interface), `review-data.ts` (due→ReviewCard resolver),
  `telegram.ts` (the adapter), `get-adapter.ts` (factory).
- `web/src/app/api/cron/review/route.ts` — daily trigger (Vercel Cron).
- `web/src/app/api/bot/[channel]/webhook/route.ts` — receives button taps and
  `/start <token>` connect handshakes.
- `web/src/app/api/bot/connect/route.ts` — mints/checks/clears the connect
  token for the settings modal's "Connect Telegram" flow.
- `web/src/components/settings/NotificationsPanel.tsx` — the Settings →
  Notifications tab (connect/disconnect UI, polls for connection).
- `supabase/migrations/009_review_bot.sql` — `review_settings` table.
- `supabase/migrations/010_review_bot_connect_token.sql` — adds
  `connect_token` / `connect_token_expires_at` for the connect-UI handshake.
- `vercel.json` — daily cron `0 0 * * *` (midnight UTC ≈ 9am KST).

## Channel decision
**Telegram**, chosen over Slack after research: a Slack bot can't cold-DM users
who aren't in your workspace; Telegram can DM anyone who `/start`-ed it, free.
The code is channel-agnostic (ChannelAdapter) so Slack/KakaoTalk could be added
later without touching the cron/webhook/grading logic.

---

## Setup steps (in order)

### 1. Create the Telegram bot
1. In Telegram, message **@BotFather** → `/newbot` → pick a name + username.
2. Copy the **bot token** it gives you (`123456:ABC-...`).

### 2. Apply the migration
Paste `supabase/migrations/009_review_bot.sql` into the Supabase SQL Editor and
run it. (Creates `review_settings` with RLS, like the other tables.)

### 3. Set env vars
Local (`web/.env.local`) and the Vercel project env:
- `TELEGRAM_BOT_TOKEN` = the token from step 1
- `TELEGRAM_WEBHOOK_SECRET` = any random string you choose (e.g. `openssl rand -hex 16`)
- `NEXT_PUBLIC_APP_URL` = your deployed URL (for deep links); localhost is fine for dev
- `CRON_SECRET` should already exist (shared with the reaper)

### 4. Register the webhook with Telegram
Point Telegram at your deployed webhook (must be HTTPS — use the Vercel URL, not
localhost). Run once:
```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<your-vercel-domain>/api/bot/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```
Telegram will now echo `secret_token` in the `X-Telegram-Bot-Api-Secret-Token`
header on every call — that's how the webhook verifies requests.

### 5. Connect YOUR Telegram to your account
Apply `supabase/migrations/010_review_bot_connect_token.sql` (adds the
`connect_token` columns), then set `TELEGRAM_BOT_USERNAME` (no `@`) alongside
the other Telegram env vars.

Once that's deployed, connecting is a UI flow — no manual SQL:
1. Open the app → profile menu → **Settings → Notifications**.
2. Click **Connect Telegram**. This opens `t.me/<bot>?start=<token>` in a new
   tab and starts polling for the connection.
3. Tap **Start** in Telegram. The webhook reads `/start <token>`, resolves the
   pending row by `connect_token`, and fills in `channel_user_ref` (your chat
   id) — see `web/src/lib/bot/telegram.ts`'s `/start` handling and
   `web/src/app/api/bot/[channel]/webhook/route.ts`.
4. The Settings tab flips to "✓ Connected" within a couple seconds; you'll
   also get a confirmation DM from the bot.

(The old manual-SQL path — insert a `review_settings` row by hand with a
chat id looked up via `getUpdates` — still works if you ever need to bypass
the UI, but is no longer the documented path.)

### 6. Set CRON_SECRET on Vercel + deploy
Deploy (`npx vercel --prod` from repo root). The daily cron will fire at
midnight UTC; you can also test it immediately:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://<your-vercel-domain>/api/cron/review
```
If you have due bookmarks, you'll get a Telegram message with 3 verdict buttons.
Tap one → the SM-2 state updates (same logic as the in-app Practice mode).

---

## v0 limitations (honest notes)
- **Grades the FIRST card per message.** The message lists the whole batch but
  the buttons grade card #1; a fuller v1 would advance through the batch after
  each tap (the adapter's `acknowledgeGrade` is the seam for this).
- **One fixed send time** for everyone (midnight UTC). Per-user send hours need
  either Vercel Pro cron or the pg_cron fallback (noted in the phase-0 design).
- **Free-text inbound** (island/miss capture) is parsed but not yet acted on —
  a later feature.
- **"Shadow in app" is an unsigned GET.** `/api/bot/open` mints a fresh
  Supabase session for whoever's bookmark the link resolves to, with no
  signature check (unlike the webhook, which verifies Telegram's secret
  header). Anyone holding the exact URL before it's tapped could redeem it.
  Telegram DMs are private 1:1 and this is a single-owner app today, so this
  ships as-is; a v1 hardening step would add a short-lived HMAC over
  `bookmarkId+ref+timestamp`.

## Follow-ups worth doing
1. ~~**Connect-UI** in the settings modal (removes the manual SQL step).~~ Done
   — see step 5 above (`NotificationsPanel.tsx` + `/api/bot/connect`).
2. **Advance-through-batch** grading (grade all N cards, not just the first).
3. **Per-user schedule** honoring `review_hour`/`timezone` (needs finer cron).
