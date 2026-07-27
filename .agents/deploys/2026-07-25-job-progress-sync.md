# Production deploy: job progress sync

- Date: 2026-07-25 (America/Detroit)
- Commit: `641f62b` — `fix(app): make processing status recovery visible`
- Deployment: `dpl_EeeYQQeqm6mS5XM25UqY3fPiB86A`
- Production URL: https://shadowing-plus.vercel.app

## Preconditions

- Lint passed (one pre-existing unused-variable warning in `web/scripts/wipe-supabase.mjs`).
- Tests passed: 52 tests across 8 files.
- Local and Vercel production builds passed.
- Independent code review approved; record: `.agents/code-reviews/2026-07-25-job-progress-sync.md`.
- Required production environment-variable names were confirmed in Vercel without reading values.
- Deployed from an isolated worktree at commit `641f62b`, excluding unrelated local work-in-progress.

## Verification

- Vercel deployment status: `Ready`.
- Production alias points to this deployment.
- Unauthenticated `GET /api/jobs` returns `401` with JSON `{ "error": "Unauthorized" }`.
- Vercel preview access protection prevented automated signed-in UI testing; the production build and route manifest completed successfully.

## Rollback

If a rollback is needed, promote the previous Vercel production deployment in the Vercel dashboard, or deploy the previous known-good commit. This release includes no database migration.
