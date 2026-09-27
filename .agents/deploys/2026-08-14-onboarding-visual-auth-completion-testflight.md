# Onboarding visual/auth completion TestFlight build

- Date: 2026-08-14 (America/Los_Angeles)
- Target: iOS App Store / TestFlight production build
- Commit: `96e277bcfa0a16ef726e69319878e233ca332176`
- App version: `1.0.0`
- Build number: `9`
- EAS build ID: `641b83a8-ffb5-43f4-8e84-e23898317bb1`
- EAS submission ID: `da42c053-a0ce-491f-9f18-e78c64cbafd5`
- Status: uploaded successfully; processing in App Store Connect

## Preflight

- Release configuration, TypeScript, scoped ESLint, iOS Expo export, and diff checks passed.
- Holdout code review approved the onboarding visual/auth completion change.
- Production environment contains the required public API/Supabase variable names; values were not printed.
- EAS archive inspection included the fixed CTA, English notes copy, provider-aware signup, and transcript-failure continuation code.
- `.env`, `.agents`, and local journal artifacts were excluded from the upload archive.
- No database migrations were included.

## Commands

1. `eas build:inspect --platform ios --profile production --stage archive`
2. `eas build --platform ios --profile production --non-interactive --message "Polish onboarding completion and signup"`
3. Downloaded and inspected the generated IPA.
4. `eas submit --platform ios --profile production --id 641b83a8-ffb5-43f4-8e84-e23898317bb1 --non-interactive --wait`

## Artifact verification

- Bundle identifier: `com.shadowingplus.mobile`
- Display name: `Saylo`
- Version/build: `1.0.0 (9)`
- Non-exempt encryption: `false`
- Application identifier: `K74H4TPJ4M.com.shadowingplus.mobile`
- IPA archive integrity: PASS
- Code signature: valid and satisfies its designated requirement

## Links

- Build: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/641b83a8-ffb5-43f4-8e84-e23898317bb1
- IPA: https://expo.dev/artifacts/eas/WjKC_yP_RDDEFbLKE3NyufKHrtyFCcrQbIahA7ZZHhw.ipa
- Submission: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/da42c053-a0ce-491f-9f18-e78c64cbafd5
- TestFlight: https://appstoreconnect.apple.com/apps/6799375053/testflight/ios

## Rollback

Keep build 8 assigned to testers until build 9 passes the new-user onboarding smoke test. If fixed-height CTAs, Google OAuth return, email signup, or transcript-failure completion regress, do not assign build 9; revert `96e277b` and issue a new incremented replacement build.
