# Phrase Bank suggestion split TestFlight build

- Date: 2026-08-21 (America/New_York)
- Target: iOS App Store / TestFlight production build
- App version: `1.0.0`
- Build number: `17`
- EAS build ID: `72442a35-a83e-4def-89a9-73ffb9d38dd2`
- EAS submission ID: `b9f02d3f-c5fd-4cf7-beb0-92a6c1199d61`
- Status: uploaded successfully; processing in App Store Connect

## Included

- Focus coaching (`talk-diagnose`) no longer reads Phrase Bank candidates.
- Independent `talk-phrase-suggest` returns at most one owned phrase, or hides the card.
- Self-talk results show `From your Phrase Bank` with Try this phrase / Doesn’t fit.
- Phrase events: `suggested → accepted/rejected → used`.

## Validation

- Release config: PASS.
- TypeScript: PASS.
- iOS Expo export: PASS (1,919 modules).
- Edge Functions `talk-diagnose` and `talk-phrase-suggest`: deployed; unauthenticated POST returns JSON 401.
- EAS iOS production build: PASS — `1.0.0 (17)`.
- App Store Connect upload: PASS.

## Commands

1. `npm run verify:release-config`
2. `npm run typecheck`
3. `npm run export:ios`
4. `npx eas-cli build --platform ios --profile production --non-interactive --wait --message "Split Self-talk Phrase Bank suggestions from Focus coaching"`
5. `npx eas-cli submit --platform ios --profile production --id 72442a35-a83e-4def-89a9-73ffb9d38dd2 --non-interactive --wait`

## Links

- Build: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/72442a35-a83e-4def-89a9-73ffb9d38dd2
- IPA: https://expo.dev/artifacts/eas/w8j0a1fvSTjzid_tZSy7TFI8neH-Xn4f111AYLEQuwc.ipa
- Submission: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/b9f02d3f-c5fd-4cf7-beb0-92a6c1199d61
- TestFlight: https://appstoreconnect.apple.com/apps/6799375053/testflight/ios

## Follow-up

- Wait for Apple processing, then install `1.0.0 (17)` from TestFlight.
- Smoke-test Focus coaching plus optional Phrase Bank card, Doesn’t fit, and Try this phrase.
