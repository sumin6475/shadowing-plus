# Code Review: submission delete and daily goal fixes

**Scope**: Uncommitted changes in the seven mobile/Supabase implementation and regression-test files
**Requirement**: Fix in-app account deletion and make the Phrases home progress denominator follow the changed phrases-per-day goal, without unrelated changes.
**Recommendation**: APPROVE

## Stats

- Files modified: 4 · added: 3 · deleted: 0
- Lines: +88 / -2

## Findings

Code review passed. No technical issues detected.

## What's Good

- The home fix is isolated behind a pure, directly tested display calculation.
- The deletion fallback preserves the existing GoTrue path, is available only to `service_role`, and removes execute access from public client roles.
- The regression test exercises the exact GoTrue-error-to-RPC-success transition, while the migration was also parsed against the linked database inside a rolled-back transaction.

## Verdict

The scoped change meets both reported requirements without altering unrelated UI or feature behavior. Validation, regression tests, and the iOS export are green; it is ready to commit before the production deployment gate.
