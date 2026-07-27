---
name: code-review-fix
description: Fix issues from a code review — takes a review artifact (or pasted findings) and a scope, fixes one by one with tests, then re-validates. The human triages which findings to fix; this skill executes the triage.
argument-hint: <review-file-or-description> [scope]
disable-model-invocation: true
---

<!-- Source: coleam00/habit-tracker .Codex/commands/validation/code-review-fix.md (deliberately minimal two-argument shape) — adapted 2026-07-10 -->

# Fix Code Review Findings

A code review (AI or human) found issues to fix.

**Review** (file path or description of issues): $1
**Scope** (which findings to address — e.g. "all", "critical+high only", specific items): $2

## Process

1. If the review is a file, read it **in its entirety** first to understand all findings and their context. Default scope when none given: all findings the human hasn't explicitly waived.
2. For each finding in scope, one by one:
   - Explain what was wrong
   - Fix the **root cause** (never suppress, disable, or work around a check)
   - Create/run the relevant test to verify the fix
3. Update the review artifact: mark each addressed finding with `status: fixed` (or `status: waived — {reason}` for out-of-scope ones), so the artifact stays the single record of the review loop.
4. After all fixes, re-run the project's Validation-contract commands from AGENTS.md (the same gauntlet `/validate` runs — you can't invoke `/validate` itself; it's human-invoked) and confirm nothing regressed.

## Report

- Findings fixed (with one-line summaries) and findings waived
- Test evidence per fix
- Validation result
- **Next step**: human re-checks the updated review artifact, then `/commit`
