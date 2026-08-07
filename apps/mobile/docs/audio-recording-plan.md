# Self-talk audio recording — plan (App Store–safe)

> Research-backed plan for saving the user's self-talk audio so they can replay it.
> Target table: **`talk_sessions`** (already has unused `audio_key` + `audio_content_type` → no migration). Recording indicator (Apple 2.5.14) already satisfied by the red "Listening" pill + waveform.

## Decision: start LOCAL-ONLY, defer cloud

On-device storage is **not "collected" data** under Apple's rule ("data processed only on device is not collected and does not need to be disclosed"). So local-only ships the full value (record → transcript → replay) with the least App Store surface: **no Audio-Data nutrition-label entry, no upload infra, no new privacy-policy voice clauses, minimal liability.** Cloud sync is a Phase-2 enhancement, not a launch blocker.

Capture path: `expo-speech-recognition` `recordingOptions.persist` writes the recognized audio to a **WAV** file (16-bit PCM; set `outputSampleRate: 16000` mono → ~1.9 MB/min, fine on-device). Same mic as STT → no second recorder, no audio-session conflict. Emits `audioend` with a file `uri`. **No dev rebuild needed** to record (mic permission already granted for STT); the Info.plist/manifest items below are for App Store submission.

## Phase 1 — ship-ready (local-only)
- [ ] Hook: add `recordingOptions: { persist: true, outputSampleRate: 16000 }` to `ExpoSpeechRecognitionModule.start`; listen for `audioend` → capture `uri`; expose `audioUri` from `use-speech-session`.
- [ ] On finish: move the WAV into `FileSystem.documentDirectory` under a **stable relative name** (`speak/{sessionId}.wav`) — the absolute container path changes across reinstalls, so store the relative name, resolve at read time. Write it to `talk_sessions.audio_key`, `audio_content_type = 'audio/wav'`.
- [ ] Session detail (`world.tsx` SessionDetail): play the local file (expo-audio) + **Delete recording** button (removes file + clears `audio_key`). User-delete is required once anything is stored.
- [ ] `app.json` → `expo.ios.infoPlist`: `NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription` (specific wording), `ITSAppUsesNonExemptEncryption: false`. Add `expo-speech-recognition` to plugins.
- [ ] `expo.ios.privacyManifests`: required-reason APIs (audit `node_modules/**/PrivacyInfo.xcprivacy`; expect file-timestamp `C617.1`, UserDefaults `CA92.1`, disk-space `E174.1`).
- [ ] Privacy policy line: "recordings are stored **only on your device** and can be deleted anytime." **No** Audio-Data nutrition-label entry.
- [ ] These plist/manifest/plugin changes take effect only after `expo prebuild` + rebuild (config-plugin gotcha) — bundle into the next dev-build.

## Phase 2 — cloud sync (later, only if needed)
- Storage: **Supabase Storage over R2** for these clips — given the "native app can't reach Vercel" constraint both route through an Edge Function, and Supabase gives one-line `createSignedUploadUrl` / `createSignedUrl` (no SigV4). R2 only wins at high egress volume.
- Flow: record → (optional WAV→m4a/AAC transcode, ~0.3 MB/min) → Edge Function `sign-speak-upload` (verify JWT, enforce `user_id` path prefix) → RN PUT → set `audio_key` = object key `speak/{user_id}/{sessionId}.m4a`, `audio_content_type='audio/mp4'` → playback via signed GET.
- Delete must propagate to Storage (5.1.1 deletion right).
- Nutrition label: add **User Content → Audio Data, Linked to identity, App Functionality, not tracking**. Update privacy policy (collection, retention, deletion, consent withdrawal).

## Not relevant
- **ATT**: no — self-talk stored for the user's own replay isn't cross-app tracking. No `NSUserTrackingUsageDescription`.
- **Export compliance**: HTTPS + OS crypto only → exempt; set `ITSAppUsesNonExemptEncryption: false`.

## Flags to verify at build time
- Exact required-reason API list against the real `node_modules` manifests (Apple's post-upload email is ground truth).
- Confirm the SDK-57-compatible `expo-speech-recognition` still defaults `persist` output to WAV and honors `outputSampleRate`.

_Sources: Apple App Privacy Details; App Store Review Guidelines 5.1.1 / 2.5.14; Expo privacy-manifests guide; expo-speech-recognition README/CHANGELOG._
