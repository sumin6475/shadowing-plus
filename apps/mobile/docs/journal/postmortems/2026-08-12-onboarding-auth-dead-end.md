# Postmortem · Onboarding auth dead end · 2026-08-12

## Failure

After finishing onboarding on a TestFlight install, a signed-out learner reached a sign-in-only screen. The persisted onboarding state skipped the welcome flow on later launches, and there was no account creation or onboarding restart action.

## Cause

The root gate correctly restored `awaiting_sign_in`/`completed`, but the auth surface implemented only `signInWithPassword`. It also had no way to publish a locally reset draft back to the mounted root gate.

## Fix

- Added email/password account creation with the same password policy as web.
- Preserved the first-story draft when email confirmation is required.
- Added a confirmed “Start onboarding again” action.
- Added an in-process onboarding draft subscription so reset immediately reopens onboarding.

## Regression coverage

TypeScript, changed-file ESLint, release configuration, full source lint baseline, and clean iOS Expo export passed. Physical-device signup, confirmation email, and onboarding restart remain the TestFlight smoke checks.
