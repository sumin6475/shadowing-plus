# Code Review: mobile regression baseline

**Scope**: Uncommitted changes in `apps/mobile/package.json` and
`apps/mobile/docs/release/mobile-regression-baseline.md`
**Requirement**: Add deterministic no-churn validation scripts and a
privacy-safe, executable Tier 1–3 regression contract without runtime changes.
**Recommendation**: APPROVE — findings fixed and human-approved 2026-08-08

## Stats

- Files modified: 1 · added: 1 · deleted: 0
- Runtime source files changed: 0

## Findings

severity: high
file: apps/mobile/docs/release/mobile-regression-baseline.md
line: 110
status: fixed
issue: RLS-01 does not actually exercise cross-account mutation protection
detail: Normal UI flows cannot target another account's hidden record, so a
broken write policy could still pass the stated two-account check.
suggestion: Define a controlled two-session RLS harness that targets known
disposable IDs and records only pass/fail, never record content or credentials.

severity: high
file: apps/mobile/docs/release/mobile-regression-baseline.md
line: 111
status: fixed
issue: Capture-photo cloud transfer is not explicitly classified
detail: The current capture path base64-encodes the chosen photo, sends it to the
`phrase-capture` Edge Function, and forwards it to OpenAI. The document's known
privacy blocker focuses on Speak data, so capture privacy copy could be
incorrectly accepted.
suggestion: State this existing transfer explicitly in PRIV-01 and in the known
release blockers; distinguish transient processing from storage only when
verified.

severity: medium
file: apps/mobile/docs/release/mobile-regression-baseline.md
line: 3
status: fixed
issue: Executable instructions hard-code a developer-specific absolute path
detail: The document exposes a local username and cannot be followed from
another clone.
suggestion: Use repository-relative instructions such as `cd apps/mobile`, then
require a branch/commit identity check before execution.

## What's Good

The npm scripts preserve dependency and lockfile state, cap the established
warning budget, and produce an ignored deterministic iOS export. Typecheck and
baseline lint pass, and no runtime source changed. The checklist uses stable IDs
and clearly separates several known release blockers from passes.

## Fix verification

- RLS harness: Node syntax and direct ESLint pass; documented operations cover
  cross-account read, update, delete, and owner-spoofed insert for three surfaces.
  The credentialed 14-check run remains a manual Tier 3 step.
- Capture disclosure: document contains the base64 → `phrase-capture` → OpenAI
  path and labels provider retention/deletion as unknown until verified.
- Portability: no developer-specific absolute path remains in the release
  checklist.
- Full static gate: TypeScript PASS, ESLint error 0/warning 15, iOS export PASS
  at 1,851 modules, diff check PASS, lockfile unchanged.
- Expo Doctor fingerprint: unchanged at 19/20 with 15 package patch mismatches.

## Verdict

The deterministic script portion meets the requirement. The two
security/privacy corrections and the portable-path correction were implemented,
revalidated, and approved by the user for commit progression. The credentialed
RLS run and device matrix remain Phase 1 execution work, not prerequisites for
landing the traceable baseline tooling used to build that candidate.
