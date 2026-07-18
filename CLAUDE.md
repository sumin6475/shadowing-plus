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

- **RLS is OFF on purpose** (single-user) — don't "fix" it; `002_disable_rls.sql` re-forces it off because Supabase silently re-enables it on new tables.
- **Deploy only from the repo root** (`npx vercel --prod`) — running inside `web/` trips the 100 MB upload limit.
- **Translation matches by batch position (k), not the GPT-returned index** (drop/reorder defense); the fixed prompt is a `system` message for caching.
- Language pair is centralized in `web/src/lib/pipeline/languages.ts` (currently `eng` → Korean); changing it also means swapping the font in `layout.tsx`.

*Full reference lives in README.md + ARCHITECTURE.md (and AGENTS.md, imported above); this CLAUDE.md is the senior-dev-partner layer on top.*
