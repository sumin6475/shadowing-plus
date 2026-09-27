# First-story onboarding TestFlight build

- Date: 2026-08-11 (America/Los_Angeles)
- Target: iOS App Store / TestFlight production build
- Commit: `cc40d4e5e2170645f707db89bd4aa58ebeae60c8`
- App version: `1.0.0`
- Build number: `7`
- EAS build ID: `184e5027-f0e7-4888-ab37-05f84f45f89b`
- Status: uploaded successfully; processing in App Store Connect
- EAS submission ID: `31814aec-befc-4c26-8864-11bba03291ab`

## Preflight

- TypeScript validation passed.
- Expo release configuration passed.
- Clean iOS Expo export passed.
- Holdout code review passed.
- EAS archive inspection passed; secrets and local agent artifacts were excluded.

## Artifact verification

- Bundle identifier: `com.shadowingplus.mobile`
- Display name: `Saylo`
- Version/build: `1.0.0 (7)`
- Non-exempt encryption: `false`
- Code signature: valid and satisfies its designated requirement

## Links

- Build: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/184e5027-f0e7-4888-ab37-05f84f45f89b
- IPA: https://expo.dev/artifacts/eas/dTLaKoCC_Xj4f2hJnzrrihMT4moo5jYEb-CWhU0vMTA.ipa
- Submission: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/31814aec-befc-4c26-8864-11bba03291ab
- TestFlight: https://appstoreconnect.apple.com/apps/6799375053/testflight/ios

## Rollback

Keep the previous TestFlight build available and do not promote build 7 if onboarding smoke testing fails. Revert commit `cc40d4e` and issue a new incremented build if a binary rollback is required.
