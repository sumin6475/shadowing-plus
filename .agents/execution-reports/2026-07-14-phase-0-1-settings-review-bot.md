# Execution Report — Phase 0/1 + Settings restructure + Review bot

**Date:** 2026-07-11 ~ 2026-07-14
**Plan:** `.agents/plans/encapsulated-conjuring-hennessy.md` (Multi-user SaaS phased roadmap)
**Status:** Phase 0 ✅ · Phase 1 ✅ (code; migration applied by user) · Phase 2 ⏭ skipped by decision · Review bot ✅ (code)

---

## What was actually built vs. the plan

### Phase 0 — Safety net & cleanup ✅ (as planned)
- **Stuck-job reaper:** `reapStuckJobs()` in `pipeline/jobs.ts` + `/api/cron/reap-jobs` (CRON_SECRET) + `vercel.json` 10-min cron.
- **R2 privacy fix:** write-side stores bare keys (`stage_5_persist.ts`); read-side signs via new `/api/media/[videoId]` + `resolve-media.ts`. **Divergence from plan:** the plan under-counted consumers — signed-URL resolution had to be wired into **4** playback sites (player page, bookmarks, desktop + mobile practice), not just the player. Migration `007_media_urls_to_keys.sql` for existing rows.
- **Cleanup:** migration-comment drift fixed, Sort button removed, scratch files deleted, ARCHITECTURE §9-10 corrected.
- **Deferred:** per-user R2 key prefix (`users/{id}/...`) intentionally moved to Phase 1 territory; still not applied (media is private via signed URLs regardless).

### Phase 1 — Auth + RLS + per-user isolation ✅
- `@supabase/ssr` client split (`supabase.ts` browser + `supabase-server.ts`), `proxy.ts` (Next 16 rename), `/login` + `/auth/callback`.
- `user_id` threaded through all 10 service-key routes + pipeline usage; per-user realtime filter on `page.tsx`.
- Migration `008_auth_rls.sql` (held, then applied by user).
- **Divergence #1 — login method:** plan said magic-link; **switched to email/password + Google OAuth** mid-execution because magic-link redirect kept failing (expiry + Supabase redirect-allowlist). Password login has no redirect round-trip → more robust. User completed Google OAuth setup.
- **Divergence #2 — proxy self-heal:** added logic to forward a stray `?code=`/`?token_hash=` on any path → `/auth/callback` (magic-link fallback), not in the original plan.

### Phase 2 — Landing + waitlist ⏭ SKIPPED (user decision)
User decided to keep the app focused and build any landing/waitlist as a **separate standalone site** later. The `/`→`/app` move, waitlist table, Resend/Turnstile — all dropped. The app stays at `/`.

### Settings restructure (unplanned — user request)
- Retired the `/settings` **route**; Settings is now a **modal** with tabs (Profile/Usage/Language), opened from a **profile dropdown** in the sidebar foot (Claude-app pattern).
- New: `components/settings/` (ProfileMenu, SettingsModal, ProfilePanel, UsagePanel [extracted], LanguagePanel) + `LogoutButton`.
- **Bug fixed:** modal was trapped behind page content — the sidebar's `transform` created a stacking context; fixed with `createPortal(<body>)` + z-index 400.
- Design spec drafted: `docs/ver2.0 plan/DESIGN-SPEC-profile-menu-and-settings-modal.md`.

### Review bot (Telegram) ✅ — replaced Phase 3/4 as the chosen next feature
- Channel decision via research workflow: **Telegram** (Slack can't cold-DM non-workspace users). Documented + verified.
- Channel-agnostic core: `select-due.ts` (pure, 7 tests), `grade-bookmark.ts` (shared by HTTP route + bot), `channel.ts` (ChannelAdapter), `review-data.ts`, `get-adapter.ts`.
- Telegram adapter + `/api/cron/review` + `/api/bot/[channel]/webhook`. Migration `009_review_bot.sql` (`review_settings`). Daily cron in `vercel.json`.
- **v0 limits (documented):** grades first card per message; one fixed send time; **no connect-UI** (manual SQL to set `channel_user_ref` — the one manual gap).
- Runbook: `docs/ver2.0 plan/REVIEW-BOT-SETUP-RUNBOOK.md`.

---

## Verification
- `npm test` → **41 pass** (added 7 for select-due).
- `npm run build` → clean throughout; all new routes registered (`/api/media/[videoId]`, `/api/cron/reap-jobs`, `/api/cron/review`, `/api/bot/[channel]/webhook`, `/auth/callback`, `/login`).
- Project ESLint v9 clean on all changed files. Auth flow driven live (Google login → 112 videos show → RLS confirmed working). Settings modal fixed + verified live.

## Known environment issue (not code)
The `PostToolUse` lint hook runs `npx eslint` which pulls **ESLint 10.7.0** (project pins v9) and crashes: `TypeError: Error while loading rule 'react/display-name': contextOrFilename.getFilename is not a function`. Every `.ts/.tsx` edit false-alarms. Project's own `npx --no-install eslint` (v9) is clean. **Fix the hook** to use `npm run lint` / `--no-install`.

## Open threads for next session
1. Apply `008` in prod after deploying session layer (runbook order); 2-account isolation test.
2. Review bot: @BotFather setup + 009 migration + connect chat id (runbook); then build the "Connect Telegram" UI + advance-through-batch grading.
3. Language tab wiring to pipeline (per-clip source/target lang) — currently preference-only.
4. Settings UI design pass (spec exists); decide dark mode.
5. Fix the lint hook (ESLint 10 vs pinned 9).
