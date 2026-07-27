# Feature: Private YouTube ASR fallback

This plan should be complete, but validate documentation links, codebase patterns, and task sanity before implementing. Pay special attention to the naming of existing utils, types, and models — import from the right files.

## Feature Description

For the owner-only YouTube Chrome extension, retain official YouTube captions as the fast, zero-ASR-cost path. If no usable caption track is available, let the owner explicitly choose an ASR fallback that obtains audio through a separately deployed, private worker and runs the app's existing transcription → contextual translation pipeline. The panel must show the incremental cost, explicit consent, and useful progress states.

The worker is deliberately outside Vercel and is intended to run later on the owner's VPS/Dokploy deployment. It must never be publicly callable or made available to ordinary users.

## User Story

As the owner using Shadowing Plus privately,
I want to generate a full, contextual transcript when a YouTube video has no official captions,
So that I can test the same learning experience without relying on Language Reactor or real-time subtitle fragments.

## Problem Statement

Some videos display transcript-like text through other extensions but expose no usable first-party YouTube caption track. The current extension correctly fails in that case because it only imports caption tracks. The app already has robust ASR, translation, cost tracking, R2 storage, and job progress machinery, but it has no compliant-by-design audio acquisition path for a YouTube reference.

## Solution Statement

Add a private `youtube-asr-worker` service boundary. The Vercel app creates an owner-scoped fallback job and short-lived R2 upload URL; the private worker is the only component permitted to acquire the audio, normalize it, upload a temporary audio object, and signal completion with an HMAC-authenticated callback. The existing pipeline then resumes from `transcribe`, so Groq/ElevenLabs provider routing, post-processing, whole-video contextual translation, usage events, and persistence remain the single implementation.

The extension shows a separate **Generate with ASR** choice only after caption acquisition fails, estimates the ASR + translation price from the player duration, and requires a second confirmation. It never silently downloads or records media.

## Metadata

**Feature Type**: New Capability
**Complexity**: High
**Systems Affected**: Chrome extension, Next.js extension APIs, private worker service, R2, Supabase jobs/usage, pipeline, deployment configuration
**Dependencies**: `yt-dlp` + `ffmpeg` in a private Docker worker, Cloudflare R2, Groq Whisper, Vercel, future VPS/Dokploy, HMAC secret
**Source PRD**: N/A
**PRD Phase**: N/A

---

## CONTEXT REFERENCES

### Relevant codebase files — MUST READ BEFORE IMPLEMENTING

- `web/src/app/api/youtube/import/route.ts:294-399` — current caption-only YouTube job creation and direct `segments.json` write.
- `web/src/app/api/extension/prepare/route.ts:18-71` — extension authentication, cache lookup, and in-process import delegation.
- `extension/content.js:206-271` — caption attempt, Prepare UI, progress view, and current translation-only estimate.
- `extension/service-worker.js:120-154` — extension-to-API message pattern.
- `web/src/lib/pipeline/orchestrator.ts:9-68` — resumable stage runner.
- `web/src/lib/pipeline/stage_2_transcribe.ts:114-153` — existing ASR path, word timing, and actual usage recording.
- `web/src/lib/asr/provider.ts:5-18` and `web/src/lib/asr/groq.ts:41-82` — provider selection and Groq request contract.
- `web/src/lib/pipeline/stage_3_postprocess.ts` and `web/src/lib/pipeline/stage_4_translate.ts:1-240` — the existing complete-transcript cleanup and contextual Korean translation pipeline.
- `web/src/lib/pipeline/jobs.ts:42-178` — job creation/statuses and the `jobs/{id}/audio.mp3` convention.
- `web/src/lib/pipeline/stage_5_persist.ts:24-34` — preserve `youtube://` playback references even when temporary audio exists.
- `web/src/lib/r2.ts:1-142` — private R2 object helpers and signed upload/download URLs.
- `web/src/lib/usage.ts:18-100` — ASR and OpenAI cost estimate/recording implementation.
- `web/src/lib/youtubeImport.ts:1-29` and `docs/ver2.0 plan/2026-07-19-youtube-import-personal-use-decision.md` — owner-only boundary and the existing legal/operational decision.
- `supabase/migrations/001_rebuild_schema.sql:61-94` and `web/src/lib/types.ts:67-111` — jobs status/stage database and TypeScript contracts.

### New files to create

- `services/youtube-asr-worker/Dockerfile` — private worker image with pinned `yt-dlp` and `ffmpeg`.
- `services/youtube-asr-worker/package.json` — worker-only runtime/dependencies/scripts.
- `services/youtube-asr-worker/src/server.ts` — authenticated acquisition request, command execution, R2 upload, callback.
- `services/youtube-asr-worker/src/auth.ts` — timestamped HMAC verification and replay-window checks.
- `services/youtube-asr-worker/src/commands.ts` — constrained `yt-dlp` / `ffmpeg` invocation without shell interpolation.
- `services/youtube-asr-worker/README.md` — private Dokploy/VPS deployment, environment variables, retention, and rollback.
- `web/src/app/api/internal/youtube-asr/complete/route.ts` — HMAC-authenticated worker callback that transitions a pending ASR job and starts the pipeline from `transcribe`.
- `web/src/app/api/extension/asr-fallback/route.ts` — owner-only consented fallback-job creation and worker dispatch.
- `supabase/migrations/017_youtube_asr_jobs.sql` — explicit job ingestion mode and acquisition status/stage support.
- `web/src/lib/youtube-asr.ts` — Vercel-side dispatch payload signing, duration caps, and job-mode helpers.
- `web/src/lib/__tests__/youtube-asr.test.ts` — HMAC, duration cap, worker request, and route decision tests.

### Relevant documentation — READ BEFORE IMPLEMENTING

- [Chrome tabCapture API](https://developer.chrome.com/docs/extensions/reference/api/tabCapture)
  - Specific section: user-gesture requirement and preserving tab audio.
  - Why: the non-downloader alternative remains the fallback-of-last-resort; do not accidentally add background capture without consent.
- [Chrome offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen)
  - Specific section: offscreen document permissions and lifecycle.
  - Why: required only if a later recording fallback is added; keep it out of the initial worker path.
- [Groq Speech-to-Text](https://console.groq.com/docs/speech-to-text)
  - Specific section: `verbose_json`, timestamp granularities, file limits, duration billing, and supported formats.
  - Why: validates existing provider assumptions, caps upload/segment sizing, and informs the UI estimate.
- [YouTube automatic captions](https://support.google.com/youtube/answer/6373554)
  - Specific section: availability and quality limitations.
  - Why: explain why official captions stay preferred and ASR needs an explicit fallback label.
- [YouTube import personal-use decision](../../docs/ver2.0%20plan/2026-07-19-youtube-import-personal-use-decision.md)
  - Specific section: owner-only scope and non-public feature rationale.
  - Why: this feature intentionally expands the risk boundary and must remain owner-only.

### Patterns to follow

**Owner gate:**

```ts
// SOURCE: web/src/lib/youtubeImport.ts:20-29
export function canImportYoutube(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return allowlist().includes(userId);
}
```

**Private media hand-off:**

```ts
// SOURCE: web/src/lib/r2.ts:87-99
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSec = 3600,
): Promise<string> {
  return getSignedUrl(client(), new PutObjectCommand({
    Bucket: bucket(), Key: key, ContentType: contentType,
  }), { expiresIn: expiresInSec });
}
```

**Actual ASR cost recording:**

```ts
// SOURCE: web/src/lib/pipeline/stage_2_transcribe.ts:134-144
await recordUsage({
  jobId,
  userId: job.user_id,
  label: job.title,
  provider: provider.name === "scribe" ? "elevenlabs" : "groq",
  model: provider.name === "scribe" ? "scribe_v2" : "whisper-large-v3",
  kind: "transcribe",
  audioSeconds: data.audioDurationSecs ?? 0,
});
```

**Resumable job runner:**

```ts
// SOURCE: web/src/lib/pipeline/orchestrator.ts:38-50
for (let i = startIdx; i < STAGE_SEQUENCE.length; i++) {
  const stage = STAGE_SEQUENCE[i];
  try {
    await runStage(stage, jobId);
  } catch (err) {
    await setJobFailed(jobId, stage, msg);
    throw err;
  }
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Explicit private-ASR job contract

Add `ingestion_mode` (`upload`, `youtube_captions`, `youtube_asr`) and an `acquiring` job status/current stage. Preserve `source_key = youtube://{videoId}` for YouTube playback while `audioKeyFor(job)` continues to resolve its temporary `jobs/{id}/audio.mp3` object. Extend stale-job cleanup to include the acquisition state.

Introduce typed worker payloads with `jobId`, canonical YouTube ID, expected duration, R2 signed PUT URL, callback URL, issued-at timestamp, and nonce. Sign the exact serialized payload with a dedicated `YOUTUBE_ASR_WORKER_SECRET`; accept only a short timestamp window and reject a callback whose job is not owner-scoped or in `acquiring` state.

### Phase 2: Private worker service

Build a Docker-only, unexposed HTTP service. It verifies the HMAC before accepting any request, permits only canonical `youtube.com`/`youtu.be` URLs, enforces a configured duration cap before audio processing, and uses argument arrays (`spawn`, never a shell string) to acquire best audio and normalize to a bounded mono audio file. It uploads only to the caller-issued signed R2 key, deletes its local temporary files in `finally`, and calls the Vercel completion endpoint. It must log job IDs and stages, never URLs with signed query strings or secrets.

Do not add this worker to Vercel. Docker/Dokploy deployment is a NEEDS-HUMAN step because it needs a private domain/network and injected secrets.

### Phase 3: Vercel dispatch and pipeline resumption

Keep `/api/extension/prepare` caption-first. When both approved browser tracks and the existing server caption path produce zero usable segments, return a structured `asrFallbackAvailable` response rather than an ambiguous caption error.

`/api/extension/asr-fallback` requires extension bearer auth, the same owner allowlist, video-duration validation, an explicit `confirmed: true` body value, and an idempotency/cache check. It creates the ASR job, issues the R2 PUT URL, dispatches the signed worker payload, and returns the job ID.

On a verified callback, mark acquisition complete and invoke `runPipeline(jobId, "transcribe")`. This reuses stage 2 through 5 unchanged. Ensure persistent video metadata still points to the YouTube URL and that only the temporary audio object is used for ASR.

### Phase 4: Extension UX and cost transparency

Use the player duration to calculate the existing translation estimate plus provider-specific ASR estimate. When captions are unavailable, show English-only UI:

- `No YouTube captions were found.`
- `Generate full subtitles with ASR` action.
- Estimated ASR, translation, and total cost.
- Explicit confirmation copy stating the personal worker will process this video’s audio.
- Progress states: `Getting audio`, `Transcribing`, `Improving transcript`, `Translating with context`, `Saving`.

Retain the ordinary Prepare button for official captions. Do not default to ASR or call the private worker before consent. The existing Settings usage view continues to use `usage_events`; display the actual provider/model after completion.

### Phase 5: Retention, retry, and operator UX

After Stage 2 writes `raw_transcript.json`, delete temporary R2 audio for `youtube_asr` jobs unless a later deliberate replay feature opts in. Retain only transcript, translations, usage events, and the YouTube reference. Implement a retry that restarts acquisition only when audio is absent; a downstream retry must resume from its failed stage and must not reacquire/rebill ASR.

Document Dokploy deployment, worker health endpoint, rotating the HMAC secret, updating `yt-dlp`, R2 CORS/URL expiry, duration cap, and manual rollback (disable `YOUTUBE_ASR_WORKER_URL` to return immediately to caption-only mode).

---

## STEP-BY-STEP TASKS

### UPDATE `supabase/migrations/017_youtube_asr_jobs.sql`

- **IMPLEMENT**: Add `ingestion_mode`, `acquiring` status/stage constraints, defaults/backfill, and an acquisition-state index.
- **PATTERN**: `supabase/migrations/001_rebuild_schema.sql:61-94`, `supabase/migrations/012_usage_provider_groq.sql:11-20`.
- **GOTCHA**: Use idempotent `ALTER TABLE`/constraint replacement so the migration is safe in the existing Supabase project.
- **VALIDATE**: Run migration in a disposable Supabase database; insert caption, ASR, and invalid-mode fixture rows.

### UPDATE `web/src/lib/types.ts` and `web/src/lib/pipeline/jobs.ts`

- **IMPLEMENT**: Add job ingestion mode and acquisition status/stage types; preserve `audioKeyFor()` semantics for a YouTube ASR job.
- **PATTERN**: `web/src/lib/types.ts:67-111`, `web/src/lib/pipeline/jobs.ts:42-178`.
- **GOTCHA**: Do not infer ASR mode from `source_key`; `youtube://` must continue to control embed playback in Stage 5.
- **VALIDATE**: `npx tsc --noEmit` and focused unit tests for key resolution and stale-job selection.

### CREATE `web/src/lib/youtube-asr.ts`

- **IMPLEMENT**: Canonical URL validation, owner duration cap, cost estimate (`Groq + current translation estimate`), nonce/timestamp HMAC signing, dispatch timeout, and callback verification.
- **PATTERN**: `web/src/lib/youtubeImport.ts:20-29`, `web/src/lib/usage.ts:18-45`.
- **IMPORTS**: Node `crypto`, R2 signed URL helper, job helpers.
- **GOTCHA**: Use constant-time signature comparison; reject stale/replayed requests; do not put the HMAC secret in any `NEXT_PUBLIC_*` variable.
- **NEEDS-HUMAN**: `YOUTUBE_ASR_WORKER_URL`, `YOUTUBE_ASR_WORKER_SECRET`, `YOUTUBE_ASR_MAX_DURATION_SECONDS` production values.
- **VALIDATE**: `npm test -- --run src/lib/__tests__/youtube-asr.test.ts`.

### CREATE `web/src/app/api/extension/asr-fallback/route.ts` and callback route

- **IMPLEMENT**: Create/dispatch an owner-only ASR job after explicit consent; receive verified worker completion and start `runPipeline(jobId, "transcribe")`.
- **PATTERN**: `web/src/app/api/extension/prepare/route.ts:18-71`, `web/src/lib/pipeline/orchestrator.ts:38-50`.
- **GOTCHA**: The callback must never accept a caller-provided R2 key or job owner. Load the job server-side, ensure it is `youtube_asr` + `acquiring`, then transition it atomically.
- **NEEDS-HUMAN**: Private worker endpoint must be reachable from Vercel before enabling the UI.
- **VALIDATE**: Route tests for unauthenticated request, non-owner, absent consent, idempotent repeat, bad HMAC, stale timestamp, and valid callback.

### UPDATE `web/src/app/api/extension/prepare/route.ts`, `web/src/app/api/youtube/import/route.ts`, and extension job APIs

- **IMPLEMENT**: Return a structured no-caption condition that permits the ASR UX; retain the existing caption success/cache behavior; select `transcribe` only for completed YouTube ASR jobs.
- **PATTERN**: `web/src/app/api/youtube/import/route.ts:319-384`, `web/src/app/api/extension/jobs/[id]/route.ts`.
- **GOTCHA**: Never create a duplicate job or bill a repeat click. A ready caption job always wins over ASR fallback; a pending ASR job is returned idempotently.
- **VALIDATE**: API integration test using mocked caption failure + worker dispatch and a caption-success regression test.

### CREATE `services/youtube-asr-worker/*`

- **IMPLEMENT**: Dockerized private HTTP service, HMAC middleware, strict input validation, process-safe `yt-dlp`/`ffmpeg` invocation, R2 PUT upload, callback/retry, cleanup, and `/healthz`.
- **PATTERN**: R2 signed handoff contract in `web/src/lib/r2.ts:87-99`; no existing worker implementation exists.
- **GOTCHA**: No shell interpolation, no arbitrary extractor options, no public ingress, no signed URLs in logs, hard maximum duration/file size, and cleanup in `finally`/signal handlers.
- **NEEDS-HUMAN**: VPS/Dokploy private service, outbound network policy, secret injection, image update policy.
- **VALIDATE**: Docker build; mocked signed PUT/callback test; integration against an owner-approved short video in the private environment.

### UPDATE `extension/content.js`, `extension/service-worker.js`, and panel styles

- **IMPLEMENT**: Caption-first Prepare UI; ASR fallback confirmation; split estimated costs; stage-specific English status text; retry/failure copy.
- **PATTERN**: `extension/content.js:206-271`, `extension/service-worker.js:120-154`.
- **GOTCHA**: Do not invoke ASR on first click. Clear UI state on YouTube SPA navigation and do not expose worker URLs/secrets in the extension.
- **VALIDATE**: `node --check extension/content.js`, `node --check extension/service-worker.js`, manually test caption path, ASR confirmation, job polling, cancellation/navigation, and cached result.

### UPDATE `web/src/lib/pipeline/stage_2_transcribe.ts`, retention helpers, and Settings usage UI if needed

- **IMPLEMENT**: Reuse current Stage 2 from `transcribe`; remove temporary audio only after raw transcript checkpoint succeeds; keep existing actual-cost usage event behavior.
- **PATTERN**: `web/src/lib/pipeline/stage_2_transcribe.ts:121-152`, `web/src/lib/r2.ts:50-61`.
- **GOTCHA**: Never delete the source before Groq/Scribe returns and `raw_transcript.json` is durable. A later translation retry must not need audio.
- **VALIDATE**: Test successful cleanup, failed ASR retention for retry, and one `usage_events` row with actual duration/provider.

### CREATE deployment/operator documentation

- **IMPLEMENT**: Dokploy/VPS environment, private ingress, secret rotation, health checks, logs, cap configuration, worker disable switch, recovery, and rollback.
- **PATTERN**: `docs/ver2.0 plan/2026-07-19-youtube-import-personal-use-decision.md`.
- **NEEDS-HUMAN**: Confirm VPS provider/Dokploy domain and whether worker should be reachable by allowlisted Vercel egress or an authenticated public endpoint.
- **VALIDATE**: A clean-host Docker deployment checklist from the README.

---

## TESTING STRATEGY

### Unit tests

- HMAC signing/verifying: valid, malformed, expired, replayed, and wrong-secret requests.
- URL/domain canonicalization and duration/file-size caps.
- Job mode/status transition guards and audio-key behavior.
- ASR cost estimate equals duration × current Groq rate plus the existing translation estimate.
- Temporary R2 cleanup occurs only after durable raw transcript persistence.

### Integration tests

- Official caption available → existing caption import path, no worker request, no ASR cost.
- Captions unavailable → confirmation required → worker dispatch → callback → transcribe/postprocess/translate/persist.
- Duplicate click while acquiring → same job returned and one worker request.
- Callback rejection for bad HMAC, stale timestamp, wrong mode, already-completed job, or wrong R2 key.
- Worker failure/timeout → job marked failed with safe retry affordance and no exposed worker internals.

### Edge cases

- Ads, Shorts, playlist SPA navigation, private/age-gated/region-blocked video, live stream, unavailable video, no audio, video over configured duration, quota reached, R2 URL expiry, worker restart, Groq file-size limit, and OpenAI/Groq billing failure.
- Captions appear after initial failure: caption path must remain preferred when the owner retries before invoking ASR.
- Existing cached caption/ASR result belongs to a different account: never cross user boundaries.

---

## VALIDATION COMMANDS

### Level 1: Syntax & style

```bash
cd web && npm run lint
cd .. && node --check extension/content.js && node --check extension/service-worker.js
```

### Level 2: Types and unit tests

```bash
cd web && npx tsc --noEmit && npm test
```

### Level 3: Production build

```bash
cd web && npx next build --webpack
cd services/youtube-asr-worker && docker build -t shadowing-plus-youtube-asr:local .
```

### Level 4: Private integration

```bash
# Use only an owner-approved short YouTube video, private worker URL, and test account.
# Verify one job, one worker request, one ASR usage event, contextual translations,
# temporary audio cleanup, and same-account cache reuse.
```

### Level 5: Manual extension UX

- Reload the unpacked extension, refresh YouTube, prepare a video with official captions, and confirm no ASR consent appears.
- Prepare an owner-approved video without captions, verify the ASR estimate and confirmation copy, watch every progress state, then verify the resulting phrases/bookmarks appear in the app.
- Retry a failed worker callback and verify it does not duplicate charges or jobs.

---

## ACCEPTANCE CRITERIA

- [ ] Official-caption imports behave exactly as before and never use ASR.
- [ ] ASR is available only to the authenticated allowlisted owner and only after explicit UI confirmation.
- [ ] Private worker requests are HMAC-authenticated, replay-protected, domain-restricted, duration-bounded, and never public.
- [ ] The worker uses no shell interpolation and deletes local temporary media on all outcomes.
- [ ] Existing ASR/transcript post-process/contextual translation stages are reused rather than duplicated.
- [ ] UI shows estimated ASR + translation cost before work and actual spend appears in Settings after work.
- [ ] Temporary YouTube ASR audio is removed after checkpointing; transcripts and learning data remain.
- [ ] Caption, fallback, retry, and cache flows have automated coverage and all validation commands pass.
- [ ] Dokploy/VPS setup and rollback are documented before enabling the feature.

## NOTES

- This is an owner-only, personal testing capability. It expands the risk boundary documented in the existing YouTube decision and must remain gated by the current authenticated owner allowlist. It is not approved for public launch.
- Vercel should orchestrate and receive callbacks only. A long-running media acquisition binary belongs in the private worker so later migration to a VPS/Dokploy stack changes deployment, not product architecture.
- The current Groq implementation uses `whisper-large-v3` at the stored `$0.111/hour` estimate. Keep that quality-first default for initial UX validation; a later deliberate optimization can offer `whisper-large-v3-turbo` separately rather than silently changing expected quality.
- Confidence score: **8/10**. Implementation is well supported by the existing pipeline; private worker networking, secret provisioning, and the owner's informed acceptance of the personal-use risk are the remaining external dependencies.
