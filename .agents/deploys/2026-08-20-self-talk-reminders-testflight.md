# Self-talk reminders TestFlight build

- Date: 2026-08-20 (America/New_York)
- Target: iOS App Store / TestFlight production build
- App version: `1.0.0`
- Build number: `13`
- EAS build ID: `d4265602-d39b-43e1-a27f-7d251d3566c6`
- EAS submission ID: `e0bafdf8-3308-47a0-9cd0-c3e8c44ef001`
- Status: uploaded successfully; processing in App Store Connect

## Notes

- Builds 11 and 12 failed: `expo-notifications` added `aps-environment`, and the existing App Store profile `DWSBUQGKQ3` has no Push Notifications capability.
- v1 reminders are local-only. `apps/mobile/plugins/with-local-reminders-only.js` strips `aps-environment` after other entitlement mods.
- Working tree at upload included reminders, talk focus UI, and Library clip jank fix. `talk-diagnose` Edge Function is not in the IPA (`.easignore` drops `/supabase/`).

## Commands

1. `npx eas-cli build --platform ios --profile production --non-interactive --message "Add local self-talk reminders (no remote push entitlement)"`
2. `npx eas-cli submit --platform ios --profile production --id d4265602-d39b-43e1-a27f-7d251d3566c6 --non-interactive --wait`

## Links

- Build: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/d4265602-d39b-43e1-a27f-7d251d3566c6
- IPA: https://expo.dev/artifacts/eas/qoAqOUDcnObkyLOCx6BZrCKGICh2kEEz60EiA6CFKVA.ipa
- Submission: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/e0bafdf8-3308-47a0-9cd0-c3e8c44ef001
- TestFlight: https://appstoreconnect.apple.com/apps/6799375053/testflight/ios

## Rollback

Keep testers on build 10 until 13 is installed and reminder permission/schedule smoke-tested. If local notifications never appear, do not assign 13.
