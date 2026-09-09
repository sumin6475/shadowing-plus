# TestFlight deploy: Saylo baseline

- Date: 2026-08-08 (America/Los_Angeles)
- Branch/commit: `feat/mobile-skeleton@ca0ea99`
- App Store Connect app: `Saylo: English Speaking` (`6799375053`)
- Bundle ID: `com.shadowingplus.mobile`
- Version/build: `1.0.0 (5)`
- EAS build: `ef172c4d-277c-4af8-a92c-00fad1752ec2`
- EAS submission: `568cad46-0250-4459-86a5-b2a5c2c1574a`

## Preconditions

- TypeScript passed.
- ESLint passed with the established 15-warning ceiling and zero errors.
- iOS export passed with 1,851 modules.
- Production environment-variable names were confirmed without reading or recording values.
- EAS production build completed with STORE distribution.
- Extracted IPA identity, version, encryption declaration, code signature, provisioning, and approved Saylo icon were verified.
- User explicitly confirmed the outward-facing TestFlight upload.

## Deployment

- Created and assigned an App Store Connect API key with the least-privilege `APP_MANAGER` role for EAS Submit.
- Submitted only EAS build `ef172c4d-277c-4af8-a92c-00fad1752ec2`.
- EAS reported: `Submitted your app to Apple App Store Connect!`
- Apple accepted the binary and started processing it for TestFlight.
- This operation did not submit the public App Store version for App Review.

## Verification

- Submission command exited 0.
- EAS confirmed the binary was successfully uploaded to App Store Connect.
- Apple processing and appearance in the TestFlight build list remain asynchronous.

## Rollback

An uploaded build cannot be overwritten. If build 5 is faulty, do not add it to an internal testing group (or remove it from testing) and upload a corrected build with a higher build number. Public release remains unaffected because no App Review submission occurred.
