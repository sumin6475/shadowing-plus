# Pre-submission roadmap (Saylo / mobile)

> **Core strategy:** cut initial cost + scope to **ship first**, but have **legal prep · first experience · core practice · shareable branding** in place before App Store submission. Detail polish (home, deep-learning practice) is **post-launch, with friends**.

Statuses: ☐ todo · ◐ in progress · ☑ done. Update as we go.

## Before submission (must)

### Release scope
- ☑ **Exclude Library from the release build; keep it for personal TestFlight.** Done 2026-09-10 via `src/lib/release-flags.ts` (`EXPO_PUBLIC_PREVIEW_FEATURES`, set for `development`/`preview` only). The Settings card was Library's only entry point, so the release build has no route to it. The bottom bar already moved to Studio.
- ☐ **My Page (마이페이지):** minimal customization surface. Role split vs Settings = **decide later**.

### Legal / privacy (submission gate) — see `audio-recording-plan.md`
- ☑ `NSMicrophoneUsageDescription` + `NSSpeechRecognitionUsageDescription` (mic string says recordings are saved) + `ITSAppUsesNonExemptEncryption: false` — in `app.json`, committed (`7c2f443`) and live in the device build.
- ☑ Privacy Manifest (`expo.ios.privacyManifests`) — added and verified 2026-09-10: `expo prebuild` emits `ios/Saylo/PrivacyInfo.xcprivacy`; `verify:release-config` guards its shape and fails if Audio Data is ever declared. **Audit note:** every native dep ships its own `PrivacyInfo.xcprivacy` (async-storage, expo-application/constants/device/file-system/localization/notifications/system-ui, RN core); `posthog-react-native` is JS-only so needs none. **The gap is the app target itself** — ready-to-paste block in `release/app-store-submission-audit.md` §B1.
- ☑ Recording indicator (Apple 2.5.14) — red "Listening" pill + waveform on the self-talk screen.
- ☑ Privacy policy (recordings **on-device only, deletable**; no Audio-Data nutrition label while local-only) — rewritten 2026-09-10 with recordings/camera/photos/OpenAI-consent/PostHog/in-app-delete sections. **Note:** the hosted `web/src/app/privacy/page.tsx` never mentions PostHog/analytics, camera, photo library, or the account-deletion path — see audit §B3.
- ☑ In-app AI consent naming OpenAI + revocable toggle (5.1.2(i), added 2025-11-13) — `src/lib/ai-consent.tsx`, `src/screens/privacy.tsx`.
- ☐ **Age-rating questionnaire** — mandatory since 2026-01-31; App Store Connect blocks submission until answered. Answers ready: `release/app-review-submission-kit.md` §2.
- ☐ **Demo account for App Review** (Guideline 2.1) — the app is fully sign-in gated. Seeding checklist + review-notes text ready: `release/app-review-submission-kit.md` §1.
- ☑ In-app **delete** control for any stored recording (native-confirm Delete in session detail).

### Core practice
- ☐ **Phrase practice UI improvement.** The complex Deep-Learning practice flow = **research → redesign later** (post-launch).
- ☑ **Voice recording — Phase 1 (local-only).** Done + device-verified (`7c2f443`, 2026-08-07): STT `persist` → move to `document/speak/{id}.wav` → replay (play/pause + progress bar) + native-confirm delete in session detail. Speaker routing deferred (post-launch). Plan in `audio-recording-plan.md`.

### Branding / shareable
- ☐ **Mirror frame customization** (ties to the self-talk = "Mirror" brand; frames were always meant to be customizable).
- ☐ **Self-talk screen share** (shareable moment → app branding / growth).

### First experience
- ☐ **Splash + onboarding flow cleanup.** (Splash shipped; concrete user-journey / when-it-shows + splash→onboarding double-welcome still to resolve.)
- ☑ **First-run coach marks on Today.** English by default (ADR 0021 — L1 only after an explicit Settings choice). 4-step dim + spotlight (Speaking · This week · profile · tab bar), once per device, replayable from Settings → "Show tips again". Device-verified on iOS 26. `src/lib/product-tour.ts` + `src/components/product-tour.tsx`.

## Post-launch (with friends)
- ☐ **Recording playback → main speaker** (currently earpiece). Isolate via the recognizer's `setCategoryIOS` `defaultToSpeaker` — NOT from the playback screen (shared AVAudioSession degrades STT gain). See `postmortems/2026-08-07-stt-final-truncated-audio-session-thrash`.
- ☐ Home + per-screen detail design polish.
- ☐ Deep-Learning practice flow redesign (after research).
- ☐ Recording **Phase 2** — cloud sync (Supabase Storage, signed upload/download Edge Functions). See `audio-recording-plan.md`.

## Notes
- N:1 (learner L1 : English) — greet learners in their L1; a Settings "main language" will feed `setFirstLanguage()` (see `src/lib/first-language.ts`).
- self-talk internal name = `self-talk`; brand/product name = **Mirror**.
