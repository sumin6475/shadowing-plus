# Quality Snapshot · First-story onboarding · 2026-08-11

- TypeScript: PASS (`tsc --noEmit`)
- Changed-file ESLint: PASS, with the two existing `today.tsx` React Compiler warnings
- Release configuration: PASS (`scripts/verify-release-config.mjs`)
- iOS bundle: PASS (`expo export --platform ios --clear`)
- Diff whitespace: PASS (`git diff --check`)
- Physical iPhone camera, on-device speech recognition, and signed-in Supabase import: pending TestFlight/device verification

