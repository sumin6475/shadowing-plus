---
name: code-review
description: Holdout code review of a change — judges from requirements + diff + code only, never the plan. Writes a severity-tagged review artifact to .agents/code-reviews/ for human triage. Run after /validate, before /commit.
argument-hint: <pr-number|file|folder|blank = uncommitted changes>
---

<!-- Source: coleam00/habit-tracker .claude/commands/validation/code-review.md (review philosophy, context gathering, 5 analysis categories, verify-issues-real, severity output); scope-parsing table, severity taxonomy, and report shape from coleam00/ai-transformation-workshop .claude/commands/review.md; holdout principle from coleam00/dark-factory-experiment FACTORY_RULES.md — adapted 2026-07-10 -->

# Code Review (Holdout)

**Input**: $ARGUMENTS

## The Holdout Rule

You judge the change on its own merits, like a reviewer who wasn't in the room when it was planned:

- ❌ Do NOT read `.agents/plans/` or `.agents/execution-reports/` — the implementer's plan and self-assessment are off-limits
- ✅ Judge from: the requirement (issue, PRD section, or the user's description of what this change should do) + the diff + the surrounding code + your own test runs

**If this session previously ran `/plan-feature` or `/execute` for this change, the holdout is already broken — delegate the analysis to the `code-reviewer` subagent (fresh context) or tell the user to run `/code-review` in a fresh session.** When delegating: pass only the requirement and the scope in the subagent prompt — no plan content. The main session then converts the subagent's PASS/CONCERNS findings into the Phase 5 artifact format (assigning severities) and writes the artifact file.

(Checking `.agents/plans/` **filenames** to reuse the feature's slug is fine; reading their contents is not.)

## Review Philosophy

- Simplicity is the ultimate sophistication — every line should justify its existence
- Code is read far more often than it's written — optimize for readability
- The best code is often the code you don't write
- Be constructive and actionable: every issue carries a clear recommendation
- Focus on real bugs, not style preferences

## Phase 1: Determine Scope

| Input | Action |
|-------|--------|
| PR number/URL | `gh pr view {N} --json number,title,author,files` + `gh pr diff {N}` |
| File path | Review that file |
| Folder path | Review all source files in it |
| Blank | Review uncommitted changes: `git status`, `git diff HEAD`, `git diff --stat HEAD`, plus new files via `git ls-files --others --exclude-standard` |

## Phase 2: Gather Context (not the plan)

- Read CLAUDE.md (and per-area CLAUDE.md files) for the project's standards
- Understand the requirement: what is this change supposed to do? (PR description, issue, PRD section, or ask the user — never the plan file)
- Read each changed/new file **in its entirety**, not just the diff — full context reveals what diffs hide

## Phase 3: Analyze

For each changed or new file:

1. **Logic errors** — off-by-one, incorrect conditionals, missing error handling, race conditions
2. **Security issues** — injection, XSS, insecure data handling, exposed secrets/keys (flag as CRITICAL)
3. **Performance problems** — N+1 queries, inefficient algorithms, memory leaks, unnecessary computation
4. **Code quality** — DRY violations, overly complex functions, poor naming, missing types
5. **Standards adherence** — CLAUDE.md rules, existing patterns, logging/testing standards
6. **Requirement fit** — does the diff actually accomplish the stated requirement? Anything missing or out of scope?

Severity taxonomy:

| Severity | Criteria |
|----------|----------|
| **critical** | Security issues, data loss, crashes |
| **high** | Logic errors, missing error handling, requirement not met |
| **medium** | Pattern inconsistencies, missing edge cases |
| **low** | Style suggestions, minor improvements |

## Phase 4: Verify Issues Are Real

- Run specific tests that would expose the suspected issues
- Confirm type errors are legitimate
- Validate security concerns in context
- Drop anything you can't substantiate — a review artifact full of maybes wastes the human's gate

## Phase 5: Write the Review Artifact

**Output path**: `.agents/code-reviews/{slug}.md` (same slug as the feature's plan file when reviewing a feature; otherwise a descriptive name).

```markdown
# Code Review: {scope}

**Scope**: {PR #N / paths / uncommitted changes}
**Requirement**: {one line — what this change is supposed to do}
**Recommendation**: APPROVE / NEEDS WORK

## Stats
- Files modified: {N} · added: {N} · deleted: {N}
- Lines: +{N} / -{N}

## Findings

{For each issue:}
```
severity: critical|high|medium|low
file: path/to/file.py
line: 42
issue: [one-line description]
detail: [why this is a problem]
suggestion: [how to fix it]
```

{If none: "Code review passed. No technical issues detected."}

## What's Good
{Acknowledge what's well done — signal, not flattery}

## Verdict
{2-3 sentences: does the change meet the requirement, and what must happen before commit}
```

## Phase 6: Report to the User

Summarize: recommendation, finding counts by severity, artifact path. If the scope was a PR, offer to post the review as a PR comment (`gh pr review {N} --comment --body-file .agents/code-reviews/{slug}.md`) — ask before posting; it's outward-facing. **Then stop — the human triages the review.** If findings need fixing: `/code-review-fix .agents/code-reviews/{slug}.md`. If clean and approved: `/commit`.
