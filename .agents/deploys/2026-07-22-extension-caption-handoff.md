# Production Deploy: Extension caption handoff

- **Target:** Vercel production
- **Stable URL:** https://shadowing-plus.vercel.app
- **Deployment:** `dpl_Hfbz57zE2DFGL9qYQx3bfb3vb35D`
- **Commit:** `8061627 fix(extension): forward browser caption tracks`

## Pre-deploy checks

- `npm test`: 52 tests passed.
- `npm run lint`: passed with the pre-existing unused-variable warning in `scripts/wipe-supabase.mjs`.
- `npx tsc --noEmit`: passed.
- `npx next build --webpack`: passed. Webpack was used because the local Turbopack process did not exit cleanly.
- Vercel environment-variable names were inspected; `EXTENSION_ALLOWED_ORIGIN` is set for Production.
- Review: `.agents/code-reviews/extension-caption-handoff.md` — APPROVE.

## Commands

1. `vercel deploy --yes` → preview deployment ready.
2. `vercel deploy --prod --yes` → production deployment ready.
3. `vercel inspect https://shadowing-plus-hiosmlovt-sumin6475s-projects.vercel.app` → Ready, stable alias attached.
4. `POST /api/extension/prepare` without credentials from the configured extension origin → JSON `401 Unauthorized` with the expected CORS headers.

## Rollback

In the Vercel dashboard, promote the previous production deployment (`6chvJmn8tbxuY8oLGEv3kX9LXQVs`) or use `vercel rollback` against the prior deployment. This release has no database migration, so no data rollback is needed.
