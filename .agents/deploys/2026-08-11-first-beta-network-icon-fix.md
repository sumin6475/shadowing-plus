# TestFlight deploy: First beta network and icon fix

- **Date**: 2026-08-11 (America/Los_Angeles)
- **Target**: Apple App Store Connect / TestFlight
- **App**: Saylo (`com.shadowingplus.mobile`, ASC app `6799375053`)
- **Branch/commit**: `feat/mobile-skeleton@246112f`
- **Version/build**: `1.0.0 (6)`
- **EAS build**: `512e6d26-2a82-403f-9869-7afa1ab9d212`
- **EAS submission**: `e592493d-9d14-424f-bc35-7e8535d4c15a`
- **TestFlight**: https://appstoreconnect.apple.com/apps/6799375053/testflight/ios

## Checklist

- Release config, TypeScript, baseline ESLint, and iOS export passed (1,841 modules).
- Independent code review approved with no findings.
- Shippable scope committed; unrelated local journal artifacts stayed outside the commit and EAS archive.
- EAS production variable names matched `.env.example`; sensitive values were not printed.
- `EXPO_PUBLIC_USE_RN_FETCH=1` resolved from the production build profile.
- No secrets, database migrations, or backend deployment were included.
- Archive inspection contained the new icon and fetch configuration and excluded local `.env`, dependencies, and journal files.

## Build and verification

1. Rebuilt local dependencies with `npm ci` after EAS preflight exposed an incomplete generated `node_modules`; no tracked files changed.
2. Ran the full mobile validation gauntlet again successfully.
3. Ran `eas build:inspect --platform ios --profile production --stage archive` and checked required/excluded inputs.
4. Ran `eas build --platform ios --profile production --non-interactive --message "Fix first beta networking and icon fit"`.
5. Downloaded and unpacked the resulting IPA. Verified bundle ID, display name, version/build, encryption declaration, code signature, and the generated 120×120 Saylo icon.

## Submission

After explicit user confirmation, submitted only EAS build `512e6d26-2a82-403f-9869-7afa1ab9d212` with:

```text
eas submit --platform ios --profile production --id 512e6d26-2a82-403f-9869-7afa1ab9d212 --non-interactive --wait
```

EAS reported the submission `FINISHED`, and Apple App Store Connect accepted the binary for TestFlight processing. This did not submit the public App Store version for review.

## Rollback

An uploaded build cannot be overwritten. If Build 6 fails the physical beta check, remove it from tester groups or expire it in App Store Connect and upload a corrected build with a higher build number. No database or backend rollback is required.

## Follow-up

- Wait for Apple processing to finish and confirm Build 6 appears in TestFlight.
- On a physical iPhone, verify Speak session saving, AI diagnosis, retry behavior, and the home-screen icon fit.
