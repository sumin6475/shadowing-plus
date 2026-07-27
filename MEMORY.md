# Shadowing Plus Memory

## Key Decisions

- **Multi-user target architecture (as of 2026-07).** Per-user RLS policies are implemented in the codebase (starting with migration `008_auth_rls.sql`) to replace the old single-user `002_disable_rls.sql` design. Auth = Supabase Auth via `@supabase/ssr` (email/password + Google OAuth; magic-link was tried and dropped). `DEFAULT auth.uid()` on client-insert tables keeps client queries unchanged; service-key routes stamp `user_id` explicitly. Next 16 renamed `middleware` → `proxy` (`web/src/proxy.ts`). **Production migration/RLS state must be verified with a two-account isolation test before an external beta.**
- **Media is private by signed URLs** — `videos.audio_url/video_url` store bare R2 keys; playback resolves via `/api/media/[videoId]` → `getSignedDownloadUrl`. (Old public-URL model was a cross-user privacy hole.)
- **R2 over Supabase Storage** for media (S3 API, free egress); the legacy `audio` bucket is unused.
- **Translation defends against drift** by matching on batch position (k), not the GPT-returned index; the fixed prompt is a `system` message for caching (see `TRANSLATE_STAGE_SNAPSHOT.md`).
- **Product pivot (2026-07-24):** Shadowing Plus is no longer positioned as a generic shadowing library. The public MVP is a personal speaking-memory tool: **Explain what I do** is the first Language Island, combining Boiling-style idea shaping, a learner-owned phrase bank, attempted speech, targeted repair drills, and SRS. The source of truth is `.agents/PRDs/speaking-memory-mvp.md`.
- **Review bot = Telegram** (research-backed: Slack can't cold-DM non-workspace users). Channel-agnostic core (`lib/bot/`) so other channels slot in.
- **Telegram is temporary:** it exists because browser/PWA notification delivery is limited. Keep the notification domain channel-agnostic; native mobile delivery (initially TestFlight) is the intended replacement, not a Telegram-centric product decision.
- **Extension is private:** the Chrome extension remains an owner-only phrase-capture experiment and must not become a public-launch dependency.
- **Public media rule:** user-owned/private uploads are the public ingestion path. Do not promote or expand the owner-gated YouTube caption/ASR experiment into public ingestion. Hosting it on a VPS does not change the API/ToS/copyright boundary.
- **Design system = "Cobalt Editorial"** (warm paper + cobalt #3B6EE1 + Instrument Serif), extracted from home.css/landing.css into `design-system/` (tokens.json + DESIGN.md + tailwind-theme.css). The orange #e05d38 in globals.css is deprecated starter code. (user decision, 2026-07-20)

## Current state (2026-07-24)
- **Current focus: two-week invite-only web beta.** First complete the production Auth/RLS and private-media gate, then build the single **Explain what I do** Language Island: web-player chunk capture → Phrase Bank → Speaking Memory Search → attempt, one repair, retry, and evidence-based review. The execution checklist is `docs/ver2.0 plan/2026-07-24-mvp-web-beta-prelaunch-checklist.md`.
- The repository contains migrations beyond `010`, but the actual production migration ledger is not confirmed. Do not rely on older notes claiming a migration is applied; reconcile the real Supabase project before inviting external users.
- Settings is now a **modal** (Profile/Usage/Language/**Notifications** tabs) from a profile dropdown — the `/settings` **route was deleted**.
- Review bot backend built (cron + webhook + Telegram adapter) **and now has a Connect-UI**: Settings → Notifications → "Connect Telegram" opens a `t.me/<bot>?start=<token>` deep link; the webhook's new `/start <token>` handling completes the handshake (`web/src/app/api/bot/connect/route.ts`, `NotificationsPanel.tsx`). Manual-SQL connect step is now optional fallback, not the documented path. Still needs @BotFather setup + `TELEGRAM_BOT_USERNAME` env var to actually run (see `docs/ver2.0 plan/REVIEW-BOT-SETUP-RUNBOOK.md`).
- Full session write-up: `.agents/execution-reports/2026-07-14-*.md` + `docs/ver2.0 plan/TIL-2026-07-14-*.md`.

## Open Threads

- **Web beta hard gate:** reconcile production migrations/Auth/RLS and pass the two-account isolation test before any external invitation.
- **Review bot:** finish @BotFather setup + set `TELEGRAM_BOT_USERNAME`; apply migration `010`; then advance-through-batch grading is the next follow-up. This is a temporary adapter, not a requirement for the public MVP.
- **Language tab** saves a preference only — pipeline is still hardcoded eng→Korean; per-clip language is future work.
- **Lint hook broken:** `npx eslint` pulls ESLint 10 (project pins 9) and crashes on every edit — use `npm run lint`/`--no-install` instead.
- Tests: postprocess + SRS + `select-due` are unit-tested (41 total); routes/pipeline/adapters untested.
- **Design migration:** app shell (player/practice/dashboard/settings via globals.css) still on legacy orange; migrating it to Cobalt Editorial tokens (`design-system/`) is open work.
- **Launch work:** execute the approved 2-week Explain-what-I-do web-beta plan. Keep native/TestFlight, Speaking Readiness recommendations, full multi-language localization, and any public YouTube API product separate from the first implementation plan.

## Code-reading / Interview-Prep Progress

*Per Code HQ's Code-reading Guide.md — 5-phase mock-interview prep, scoped to this project. Update Status when a phase advances.*

| Phase | Focus | Status |
| :---- | :---- | :---- |
| 1 — 지피지기 | 프로젝트 뼈대·기본기 | Not started |
| 2 — 전체 숲 보기 | 폴더 구조·데이터 흐름 | Not started |
| 3 — 핵심 로직 현미경 | 상태 관리·API 비동기 | Not started |
| 4 — 클린 코드·최적화 | 리팩토링·성능·보안 | Not started |
| 5 — 실전 모의 면접 | 압박 질문·STAR 서사 | Not started |
