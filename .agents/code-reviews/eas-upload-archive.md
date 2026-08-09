# Code Review: EAS mobile upload archive

**Scope**: `.easignore`
**Requirement**: Reduce the EAS iOS production upload while preserving every file required to build `apps/mobile`.
**Recommendation**: APPROVE — finding fixed

## Stats

- Files modified: 0 · added: 1 · deleted: 0
- Runtime source files changed: 0

## Findings

severity: medium
file: .easignore
line: 9
status: fixed
issue: Existing Git ignore rules were not copied completely
detail: Because `.easignore` supersedes Git ignore files, omitted generated paths such as `model`, `.kotlin`, Metro health files, package-manager debug logs, and the mobile example directory could re-enter later uploads and undermine the size fix.
suggestion: Carry the omitted repository and mobile ignore rules into `.easignore`.

## What's Good

The mobile build dependency closure is preserved. The archive retains app
configuration, lockfiles, source, the Saylo icon and splash assets, Android icon
assets, and all four fonts referenced by the production bundle. Web, local
documentation, AI workflow files, generated native directories, and unused
starter assets are excluded.

## Fix verification

- Added all omitted generated/local rules identified by review.
- EAS `build:inspect` no-VCS archive reduced from 11.8 MB uploaded tarball input
  to a 3.1 MB unpacked archive without Git objects or unrelated monorepo areas.
- Fresh `npm ci` completed from the inspected archive.
- TypeScript PASS, ESLint error 0/warning 15, iOS export PASS at 1,851 modules.

## Verdict

The review concern is fixed. The ignore file now preserves the existing ignore
contract while narrowing EAS uploads to the validated mobile build inputs, and
is ready to commit.
