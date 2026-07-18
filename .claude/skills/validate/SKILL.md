---
name: validate
description: Run the project's full validation gauntlet — lint, typecheck, tests with coverage, build, live smoke test — and produce a PASS/FAIL health report. The pre-ship gate; run after /execute and before /code-review or /commit.
---

<!-- Source: coleam00/habit-tracker .claude/commands/validation/validate.md (6-step gauntlet shape, generalized from its FastAPI/React-specific commands to read from CLAUDE.md's Validation contract) — adapted 2026-07-10 -->

# Validate: Full Gauntlet

Run comprehensive validation of the project and report overall health.

**Command source**: the project CLAUDE.md's **Validation** section is the contract — run those exact commands. Where a step below has no project command, mark it N/A rather than inventing one. If CLAUDE.md's commands look stale (fail for tooling reasons, not code reasons), flag that as a finding — the contract needs fixing via `/create-rules`.

**Discipline**: when a step fails, fix the root cause and re-run. Never weaken a check, skip a step, or mock something to get past a gate.

Execute in sequence:

## 1. Lint / format check

Run the project's lint command. **Expected**: clean, zero errors.

## 2. Type check

Run the project's typecheck command (if the language has one). **Expected**: zero errors.

## 3. Tests (with coverage where configured)

Run the full test suite; include coverage if the project configures it. **Expected**: all pass; coverage meets the project's configured threshold.

## 4. Build

Run the project's build command. **Expected**: build completes without errors or new warnings.

## 5. Live smoke test (when the project has a runnable surface)

- Start the app/server in the background if not already running
- Hit the key endpoints/pages: `curl` for APIs (check status codes and response shape), or `/e2e-test` (if installed) for full browser journeys
- Stop anything you started: `lsof -ti:{port} | xargs kill -9 2>/dev/null || true`

**Expected**: app starts, responds correctly on its main surfaces.

## 6. Summary report

```markdown
## Validation Report

| Step | Status | Notes |
|------|--------|-------|
| Lint | PASS / FAIL / N/A | {…} |
| Types | PASS / FAIL / N/A | {…} |
| Tests | PASS / FAIL ({N} passed) | coverage {X}% vs {threshold}% |
| Build | PASS / FAIL / N/A | {…} |
| Smoke | PASS / FAIL / N/A | {endpoints/pages checked} |

**Overall: PASS / FAIL**

{Errors or warnings encountered, with file:line where relevant}
{Anything fixed during validation, and what the root cause was}

**Next step**: {PASS → /code-review; FAIL → fixes above were applied, re-run to confirm}
```
