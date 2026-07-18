@AGENTS.md

# Shadowing Plus

## Identity

An English-shadowing webapp + installable PWA: users drop in a video/audio file (or import from YouTube), a cloud ASR + translation pipeline produces sentence-level transcripts with Korean translations, and they shadow line-by-line. Bookmarked sentences feed an SM-2-lite spaced-repetition Practice mode. Solo-built and **actively developed** (recent work: YouTube import, usage/cost tracking, storage dashboard) — well past MVP, not yet a released product.

## Stack & Architecture

- **TypeScript 5, Next.js 16 (App Router + Turbopack), React 19, Tailwind 4.** All app code lives in `web/` — there is **no root `package.json`**.
- **Data:** Supabase Postgres (**RLS intentionally OFF** — single-user; anon key reads/writes directly). **Media:** Cloudflare R2 (S3 API, free egress). **Processing:** ElevenLabs Scribe v2 (ASR) + GPT-4o-mini (translation) on Vercel API routes. **Tests:** vitest (postprocess + SRS pure functions only).
- **Pipeline entry:** `web/src/app/api/jobs/[id]/run/route.ts` (`maxDuration=300`) → `web/src/lib/pipeline/orchestrator.ts` — 5 re-runnable stages (extract → transcribe → postprocess → translate → persist) with R2 JSON checkpoints.
- **Migrations:** `supabase/migrations/*.sql`, run manually in the Supabase SQL Editor (no CLI). The repo now has migrations **005** (video_practice_status) and **006** (usage_events) beyond what older docs describe.
- **Run:** `cd web && npm install && npm run dev` (:3000); `npm test`; `npm run build`; `npm run lint`; `npm run icons`. Deploy `npx vercel --prod` **from the repo root**, not `web/`.

## Workflow

1. All npm work happens in `web/`; run migrations by pasting SQL into the Supabase SQL Editor in order.
2. Postprocess + SRS are the only unit-tested code (`npm test`) — keep them pure (`Segment[] → Segment[]`).
3. Deploy from the repo root.

## Rules

Follow Code HQ's CLAUDE.md and Sumin's voice principles in 00_Resources (voice-principles.md).

- **RLS is now ON with per-user policies** (migration `008_auth_rls.sql`, Phase 1 multi-user). This reverses the old single-user "RLS off" stance — `002_disable_rls.sql` is history. Client queries are scoped by `auth.uid()`; service-key routes must filter by `user_id` themselves (the service key bypasses RLS).
- **Deploy only from the repo root** (`npx vercel --prod`) — running inside `web/` trips the 100 MB upload limit. **Prefer `/deploy`** (its post-deploy checks catch what bare `vercel --prod` doesn't); if deploying by hand, do the two checks below every time.
- **After a deploy, verify the route is actually shipped — read the response BODY, not just the status.** `curl` a key API route on `shadowing-plus.vercel.app`: an HTML `<!DOCTYPE html>…` 404 means the route was never deployed (missing file or `.vercelignore` dropped it), while a JSON body (`{"error":…}`) means it exists and ran. A route that 404s only in production is a deploy/ignore problem, not a code problem. Also confirm the stable alias serves the new build (`vercel alias set <deployment-url> shadowing-plus.vercel.app` if it lags).
- **`.vercelignore` patterns are unanchored** — a bare `media`/`model`/`supabase` line matches `web/src/app/api/media/` etc. and silently drops it from the upload (this 404'd all playback once). Anchor root-only ignores with a leading `/`; check `.vercelignore` at BOTH repo root and `web/`.
- **A failure that spans desktop + mobile + PWA at once is a shared server/deploy cause, not a client-specific policy** — verify the API/route responds in production before writing client-side workarounds.
- **Translation matches by batch position (k), not the GPT-returned index** (drop/reorder defense); the fixed prompt is a `system` message for caching.
- Language pair is centralized in `web/src/lib/pipeline/languages.ts` (currently `eng` → Korean); changing it also means swapping the font in `layout.tsx`.

*Full reference lives in README.md + ARCHITECTURE.md (and AGENTS.md, imported above); this CLAUDE.md is the senior-dev-partner layer on top.*
