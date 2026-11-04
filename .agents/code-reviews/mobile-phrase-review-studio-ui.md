# Code Review: Phrase save review and Studio UI

**Scope**: Current mobile UI changes on `codex/phrase-save-duplicate-review`, based on `be00e70`.
**Requirement**: Pre-save phrase duplicate review, Reminders-style Studio outline and keyboard tools, system typography, uniform list rows, borderless controls and sidebar dismissal.
**Recommendation**: APPROVE

## Findings and resolution

- High (resolved), `apps/mobile/src/lib/phrases.ts`: Cross-source duplicate lookup/reuse accepted failed or pending rows, which remain invisible in the canonical ready-only Phrase Bank. Added ready-status filters to both the search and the confirmation recheck.
- Regression coverage executes equality filters against failed/pending clip rows and rejects a status change between review and confirmation. Tests failed before the fix and pass after it.
- Same-segment hidden-row handling in the legacy `createPhrase` path predates this change and was not broadened here.

## Verification

- Independent holdout reviewer examined requirements, diff and surrounding code without plan/execution-report content. Final verdict PASS; no remaining substantiated concerns.
- Reviewer independently reran 11 targeted tests: all PASS.
- Full MVP suite: 90/90 PASS.
- Prior signed-in iOS Simulator checks covered phrase list/detail, duplicate review, Ask, Studio editor/details/history/folder picker and native keyboard accessory transitions. Physical long-press drag and device speech remain unverified.
- Cloud iOS build `1.0.1 (48)` and App Store Connect submission completed. The ready-status fix above was added afterward and is not included in build 48.

## Verdict

The change meets the stated requirements. The identified duplicate-reuse regression is resolved and independently reviewed. No source PRD phase was identified for this conversation-driven change.
