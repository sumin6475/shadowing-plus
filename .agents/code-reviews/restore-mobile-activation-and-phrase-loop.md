# Code Review: Restore Mobile Activation and Phrase Loop

**Scope**: Uncommitted mobile onboarding changes
**Requirement**: Preserve the branded splash and implement a resumable first-story journey whose signed-out draft imports safely after authentication.
**Recommendation**: APPROVE

## Stats
- Files modified: 8 · added: 1
- Lines: see final commit stats

## Findings

severity: high
file: apps/mobile/src/app/_layout.tsx
line: 58
issue: Returning users bypassed the branded splash.
detail: Completion and awaiting-sign-in state pre-marked the splash as done.
suggestion: Show SplashIntro on every process launch, then route by onboarding/auth state.
resolution: Fixed.

severity: high
file: apps/mobile/src/lib/onboarding.ts
line: 178
issue: A crash between a remote insert and local checkpoint could duplicate imported rows.
detail: Local checkpoints alone cannot make the database write atomic.
suggestion: Reconcile existing Message, Beat, Phrase, and Talk records before every insert; prefer future database uniqueness/server transaction.
resolution: Fixed with backend reconciliation before inserts; phrase creation already normalizes and deduplicates.

severity: high
file: apps/mobile/src/screens/today.tsx
line: 50
issue: Device-global onboarding draft was not scoped to the active account.
detail: Account switching could show the previous user’s local Story id.
suggestion: Require importedForUserId to match the current session before surfacing the local first-story card.
resolution: Fixed. Today now resolves the authenticated backend Story carrying the onboarding `30-second version` Message, using account-scoped local ids only as a fast path.

severity: high
file: apps/mobile/src/screens/onboarding.tsx
line: 165
issue: Speech permission/start failure still allowed Finish and onboarding completion.
detail: speech.start() false was ignored.
suggestion: Track successful Talk start, disable Finish, surface the error, and provide retry.
resolution: Fixed.

## What's Good
- The complete confirmed journey is present and routes before authentication.
- Local draft persistence and remote checkpointing protect the learner’s work.
- Existing Speaking World, Phrase, and Talk models are reused.

## Verdict
The initial review found four high-severity reliability gaps. All four were addressed before commit, the holdout reviewer returned PASS on the final diff, and the static validation suite was rerun.
