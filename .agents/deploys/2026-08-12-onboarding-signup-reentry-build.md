# Onboarding signup and re-entry TestFlight build

- Date: 2026-08-12 (America/Los_Angeles)
- Target: iOS App Store / TestFlight production build
- Commit: `bc720cb7e09e0ab5d4b87e77947e425fe82c8385`
- App version: `1.0.0`
- Build number: `8`
- EAS build ID: `957b6401-2711-4c25-9319-a568546f8fab`
- EAS submission ID: `cb62cf4b-63e3-4086-8f1e-eba2a229bdce`
- Status: uploaded successfully; processing in App Store Connect

## Preflight

- Release configuration passed.
- TypeScript and changed-file ESLint passed.
- Clean iOS Expo export passed with 1,867 modules.
- Holdout code review approved the signup/re-entry change.
- EAS archive inspection included the new auth code and excluded `.env` and `.agents` artifacts.
- No database migrations were included.

## Artifact verification

- Bundle identifier: `com.shadowingplus.mobile`
- Display name: `Saylo`
- Version/build: `1.0.0 (8)`
- Non-exempt encryption: `false`
- Code signature: valid and satisfies its designated requirement

## Links

- Build: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/957b6401-2711-4c25-9319-a568546f8fab
- IPA: https://expo.dev/artifacts/eas/Y7b1Uya_XU5Sm4h7ir7-evlses4NEXCj7lQN0D_i1hs.ipa
- Submission: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/cb62cf4b-63e3-4086-8f1e-eba2a229bdce
- TestFlight: https://appstoreconnect.apple.com/apps/6799375053/testflight/ios

## Rollback

Keep build 7 available and do not assign build 8 to testers if signup or onboarding re-entry smoke tests fail. Revert commit `bc720cb` and issue a new incremented build if a replacement binary is required.
