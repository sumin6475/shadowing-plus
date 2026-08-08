# Code Review: TestFlight App Store Connect link

**Scope**: `apps/mobile/eas.json`
**Requirement**: Link the production EAS Submit profile to the existing Saylo App Store Connect record without changing build behavior or app identity.
**Recommendation**: APPROVE

## Stats

- Files modified: 1 · added: 0 · deleted: 0
- Lines: +4 / -1

## Findings

Code review passed. No technical issues detected.

## What's Good

The change is limited to the production submit profile and uses the App Store
Connect Apple ID for the already-created Saylo record. The production build
profile, bundle identifier, EAS project identity, and runtime source remain
unchanged. `eas.json` parses successfully, EAS resolves the production build as
store distribution with remote credentials and auto-increment, and the three
required public runtime variable names are present in the EAS production
environment without exposing their values.

## Verdict

The change meets the requirement and is safe to commit. It directs a future
`eas submit --profile production` operation to the intended App Store Connect
record while preserving all existing build and application behavior.
