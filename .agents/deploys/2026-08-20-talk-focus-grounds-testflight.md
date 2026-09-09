# Talk focus + story topic TestFlight build

- Date: 2026-08-20 (America/New_York)
- Target: iOS App Store / TestFlight production build + `talk-diagnose` Edge Function
- App version: `1.0.0`
- Build number: `14`
- EAS build ID: `9b138e9f-6b10-4aed-a86e-f07b0b9db4d4`
- EAS submission ID: `9120c45e-0c73-4d6c-90a8-b7e2c83644d9`
- Status: uploaded successfully; processing in App Store Connect

## Notes

- `talk-diagnose` was deployed from the repo root (working-tree JS ships in the IPA; Edge Functions do not — `.easignore` drops `/supabase/`).
- Unauthenticated POST to the function returns JSON `401` (`UNAUTHORIZED_NO_AUTH_HEADER`), so the route exists.
- Working tree at upload included story topic chips/move sheet, orphan-story filing into Ideas, and talk Focus chip + `why`/`exampleWhy` grounds.

## Commands

1. `npx supabase functions deploy talk-diagnose` (repo root)
2. `npx eas-cli build --platform ios --profile production --non-interactive --message "Show talk focus and recommendation grounds; move stories between topics"`
3. `npx eas-cli submit --platform ios --profile production --id 9b138e9f-6b10-4aed-a86e-f07b0b9db4d4 --non-interactive --wait`

## Links

- Build: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/9b138e9f-6b10-4aed-a86e-f07b0b9db4d4
- IPA: https://expo.dev/artifacts/eas/pu32CU0S8kKbiWpgBifCmkuHaaxxkmEJbiRsfwjY_gI.ipa
- Submission: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/9120c45e-0c73-4d6c-90a8-b7e2c83644d9
- TestFlight: https://appstoreconnect.apple.com/apps/6799375053/testflight/ios

## Rollback

Keep testers on build 13 until 14 is installed. If Focus chips or recommendation grounds are missing, check that `talk-diagnose` is still the new version before issuing a replacement build. To roll back the function, redeploy the previous `talk-diagnose` source.
