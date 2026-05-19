@AGENTS.md

# Shadowing Plus

English shadowing webapp + installable PWA. Users upload video/audio in the browser; a cloud ASR + translation pipeline produces sentence-level transcripts; users shadow line-by-line. Bookmarks feed an SM-2 spaced-repetition practice mode.

## Project structure

```
shadowing_plus/
├── media/                              # local video stash (optional, .gitignore)
├── supabase/migrations/
│   ├── 001_rebuild_schema.sql          # base schema
│   ├── 002_disable_rls.sql             # forces RLS off (Supabase auto-re-enables)
│   ├── 003_folder_color.sql            # folders.color
│   └── 004_bookmarks_srs.sql           # SRS columns on bookmarks
└── web/                                # Next.js 16 app (App Router)
    ├── .env.local                      # Supabase + OpenAI + ElevenLabs + R2 keys
    ├── public/icons/                   # PWA icons (generated; replace with real logo)
    ├── scripts/
    │   ├── generate-icons.mjs          # SVG → PNG icon generator (@resvg/resvg-js)
    │   └── wipe-supabase.mjs           # one-shot data-wipe helper
    └── src/
        ├── app/
        │   ├── layout.tsx              # fonts, viewport, manifest meta
        │   ├── manifest.ts             # PWA manifest (standalone, themed)
        │   ├── mobile.css              # all .m-* mobile-shell styles + media-query gate
        │   ├── globals.css, home.css, bookmarks/bookmarks.css, player/[videoId]/clip.css, practice/practice.css
        │   ├── page.tsx                # / — library (renders desktop + MobileLibrary)
        │   ├── bookmarks/page.tsx      # /bookmarks (desktop + MobileBookmarks)
        │   ├── player/[videoId]/page.tsx  # dual shell, hoisted <video> element
        │   ├── practice/page.tsx       # /practice — fetches due bookmarks, renders both shells
        │   └── api/
        │       ├── upload/route.ts                 # presigned R2 URL + jobs row
        │       ├── jobs/route.ts, jobs/[id]/route.ts
        │       ├── jobs/[id]/run/route.ts, retry/route.ts
        │       ├── videos/[id]/route.ts            # cascading R2 + DB delete
        │       └── bookmarks/[id]/verdict/route.ts # SRS verdict → applyVerdict → DB
        ├── components/
        │   ├── AudioPlayer.tsx         # forwardRef wrapper over <audio>/<video>
        │   ├── UploadDropzone.tsx, JobCard.tsx
        │   ├── home/    Sidebar, NewFolderModal, Icons
        │   ├── clip/    ClipHeader, ClipPlayer (videoSlotRef), FocusLine, ClipControls (speed dropdown), Transcript, Icons
        │   ├── bookmarks/  BookmarkGroup, BookmarkItem, BookmarksEmpty, Icons
        │   ├── mobile/  MobileLibrary, MobileClip, MobileBookmarks, MobilePractice, MobileDrawer, MobileTabBar, Icons
        │   └── practice/  DesktopPractice
        └── lib/
            ├── types.ts                # DB row + pipeline types (Bookmark includes SRS state)
            ├── srs.ts                  # SM-2-lite pure function (+ __tests__/srs.test.ts)
            ├── use-is-mobile.ts        # SSR-safe matchMedia hook (gates effects only)
            ├── folder-color.ts         # deterministic palette + per-folder override
            ├── supabase.ts, supabase-admin.ts, r2.ts
            └── pipeline/
                ├── jobs.ts             # jobs-row state helpers
                ├── orchestrator.ts     # 5-stage sequence + retry-from-stage
                ├── stage_1_extract.ts  # ffmpeg-static (video → audio.mp3)
                ├── stage_2_transcribe.ts  # ElevenLabs Scribe v2
                ├── stage_3_postprocess.ts # composes the 5 postprocess functions
                ├── stage_4_translate.ts   # GPT-4o-mini batch translate
                ├── stage_5_persist.ts     # writes videos + segments rows
                └── postprocess/        # 5 pure functions + vitest tests
```

## Tech stack

- **Frontend**: Next.js 16.2.2, React 19, Tailwind CSS 4, TypeScript 5
- **DB / realtime**: Supabase Postgres (RLS off, anon key reads/writes directly)
- **Media storage**: Cloudflare R2 (S3 API, free egress)
- **Processing**: ElevenLabs Scribe v2 (ASR) + GPT-4o-mini (translation), running on Vercel API Routes
- **Testing**: vitest (postprocess + SRS pure functions)

## Next.js 16 gotchas

- `params`, `searchParams`, `cookies()`, `headers()` are all **Promises**. `await` them in server components. In client components use `use(params)`.
- `themeColor` lives in the `viewport` export, not `metadata` (deprecated path).
- API route handlers receive `{ params: Promise<{ id: string }> }`.

## DB schema (migration 001)

- **videos**: id, title, duration, audio_url, video_url(nullable), media_type('video'|'audio'), folder_id(nullable), created_at
- **segments**: id, video_id(FK CASCADE), index, start_time, end_time, text, translation, words(JSONB)
- **bookmarks**: id, segment_id(FK CASCADE), memo, created_at, **+ SRS columns from migration 004**: ease_factor, interval_days, due_at, last_verdict, last_reviewed_at, lapses
- **folders**: id, name, position, color, created_at
- **jobs**: id, video_id(nullable), title, media_type, source_key, status, current_stage, progress, error, created_at, updated_at
- `jobs` is added to the realtime publication (live progress on home)

## Pipeline (5 stages, JSON checkpoints in R2)

| Stage | Input | Output | Behavior |
|---|---|---|---|
| 1 extract | `jobs/{id}/source-*` | `jobs/{id}/audio.mp3` | ffmpeg-static (video only; no-op when media_type=audio) |
| 2 transcribe | audio R2 key | `jobs/{id}/raw_transcript.json` | ElevenLabs Scribe v2 (passes a presigned R2 URL as `cloud_storage_url`); word-level → sentence/gap chunks |
| 3 postprocess | raw_transcript.json | `jobs/{id}/segments.json` | merge_duplicates → drop_empty → fix_timing → regroup_sentences → remove_hallucinations |
| 4 translate | segments.json | `jobs/{id}/segments_translated.json` | GPT-4o-mini, batches of 5, positional mapping |
| 5 persist | segments_translated.json | videos + segments rows | media_type-aware audio_url / video_url, marks job ready |

Each stage is independently re-runnable. On failure the job stops with `current_stage` + `error` set; the home-card retry button resumes from any stage.

### Compute limits
- Vercel Hobby has a 60s timeout. A 1.5h video can hit it.
- Escalation order: (a) raise `maxDuration` on Pro, (b) Supabase Edge Functions (150s), (c) Inngest free tier.
- The code doesn't change; only the call site does. Today we run on (a).

### Postprocess is pure
`web/src/lib/pipeline/postprocess/*.ts` files have no I/O — `Segment[] → Segment[]`. Test them standalone with `npm test`.

## Dual-shell architecture

Library / Clip / Bookmarks / Practice each render **both** a desktop shell (`.home-app`, `.clip-page`, `.pr-page`) and a mobile shell (`.m-app`, `.m-practice`) on the same URL. CSS media queries at 768px gate which one paints. Data hooks live in the parent so both shells share state.

The clip page hoists the single `<video>` into a hidden pool; a `useLayoutEffect` re-parents it via `appendChild` into the active shell's `videoSlotRef`. Playback state survives the swap.

The mobile drawer is rendered **inline as a child of `.m-app`** (not via `createPortal`). Reason: a portal escapes the `.m-app` token scope, which makes iOS Safari's text-size-adjust inflate the drawer's fonts. z-index 50 on the drawer still trumps the tab bar (z:30) because `.m-app` doesn't create a stacking context.

## SRS (Practice)

`web/src/lib/srs.ts` is a pure SM-2-lite. Verdict deltas:
- **Again**: `interval = 0`, `ease = max(1.3, ease - 0.2)`, `lapses += 1`, due in 1 min. Within-session the item is re-pushed to the back of the queue (don't rely on `due_at` mid-session).
- **Good**: `interval = oldInterval === 0 ? 2 : oldInterval * ease` days. Ease unchanged.
- **Easy**: `interval = oldInterval === 0 ? 7 : oldInterval * ease * 1.3` days. Ease `+= 0.15`.

`/api/bookmarks/[id]/verdict` accepts either `{ verdict }` (runs applyVerdict) or `{ restore }` (writes raw state — used by the Undo button on both shells).

## PWA

- `manifest.ts` declares the standalone webapp. Icons under `web/public/icons/` are generated by `npm run icons` (uses `@resvg/resvg-js` to rasterize an inline SVG of "S+"). Swap the SVG template in the script to ship a real logo.
- iOS caches the install icon aggressively. After changing the icon, users must remove and re-add to the home screen.
- No service worker — `/practice` requires network.

## Env vars (`web/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...           # server-side only (API routes)
OPENAI_API_KEY=...
ELEVENLABS_API_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=shadowing-media
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

## Cloudflare R2 setup (one-time)

1. Cloudflare dashboard → R2 → Create bucket (e.g. `shadowing-media`).
2. **Public access**: bucket → Settings → "Public URL Access" → on. Put the `pub-xxxxx.r2.dev` host in `R2_PUBLIC_URL`.
3. **API token**: R2 → Manage R2 API Tokens → Create. Permissions: Object Read & Write, scoped to this bucket. Account ID is shown in the R2 sidebar.
4. **CORS** (browser uses presigned PUT to upload):
   ```json
   [{
     "AllowedOrigins": ["http://localhost:3000", "https://your-vercel-domain"],
     "AllowedMethods": ["GET","PUT","HEAD"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3600
   }]
   ```

## Supabase setup (one-time)

Paste each migration into Supabase dashboard → SQL Editor and run **in order**:

1. `supabase/migrations/001_rebuild_schema.sql`
2. `supabase/migrations/002_disable_rls.sql` (Supabase silently re-enables RLS on new tables; this forces it off)
3. `supabase/migrations/003_folder_color.sql`
4. `supabase/migrations/004_bookmarks_srs.sql` (Supabase will warn about an UPDATE without WHERE — that's the intentional backfill, uses COALESCE, safe to re-run)

The legacy Storage bucket `audio` is no longer used (media moved to R2). Leaving it in place is harmless.

## Data wipe (when needed)

```bash
cd web && node --env-file=.env.local scripts/wipe-supabase.mjs
```

Deletes rows + R2 objects only. Schema changes (DROP/CREATE) still go through the SQL Editor.

## Frontend dev

```bash
cd web && npm install        # first time
cd web && npm run dev        # http://localhost:3000
cd web && npm test           # vitest (postprocess + SRS)
cd web && npm run build      # Turbopack build
cd web && npm run icons      # regenerate PWA placeholder icons
```

## Player behavior

- `media_type='video'` + `video_url` present → split layout (video + transcript). Toggle "Hide video" for an audio-only layout.
- `media_type='audio'` or no video → transcript with a bottom audio player.

### Keyboard (player)
A=previous · S=repeat current (Shadow line) · D=next · Space=play/pause · R=A-B repeat · T=toggle translation · ←/→=seek ±3s

### Keyboard (practice, desktop)
Space=play/pause · 1/2/3=Again/Good/Easy · K or T=toggle KO · L=toggle A–B loop · S=toggle shadow · `,`=cycle speed · Esc=exit

## Theme

CSS variable-driven. Primary accent **cobalt `#3B6EE1`** (configurable per token block). Fonts: Pretendard (sans), Instrument Serif (serif), JetBrains Mono. Each scope (`.home-app`, `.clip-page`, `.m-app`, `.pr-page`, `.m-practice`) declares its own token block so they're self-contained.

## Vercel deployment

```bash
# from the REPO ROOT, not web/
npx vercel --prod
```

The project is registered as a monorepo with `web/` as the root. Running from `web/` triggers the 100 MB upload limit. Add every key from `.env.local` to the Vercel project settings before the first deploy. `R2_PUBLIC_URL` does **not** need to be registered with `next.config` (no `next/image` integration).
