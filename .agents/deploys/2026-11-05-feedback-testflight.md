# Personalized feedback — TestFlight beta delivery, 2026-11-05

- App: Myne, `com.shadowingplus.mobile`, App Store Connect 6799375053.
- Version/build: **1.0.1 (49)**; profile `testflight` inherits production, remote auto-increment 48→49.
- Source commit: `8350900ac714ae1bdbe0f75f93952528060b60c9`, branch `codex/mobile-next-iteration`.
- User explicitly requested build and TestFlight upload; no App Store production release was requested.
- Build [18cb2861-3730-4e51-bc69-e3df318aed8b](https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/18cb2861-3730-4e51-bc69-e3df318aed8b): **FINISHED**, 18:45:56 UTC.
- Submission [1c974600-01d1-49fa-b16a-d2d3107a7354](https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/1c974600-01d1-49fa-b16a-d2d3107a7354): **FINISHED**, no submission error.

## Checks and commands

- `npm run test:mvp`: 109/109 PASS.
- `npm run test:feedback`: final recovery follow-up 19/19 PASS.
- `npm run validate`: release configuration, types, lint baseline and production iOS export PASS; one existing phrases.tsx effect warning.
- Independent review PASS; saved-review refresh clears its previous error while busy.
- Earlier native simulator build and settings load/save/reopen PASS. Temporary preview entry excluded.
- Production EAS variable names and configured app identity verified; values never logged.
- `eas build --platform ios --profile testflight --non-interactive --no-wait --json` succeeded; cloud build commit matches source.
- `eas submit --platform ios --profile testflight --id 18cb2861-3730-4e51-bc69-e3df318aed8b --non-interactive --no-wait` succeeded.
- Initial submission with `--what-to-test` was rejected because changelog submission requires Enterprise. Reissued without that optional metadata; no duplicate submission was created.
- `eas submit:view <submission-id> --json` confirms FINISHED. Apple visibility/processing is separate from successful upload.

## Limits and rollback

Real-model semantic evaluation still receives HTTP 401 from the local evaluation key. Wider device accessibility, physical swipe, live two-account RLS/concurrency and complete clarification/retry journeys remain unverified. TestFlight delivery does not certify these checks.

Rollback: stop distributing build 49 in App Store Connect and use prior valid internal beta build 48. Preserve additive migration036 and owned user data; do not drop tables as a rollback. Production App Store remains version1.0/build42.

Post-upload Apple query: latest returned TestFlight build remained 48 (`VALID`, `IN_BETA_TESTING`); build49 was not yet listed. Upload is verified, installation availability is not yet confirmed. Apple processing/propagation remains pending.
