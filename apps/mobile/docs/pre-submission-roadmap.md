# Pre-submission roadmap (Saylo / mobile)

> **Core strategy:** cut initial cost + scope to **ship first**, but have **legal prep · first experience · core practice · shareable branding** in place before App Store submission. Detail polish (home, deep-learning practice) is **post-launch, with friends**.

Statuses: ☐ todo · ◐ in progress · ☑ done. Update as we go.

## Before submission (must)

### Release scope
- ☐ **Exclude Library from the release build; keep it for personal TestFlight.** Replace the Library tab (in the release variant) with **Settings**. Library stays available in the TestFlight/personal build.
- ☐ **My Page (마이페이지):** minimal customization surface. Role split vs Settings = **decide later**.

### Legal / privacy (submission gate) — see `audio-recording-plan.md`
- ☑ `NSMicrophoneUsageDescription` + `NSSpeechRecognitionUsageDescription` (mic string says recordings are saved) + `ITSAppUsesNonExemptEncryption: false` — in `app.json`, committed (`7c2f443`) and live in the device build.
- ☐ Privacy Manifest (`expo.ios.privacyManifests`) required-reason APIs (audit `node_modules/**/PrivacyInfo.xcprivacy`).
- ☑ Recording indicator (Apple 2.5.14) — red "Listening" pill + waveform on the self-talk screen.
- ☐ Privacy policy (recordings **on-device only, deletable**; no Audio-Data nutrition label while local-only).
- ☑ In-app **delete** control for any stored recording (native-confirm Delete in session detail).

### Core practice
- ☐ **Phrase practice UI improvement.** The complex Deep-Learning practice flow = **research → redesign later** (post-launch).
- ☑ **Voice recording — Phase 1 (local-only).** Done + device-verified (`7c2f443`, 2026-08-07): STT `persist` → move to `document/speak/{id}.wav` → replay (play/pause + progress bar) + native-confirm delete in session detail. Speaker routing deferred (post-launch). Plan in `audio-recording-plan.md`.

### Branding / shareable
- ☐ **Mirror frame customization** (ties to the self-talk = "Mirror" brand; frames were always meant to be customizable).
- ☐ **Self-talk screen share** (shareable moment → app branding / growth).

### First experience
- ☐ **Splash + onboarding flow cleanup.** (Splash shipped; concrete user-journey / when-it-shows + splash→onboarding double-welcome still to resolve.)

## Post-launch (with friends)
- ☐ **Recording playback → main speaker** (currently earpiece). Isolate via the recognizer's `setCategoryIOS` `defaultToSpeaker` — NOT from the playback screen (shared AVAudioSession degrades STT gain). See `postmortems/2026-08-07-stt-final-truncated-audio-session-thrash`.
- ☐ Home + per-screen detail design polish.
- ☐ Deep-Learning practice flow redesign (after research).
- ☐ Recording **Phase 2** — cloud sync (Supabase Storage, signed upload/download Edge Functions). See `audio-recording-plan.md`.

## Notes
- N:1 (learner L1 : English) — greet learners in their L1; a Settings "main language" will feed `setFirstLanguage()` (see `src/lib/first-language.ts`).
- self-talk internal name = `self-talk`; brand/product name = **Mirror**.
