# Deploy: TestFlight build 55 (Xcode 27 test)

**Date**: 2026-11-19
**Commit**: `7125a36` (branch `chore/eas-xcode27-image` = origin/main `754671b` + Xcode 27 change)
**Target**: EAS iOS TestFlight / App Store Connect app `6799375053`
**Build**: 1.0.1 (55)

## Why

ITMS-90725 on build 53: uploads must use the iOS 27 SDK (Xcode 27) from April 2027. This build tests the switch: image `macos-tahoe-26.6-xcode-27.2`, expo 57.0.33, expo-build-properties `ios.enableSceneSupport: true` (without the scene lifecycle an Xcode 27 build dies at launch on iOS 27, expo/expo#46664).

## Preconditions

- Isolated worktree on `chore/eas-xcode27-image`; `npm run validate` pass (release config incl. new Xcode 27 scene check, typecheck, lint baseline 3 warnings, iOS export), `test:mvp` 140/140.
- Local `expo prebuild --platform ios`: `UIApplicationSceneManifest` -> `EXExpoAppSceneDelegate`, `aps-environment` still stripped.

## Command and result

`npx eas-cli build --platform ios --profile testflight --auto-submit --non-interactive --no-wait --message "Xcode 27 image test"`

- Build ID: `8e249a22-1532-40f9-a327-b70b3a17dc85` — FINISHED (20:13 -> 20:19 EST). Log: `Xcode 27.2 (27B52)`, `iPhoneOS27.2.sdk`, `Myne.ipa (24.3 MB)`.
- Submission ID: `68a5604c-1c95-4f76-8640-8c082ce9ec41` — scheduled with the build; final status not read (CLI has no submission view, expo.dev needed a login).
- EAS build: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/8e249a22-1532-40f9-a327-b70b3a17dc85
- Submission: https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/68a5604c-1c95-4f76-8640-8c082ce9ec41

## After the build

Right after starting it, Sumin decided to keep building on the default image until April and asked to cancel 55; it had already finished. The next regular build from main (default image) takes 56 and supersedes 55 in TestFlight. To keep testers off 55, expire it in App Store Connect -> TestFlight.

Still open: Apple's processing email for 55 (ITMS-90725 gone?), and launch + auth deep link / OAuth / reminder tap / Apple sign-in on an iOS 27 device.

## Rollback

TestFlight uploads are immutable. Expire build 55 in App Store Connect if needed; main is unchanged.
