# Library clip capture TestFlight build

- Date: 2026-08-20 (America/New_York)
- Target: iOS App Store / TestFlight production build
- Git HEAD at upload: `ec0d8caa065285d2f0b0d616cc2430717f3e89a9`
- Working tree: uncommitted Library clip dock, clip-seed phrase capture, player overlay, and signed-in splash skip
- App version: `1.0.0`
- Build number: `10`
- EAS build ID: `01f2bb7f-d27c-491f-8404-044ae7ef9168`
- EAS submission ID: `f36f5aed-63f5-4f06-878a-a3242a1c3c73`
- Status: uploaded successfully; processing in App Store Connect

## Preflight

- TypeScript (`npm run typecheck` in `apps/mobile`) PASS.
- Production environment contains `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SUPABASE_URL`. Values were not printed.
- EAS packed the working tree, so the uncommitted JS/TS changes shipped in this IPA.
- `.env`, `.agents`, and local journal artifacts stay out of the upload via `.easignore`.
- No database migrations were included.

## Commands

1. `npx eas-cli build --platform ios --profile production --non-interactive --message "Fix Library clip player, phrase capture from transcript, skip splash when signed in"`
2. `npx eas-cli submit --platform ios --profile production --id 01f2bb7f-d27c-491f-8404-044ae7ef9168 --non-interactive --wait`

## Artifact verification

- Bundle identifier: `com.shadowingplus.mobile`
- Display name: `Saylo`
- Version/build: `1.0.0 (10)`
- Apple Team: `K74H4TPJ4M`
- Provisioning profile: `DWSBUQGKQ3` (active)
- EAS build: FINISHED
- EAS submit: FINISHED — binary accepted by App Store Connect

## Links

- Build: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/01f2bb7f-d27c-491f-8404-044ae7ef9168
- IPA: https://expo.dev/artifacts/eas/b9RzZd--wn3u8Sec65Y5t86HJREYzy3jmEf5E4bvo9I.ipa
- Submission: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/f36f5aed-63f5-4f06-878a-a3242a1c3c73
- TestFlight: https://appstoreconnect.apple.com/apps/6799375053/testflight/ios

## Rollback

Keep testers on build 9 until build 10 is smoke-tested. If the fixed Library dock, clip-seed AI capture, playback resume after Done, or signed-in splash skip regress, do not assign build 10; issue a new incremented replacement build.
