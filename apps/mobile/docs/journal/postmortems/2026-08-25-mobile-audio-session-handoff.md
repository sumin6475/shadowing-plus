# Postmortem — mobile audio session handoff race (STT `Audio session was interrupted`)

Date: 2026-08-25
Source: `feat/mobile-skeleton@867bb36`

## Symptom

Entering Talk while an app-owned player (phrase cloud voice, segment, Library,
or a session replay) was still settling its pause/finish could surface STT as
`Audio session was interrupted`, occasionally before any transcript had been
captured.

## Root cause

iOS has one process-wide `AVAudioSession`. Every app-owned player shared that
session with the on-device speech recognizer, but there was no single owner of
the transition:

- Phrase / segment / Library players configured only `{ playsInSilentMode: true }`
  on mount and never re-applied a speaker policy immediately before `play()`.
- No player used `keepAudioSessionActive`, so a delayed pause/finish could
  schedule a native session deactivation under a just-started recognizer.
- Talk's `start()` did not stop app-owned playback first, and its recognition
  category was implicit rather than explicit.
- Feedback logging read `savedIdRef.current` which could still be `null` while
  `createTalkSession` was in flight (a separate session-ID race).

## Fix

- Added `lib/audio-session.ts` as the single coordinator:
  - `prepareRecognitionSession()` — stops registered playback, sets a
    `playAndRecord`-capable `doNotMix` mode, marks the session active.
  - `prepareSpeakerPlayback()` — full playback policy
    (`playsInSilentMode:true`, `interruptionMode:doNotMix`,
    `allowsRecording:true`, `shouldRouteThroughEarpiece:false`,
    `shouldPlayInBackground:false`) plus a `measurement` → `default` mode
    restore, awaited immediately before every play.
  - `registerPlaybackStopper()` / `stopRegisteredPlayback()`.
  - `RECOGNITION_IOS_CATEGORY` — explicit nonmixing `playAndRecord` +
    `defaultToSpeaker` + `allowBluetooth` in `measurement` mode.
- All `useAudioPlayer` instances now use `keepAudioSessionActive: true`.
- `use-speech-session.ts` awaits `prepareRecognitionSession()` and passes
  `iosCategory`, and now keeps a structured `errorCode` + a
  `startupInterrupted` flag (only a zero-transcript startup handoff is retryable;
  real Siri/call/alarm interruptions are never silently retried).
- `talk.tsx` keeps one `createTalkSession` promise; feedback logging and
  phrase-suggest both await that exact id before persisting.
- Removed the now-unused `talk-audio-session.ts`.

## Verification status

- Static: `npm run typecheck` PASS; `npm run export:ios` PASS; lint baseline
  unchanged (no new errors).
- Device: **pending** — external-music → Talk, in-app-audio → Talk, speaker vs
  receiver, Bluetooth precedence, and Siri/call recovery must be exercised on a
  registered iPhone. See
  `quality/2026-08-25-mobile-nine-regressions.md`.
