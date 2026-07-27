---
name: commit
description: Create an atomic conventional commit for the current change — WHY-focused body, AI-layer changes logged in a Context section, and the source PRD's phase status flipped to done. Run after code-review approval.
disable-model-invocation: true
---

<!-- Source: context-engineering-intro use-cases/ai-coding-wisc-framework .Codex/commands/commit.md (conventional tags, WHY body, Context section = git log as memory); atomic-commit minimalism from coleam00/habit-tracker .Codex/commands/commit.md; PRD-status step is ours (see Build System MEMORY.md decision) — adapted 2026-07-10 -->

# Commit Changes

## Process

### 1. Review changes

```bash
git status
git diff HEAD
git diff --stat HEAD
git ls-files --others --exclude-standard
```

### 2. Flip the PRD phase status (feature commits)

If this commit lands a feature whose plan (`.agents/plans/{slug}.md`) names a **Source PRD**, read the plan's **PRD Phase** field and update that PRD's Implementation Phases table: that phase's Status → `done`. Stage the PRD change with this commit — the status flip belongs to the landing, not to a separate housekeeping commit.

### 3. Stage files

Stage the changed/untracked files relevant to this work, **including the feature's `.agents/` artifacts** (plan, code review) — they are the decision history.

**Do NOT stage:** `.env` or credential files, large binaries, `e2e-screenshots/` and generated test reports (e2e artifacts stay local; the project's `.gitignore` should cover them), the reflector's transient files (`.Codex/Codex-md-review.md`, `.Codex/.Codex-md-review-state` — drafts get adjudicated by /system-review, not committed), files unrelated to the current task.

### 4. Create the commit

Atomic message with a conventional tag: `feat:` `fix:` `refactor:` `docs:` `test:` `chore:` `perf:` — with a scope for multi-package repos, e.g. `feat(api): ...`.

```
tag(scope): concise description of what changed

[Body explaining WHY this change was made, not just what.
Include context that isn't obvious from the diff.]

[Optional: Fixes #123]
```

### 5. Capture AI-layer changes (Context section)

If this commit touches AI context assets, add a `Context:` section to the body listing them:

- `AGENTS.md` (root or per-area) — rules changes
- `.Codex/skills/` — skills created or modified
- `.Codex/agents/` — subagent definitions
- `.Codex/hooks/` or `.Codex/settings.json` — hook changes
- On-Demand Context docs

```
feat(api): add retry logic for session recovery

Single crashes previously failed the whole workflow; exponential
backoff makes recovery automatic.

Context:
- Updated AGENTS.md error-handling rules with the retry convention
- Surfaced issue: flaky-test pattern documented in testing.md
```

**Why this matters**: the git log is long-term memory. Future sessions use it to trace WHY a rule exists or WHEN a skill changed. Uncaptured AI-layer changes make the system's evolution invisible.

### 6. Report

- The commit hash and message
- PRD phase flipped (if any)
- **No push** — pushing/PR creation only when the user asks or the project's AGENTS.md git workflow says so
- Next step: `/deploy` when this change should ship, or `/execution-report` if the run had notable divergences
