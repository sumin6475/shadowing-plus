# Quality snapshot — mobile nine-regression repairs

Date: 2026-08-25
Source: `feat/mobile-skeleton@867bb36` (writable worktree)
Plan: `.agents/plans/mobile-nine-regression-repairs.md`

## Static / release gate (real outcomes)

| Check | Command | Result |
|---|---|---|
| Source identity | `git branch --show-current` | `feat/mobile-skeleton` |
| Source identity | `git rev-parse HEAD` | `867bb36e7cd1a6e1adf21bea85b66be682564e3d` |
| Release config | `npm run verify:release-config` | PASS |
| TypeScript | `npm run typecheck` | PASS (no errors) |
| Lint baseline | `npm run lint:baseline` | 11 pre-existing errors + 25 warnings — unchanged from before this work (no new errors) |
| iOS export | `npm run export:ios` | PASS |
| Whitespace | `git diff --check` | OK |

## Regression acceptance IDs

| ID | Change | Static result | Simulator | Device |
|---|---|---|---|---|
| `REVIEW-01` | Review card flips question ↔ answer (phrases.tsx) | typecheck PASS | pending | n/a |
| `FAB-01` | Solid `t.colors.acc` FAB, no gradient/border/clip (capture.tsx) | typecheck PASS | pending | n/a |
| `AUDIO-01`/`AUDIO-02` | Shared `lib/audio-session.ts` coordinator + `keepAudioSessionActive` + explicit `iosCategory` | typecheck/export PASS | provisional | **device pending** |
| `REHEARSAL-01` | Shared `MirrorPreview` + take Play/Pause (practice.tsx/talk.tsx) | typecheck/export PASS | pending | **device pending** (mirror direction, replay route, denial→Settings) |
| `STUDIO-01` | `speakingDataRevision` + request token refresh (shell/nav/world) | typecheck PASS | pending | n/a |
| `SESSION-02` | Equal section spacing + `TalkFeedbackDetail` + `feedback`/`phrase` routes + `fetchPhraseById` | typecheck/export PASS | pending | n/a |
| `SESSION-02` (persistence) | migration 027 + structured feedback write/read + exact session id + `talk_session_id` in phrase-suggest | typecheck PASS | n/a | **NEEDS-HUMAN** — migration/Edge deploy + `verify:rls` |
| `GOAL-01` | Account-scoped `Daily speaking goal` + `Last 7 days` rings (practice-length/settings/edit-profile/studio) | typecheck PASS | pending | n/a |

## Explicit device-pending items (never claimed from Simulator)

- External Apple Music/Spotify → Talk: music pauses, no startup interruption, continuous transcript.
- In-app phrase/Library audio naturally ending → Talk STT survives.
- Phrase/Review/segment/Library/Quick/Session playback route (speaker vs receiver; Bluetooth/headset precedence).
- Talk → finish → replay → Talk (`TALK-02`): normal input gain + complete transcript.
- Session replay route classification vs Voice Memos/Music (`builtInSpeaker` stereo expected vs `builtInReceiver` defect).
- Quick front camera mirror direction; denial → Settings → retry; record → play → record transcription.
- Siri/call/alarm interruption recovery after transcript began.

## Backend (NEEDS-HUMAN)

- `supabase/migrations/027_talk_feedback_detail_contract.sql` created (idempotent `ADD COLUMN IF NOT EXISTS`; nullable `diagnosis_tag`, `action`, `explanation`, `schema_version`; session index). Not applied to production.
- `supabase/functions/talk-phrase-suggest/index.ts` now persists `talk_session_id` on `phrase_events`. Requires redeploy.
- `npx supabase migration list --linked` timed out in this environment (network); remote history was not confirmed via CLI. Local 027 is unused.
- `npm run verify:rls` not run (requires hidden test credentials + live Supabase access).
