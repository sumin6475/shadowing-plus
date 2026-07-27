# Dev — Memory

*Deploy runbook + recurring errors and their fixes. Seeded from the repo's CLAUDE.md / README; add fixes as we hit them.*

## Deploy runbook (known facts)
- **Deploy:** `npx vercel --prod` **from the repo root**, not `web/` (running in `web/` trips Vercel's 100 MB upload limit).
- **Env vars:** every key in `web/.env.local` must be added to the Vercel project's env **before** the first deploy.
- **Migrations:** paste `supabase/migrations/*.sql` into the Supabase SQL Editor **in order** (001 → 006). No CLI.
- **RLS is OFF on purpose** (`002_disable_rls.sql` re-forces it; Supabase silently re-enables on new tables). Do not "fix."
- **Timeouts:** the pipeline run route sets `maxDuration=300`. Vercel Hobby caps at 60s — a long video can hit it. Escalation order: (a) Pro `maxDuration`, (b) Supabase Edge Functions (150s), (c) Inngest free tier. *Code doesn't change, only the call site.*
- **Stack:** Next.js 16 (App Router/Turbopack), React 19, Supabase Postgres, Cloudflare R2, ElevenLabs Scribe v2 + GPT-4o-mini pipeline. npm work happens in `web/`. Tests: `npm test` (vitest — postprocess + SRS only).

## Recurring errors → fixes
*(none logged yet — each new break gets a one-line entry: symptom → cause → fix)*
