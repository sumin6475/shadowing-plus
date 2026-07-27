---
name: execute
description: Execute an approved implementation plan from .agents/plans/, task by task, with per-task validation. Run in a FRESH session — the plan file plus project rules are the only context needed.
argument-hint: <path-to-plan>
disable-model-invocation: true
---

<!-- Source: coleam00/habit-tracker .Codex/commands/core_piv_loop/execute.md (task execution discipline, output report; its plan-template COMPLETION CHECKLIST is folded into Step 6 here); clean-tree pre-flight and incremental/full validation split from context-engineering-intro use-cases/ai-coding-wisc-framework .Codex/commands/execute.md, fresh-session framing from that use-case's README — adapted 2026-07-10 -->

# Execute: Implement from Plan

## Plan to Execute

Read the plan file: `$ARGUMENTS`

**Context reset**: this skill is designed to run in a fresh session, so planning-phase research doesn't pollute implementation context. The plan file and the project's AGENTS.md are all you need — the plan was written to pass the No Prior Knowledge Test. If something essential is missing from the plan, that is a plan defect: note it for the execution report rather than silently improvising.

## Step 1: Read the Entire Plan

Read the plan from start to finish before writing a single line of code. Understand:

- All tasks and their dependency order
- The context references (read every MUST READ file and linked doc section)
- The patterns to follow and gotchas to avoid
- The validation commands, per task and overall
- Any NEEDS-HUMAN markers — tell the user what will be needed BEFORE starting Task 1, so nothing blocks mid-run

Do NOT start implementing until you have the full picture.

## Step 2: Pre-flight Checks

```bash
git status
git branch --show-current
```

- If there are uncommitted changes unrelated to this plan, flag them to the user before proceeding.
- Note the current branch; if the project uses feature branches, create one per its AGENTS.md git-workflow conventions. If none are documented, ask the user rather than guessing.

## Step 3: Execute Tasks in Order

For EACH task in STEP-BY-STEP TASKS, in dependency order:

1. **Read** the target file(s) and the task's PATTERN reference before modifying — never edit blindly.
2. **Implement** exactly what the task specifies, consistent with the project's existing patterns and AGENTS.md conventions (types, docs, logging as the project does them).
3. **Validate immediately** — run the task's `VALIDATE` command. If it fails: fix the root cause, re-run, and continue only when it passes. Never mock, skip, or weaken a check to get past it.

Do not accumulate broken state: a failing task blocks the next one.

## Step 4: Implement the Testing Strategy

After the implementation tasks:

- Create all test files specified in the plan
- Implement the test cases it names, covering expected, edge, and failure cases
- Follow the project's existing test structure and assertion style

## Step 5: Full Validation

Run ALL commands from the plan's VALIDATION COMMANDS section, level by level (Level 1 → Level 3; Level 4 as far as it's automatable from this session; Level 5 if the plan includes it).

If any command fails: fix the issue, re-run, continue only when it passes. Where the Stop hook is installed it enforces the lint+test baseline mechanically; either way, passing the plan's full command list is this skill's own exit bar.

## Step 6: Final Verification

- ✅ All tasks from the plan completed, in order
- ✅ Each task's VALIDATE passed at the time of the task
- ✅ All tests created and passing
- ✅ All validation commands pass
- ✅ Code follows project conventions
- ✅ Documentation added/updated where the plan says so

## Output Report

```markdown
## Execution Report: {plan name}

### Tasks completed
- [x] {ACTION} {file} — {one-line outcome}
...

### Files created
- `{path}` — {purpose}

### Files modified
- `{path}` — {what changed}

### Tests added
- {test files and cases, with results}

### Validation results
- Level 1 (lint/style): PASS / FAIL
- Level 2 (unit): PASS / FAIL ({N} passed)
- Level 3 (integration): PASS / FAIL
- {any additional levels run}

### Manual verification (left for the human)
- {Level-4 steps not automatable from this session: exact commands, URLs, or UI walk-throughs — or "none"}

### Deviations from plan
- {what was done differently and WHY — or "none". Be honest; /execution-report and /system-review consume this}

### Next step
Ready for `/validate` (full gauntlet) and `/code-review`. Do NOT commit yet — commits come after review approval, via /commit.
```

## Notes

- If you hit an issue the plan doesn't address, document it and solve it in the spirit of the plan; it goes in Deviations.
- If a deviation would change the plan's architecture or scope, stop and ask the user instead of deciding alone.
- Don't skip validation steps, and don't reorder tasks unless a dependency error in the plan forces it (document that too).
