# Phrase capture + profile + feedback TestFlight build

- Date: 2026-08-21 (America/New_York)
- Target: iOS App Store / TestFlight production build
- App version: `1.0.0`
- Build number: `16`
- EAS build ID: `3d4bb799-ec78-4976-8639-01f06732ea38`
- EAS submission ID: `9c96fdc2-db5b-4a51-9738-014c824fd4db`
- Status: uploaded successfully; processing in App Store Connect

## Included

- Phrase capture IA: Detected text vs Context, required/optional labels, More, learner note.
- Profile preferences split into Edit profile, First language, and Feedback focus screens.
- Self-talk Save as phrase routes through phrase capture.
- Intermediate business-speaking focus examples and coral/cobalt feedback treatment.

## Validation

- Release config: PASS.
- TypeScript: PASS.
- iOS Expo export: PASS (1,919 modules).
- Edited-file IDE lint: PASS.
- Full lint baseline: FAIL on 11 existing React refs errors in `library.tsx` and `world.tsx`; no failure was reported in this build's edited feedback files.

## Commands

1. `npm run validate` (stopped at existing lint errors)
2. `npm run export:ios`
3. `npx eas-cli build --platform ios --profile production --non-interactive --message "Refine phrase capture, profile preferences, and self-talk feedback"`
4. `npx eas-cli submit --platform ios --profile production --id 3d4bb799-ec78-4976-8639-01f06732ea38 --non-interactive --wait`

## Links

- Build: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/3d4bb799-ec78-4976-8639-01f06732ea38
- IPA: https://expo.dev/artifacts/eas/Mds6fTGAWRlyBopByWC7ZwmiH8DX-emX-l3QTDkiq5w.ipa
- Submission: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/9c96fdc2-db5b-4a51-9738-014c824fd4db
- TestFlight: https://appstoreconnect.apple.com/apps/6799375053/testflight/ios

## Follow-up

- Apply `supabase/migrations/024_phrase_learner_note.sql` before testing Your note persistence.
- Smoke-test phrase capture and Self-talk feedback after Apple processing completes.
