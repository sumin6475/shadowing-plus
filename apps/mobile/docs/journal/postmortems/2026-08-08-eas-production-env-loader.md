# Postmortem — EAS production env copy used an unavailable loader

## Failure

The first non-interactive attempt to copy the three local public runtime values
to EAS production exited before any remote mutation because the app does not
directly install the `dotenv` package.

## Root cause

The helper assumed `require("dotenv")` was available even though Expo owns the
environment-loading dependency in this project.

## Fix and verification

The retry used the installed `@expo/env.parseProjectEnv` API, registered all
three values as sensitive EAS production variables without printing them, and
then listed only variable names to verify completeness.

## Regression coverage

The production preflight now checks the required variable names before any EAS
production build. See
`quality/2026-08-08-testflight-production-preflight.md`.
