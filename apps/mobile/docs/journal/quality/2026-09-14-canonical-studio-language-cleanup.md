# Canonical Studio language cleanup — 2026-09-14

## Scope

- Canonical application language: Topic, Situation, Speaking Note, Attempt.
- Deployed Supabase tables and columns unchanged.
- Removed obsolete mobile World and Island navigation implementations.
- Added document status policy and refreshed current architecture documents.

## Automated results

| Check | Result |
| --- | --- |
| `git diff --check` | PASS |
| `npm --prefix apps/mobile run typecheck` | PASS |
| `npm --prefix apps/mobile run lint:baseline` | PASS; one pre-existing warning in `screens/phrases.tsx:1024` |
| `npm --prefix apps/mobile run export:ios` | PASS; 2,121 modules, Hermes bundle exported |
| Obsolete screen imports/classes | PASS; zero matches |
| Obsolete route pushes | PASS; zero matches |
| Imports from `speaking-world` | PASS; zero matches |
| Audited local documentation links | PASS; 14 files |

## Structural result

- Deleted `screens/world.tsx` and `screens/islands.tsx`.
- Added `screens/attempts.tsx` for the still-current Attempt list/detail/feedback flow.
- Replaced legacy route names with `attempt`, `coachingFeedback`, and `attemptsList`.
- Moved the physical schema adapter to `lib/studio-persistence.ts`.
- Added `lib/studio-model.ts` as the application-facing translation boundary.
- Moved built-in content to `lib/situation-prompts.ts`.

## Test limitation

The mobile package has no unit-test command or configured test harness. No framework was introduced during this refactor. Static type checking, lint, targeted source assertions, and a full iOS export were used instead.

## Manual verification remaining

- Open Studio → Topics → Situation → Speaking Note.
- Start Talk from a Speaking Note and verify completion returns to that Note.
- Open Studio → All attempts → Attempt detail → Coaching Feedback.
- Open Phrase Practice and add/use a related Situation.
- Open Settings → Library → Clip → Phrase capture and link a Situation.
