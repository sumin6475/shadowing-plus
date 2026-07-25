# Code Review: Job progress sync

**Scope:** `web/src/app/app/page.tsx`, `web/src/components/mobile/MobileLibrary.tsx`, `web/src/app/home.css`, `web/src/app/mobile.css`
**Requirement:** Make authenticated processing-job status updates reliable and visible when direct client queries or Realtime fail.
**Recommendation:** APPROVE

## Stats

- Files modified: 4 · added: 0 · deleted: 0
- Review performed after validation and a follow-up review of two fixed findings.

## Findings

Code review passed. No unresolved technical issues detected.

The initial review found two high-severity gaps: mobile did not receive the
sync warning, and the stated automatic retry did not begin when the local job
list was empty or stale. Both were fixed and independently re-reviewed:

- polling continues while `jobsSyncError` exists;
- `MobileLibrary` receives and visibly renders the warning.

## What's Good

- The job feed now uses the authenticated server route, which reports an error
  instead of silently replacing the queue with an empty RLS query result.
- Realtime connection failure has a user-visible fallback while the existing
  polling path continues to recover state.
- The change preserves user scoping: `/api/jobs` resolves the session and scopes
  service-role reads by `user_id`.

## Verdict

The change meets the reliability/visibility requirement for the job progress
surface. Targeted lint, TypeScript, full tests, production build, and smoke
checks passed; the existing unrelated lint warning remains outside this scope.
