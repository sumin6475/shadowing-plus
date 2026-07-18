---
name: execution-report
description: Post-implementation self-reflection — document what was actually built vs the plan, divergences with reasons, and a friction log of everywhere the AI layer fell short. The primary input to /system-review. Run after a feature lands (or after a rough run worth learning from).
argument-hint: <path-to-plan> (blank = the most recent plan with landed work)
---

<!-- Source: coleam00/habit-tracker .claude/commands/validation/execution-report.md (report shape, divergence typing) merged with coleam00/piv-system-evolution .archon/commands/piv-execution-report.md (Friction Log, code-review-issues section, honesty framing) — adapted 2026-07-10 -->

# Execution Report

**Plan**: $ARGUMENTS

Reflect deeply on how the run actually went. This report is the primary input to `/system-review` — **be honest and specific**; a flattering report teaches the system nothing.

## Phase 1: Load the run's trail

- The plan: `$ARGUMENTS`; if blank, the plan whose slug matches the newest feature commit in `git log` (confirm the choice with the user if ambiguous)
- The `/execute` output report (from this session, or reconstruct from `git log` + the diff)
- Validation results (the `/validate` report if available)
- `.agents/code-reviews/{slug}.md` — what the review caught and what was fixed
- Any feedback the human gave at the gates — **human-gate feedback is high-signal friction; weight it heavily in the Friction Log**
- The change footprint: `git log --oneline` + `git diff --stat` scoped to this feature's commits

## Phase 2: Write the report

Save to `.agents/execution-reports/{slug}.md` (same slug as the plan):

```markdown
# Execution Report: {feature}

## Meta
- Plan: .agents/plans/{slug}.md
- Files added: [paths]
- Files modified: [paths]
- Lines changed: +X -Y

## Validation Results
- Lint / types: PASS / FAIL [details]
- Tests: PASS / FAIL [X passed, Y failed]
- Build / smoke: PASS / FAIL [details]

## What Went Well
- [concrete things that worked smoothly]

## Challenges Encountered
- [what was difficult and why]

## Divergences from the Plan
For each divergence:
**[Title]**
- Planned: [what the plan specified]
- Actual: [what was implemented instead]
- Reason: [why it diverged]
- Type: [Better approach found | Plan assumption wrong | Security concern | Performance issue | Other]

## Issues the Code Review Caught
- [each finding, and whether it points to a planning gap or an execution gap]

## Skipped Items
- [anything from the plan not implemented] — Reason: [why]

## Friction Log
Where did the agent have to guess, search, or backtrack because the AI layer
(CLAUDE.md, skills, reference docs) didn't provide what it needed?
- [specific friction point] — [what was missing, and where it should live]

## Recommendations
- [AI-layer changes that would have made this run smoother — specific]
```

The **Friction Log** and **Recommendations** matter most — they are what `/system-review` turns into system improvements. "The plan was fine" with an empty friction log is almost never true; look harder.

## Phase 3: Report

Summarize to the user: outcome, key divergences, top friction points. **Next step**: `/system-review .agents/plans/{slug}.md .agents/execution-reports/{slug}.md` when there's enough signal to evolve the system (typically after each nontrivial feature, or when the same friction shows up twice).
