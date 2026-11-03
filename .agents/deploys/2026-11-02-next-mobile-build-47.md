# iOS TestFlight build 47 upload

- Target: App Store Connect / internal TestFlight for `com.shadowingplus.mobile`.
- Source: `add53d1` on `codex/next-mobile-release`; app version `1.0.1 (47)`.
- Build: `851ce88f-468d-4867-95d5-6b3c385c6b83`, `testflight` / `STORE`, EAS status `FINISHED`.
- Submission: `bc069a56-ef4a-4a91-8405-c87a1744e720`; `npx eas-cli submit --platform ios --profile testflight --id 851ce88f-468d-4867-95d5-6b3c385c6b83 --non-interactive --wait` reported successful upload to App Store Connect.
- [EAS build](https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/851ce88f-468d-4867-95d5-6b3c385c6b83) · [EAS submission](https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/bc069a56-ef4a-4a91-8405-c87a1744e720) · [TestFlight build list](https://appstoreconnect.apple.com/apps/6799375053/testflight/ios)

## Pre-upload evidence

`npm run test:mvp` passed 63/63. Release config, typecheck, lint baseline, and iOS export passed; lint retained one existing warning in `phrases.tsx:1025`. The first local export attempt hit worktree log-file `EPERM`, then passed with write permission. No database migration or Edge Function changed since build 46. The build source was committed and the working tree clean.

## Post-upload state and rollback

EAS confirmed that Apple accepted the binary upload. Two immediate `eas submit:status` checks still listed build 46 as the newest processed TestFlight build; build 47 was not yet listed. Apple processing and physical-device validation remain pending. Keep testers on build 46 if build 47 fails processing or smoke checks. No schema rollback is needed for this mobile-only delta.
