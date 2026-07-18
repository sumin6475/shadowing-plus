---
name: system-review
description: Meta-review of a run — find bugs in the PROCESS, not the code, and turn them into numbered, ready-to-apply AI-layer improvement proposals for human curation. Also adjudicates any pending auto-reflector draft. Don't just fix the bug; fix the system that allowed the bug.
argument-hint: <path-to-plan> <path-to-execution-report>
---

<!-- Source: coleam00/habit-tracker .claude/commands/validation/system-review.md (good/bad divergence classification, root-cause tracing, alignment score, suggest-the-actual-text rule) merged with coleam00/piv-system-evolution .archon/commands/piv-system-review.md (numbered ready-to-apply proposals, proposal-not-commit framing, scope boundary → adapted to our Upstream-first rule); reflector-draft adjudication is ours — adapted 2026-07-10 -->

# System Review

**Plan**: $1
**Execution report**: $2

**This is NOT code review.** You are not looking for bugs in the code — you are looking for bugs in the *process*, and turning them into AI-layer improvements.

## Philosophy

- Good divergence reveals plan limitations → improve the planning skill
- Bad divergence reveals unclear requirements or missing context → improve CLAUDE.md / reference docs
- Repeated friction reveals a missing capability → propose a new skill or reference doc
- The output is a **proposal, not a committed change** — the human curates every item

## Phase 1: Load

- `$1` — what the agent was supposed to do
- `$2` — what actually happened: divergences, code-review catches, the friction log
- The skills that drove the run: `.claude/skills/plan-feature/SKILL.md` and `.claude/skills/execute/SKILL.md` (to propose edits against their actual text)
- The project's current AI layer: `CLAUDE.md` (root and per-area), On-Demand Context docs
- **`.claude/claude-md-review.md` if it exists** — the auto-reflector's pending draft. Fold its suggestions into your proposals (keep, sharpen, or reject each), then note it as adjudicated.

## Phase 2: Analyze

**Classify each divergence** from the execution report:

- **Good ✅ (justified)** — plan assumed something untrue; better pattern found during implementation; security/performance forced a change
- **Bad ❌ (problematic)** — explicit constraints ignored; new architecture invented instead of following patterns; shortcuts creating tech debt; requirements misunderstood

**Trace root causes** for each bad divergence and each friction-log entry:

- Was the plan unclear? Where, why?
- Was context missing from the AI layer? What, and where should it live?
- Was a check missing that would have caught it earlier?
- Was a manual step repeated that should become a skill?

**Focus on patterns** — a one-off is not actionable; a repeated problem is.

## Phase 3: Write the proposal

Save to `.agents/system-reviews/{slug}.md`. Every proposal must be **specific and ready to apply**: exact target file, exact text to add or change — approvable at a glance.

```markdown
# System Review — AI-Layer Evolution Proposal

## Meta
- Plan: {path to $1} · Execution report: {path to $2} · Date: {YYYY-MM-DD}

## Alignment Score: __/10
[10 = perfect adherence, all divergences justified; 7-9 minor justified; 4-6 mixed; 1-3 major problems]

## Divergence Analysis
For each divergence:
- divergence: [what changed]
- classification: good ✅ / bad ❌
- root cause: [unclear plan | missing context | missing validation | repeated manual step]

## Pattern Compliance
- [ ] Followed codebase architecture
- [ ] Used documented patterns (CLAUDE.md)
- [ ] Applied testing patterns correctly
- [ ] Met validation requirements

## Proposed Changes

Numbered so the human can approve, edit, or reject individually.
Each proposal is tagged by where it applies:
- **[PROJECT]** — this project's own AI layer (its CLAUDE.md, its docs). Apply here after approval.
- **[PACK]** — the shared starter pack (skills/agents/hooks/templates). Per the Upstream-first
  rule, apply in `Build System/ai-layer/` FIRST, then re-copy to projects — never patch the
  local copy alone, or the copies drift.

Tie-breaker: files that `/create-rules` generates or pins per-project (`CLAUDE.md`,
`hooks_config.json` contents) are **[PROJECT]** even though the pack ships their skeletons;
the skeleton/template itself is **[PACK]**.

### Proposal 1 — [PROJECT] UPDATE `CLAUDE.md`
- Why: [the friction or divergence this prevents next time]
- Exact change: [the precise text, and where in the file]

### Proposal 2 — [PACK] UPDATE `.claude/skills/plan-feature/SKILL.md`
- Why: [...]
- Exact change: [...]

### Proposal 3 — [PROJECT] CREATE `{new reference doc}`
- Why: [missing context seen 2+ times]
- Proposed content: [outline or full draft]

[If the run was clean: "No AI-layer changes proposed — the run hit no actionable friction."]

## Reflector Draft
[Adjudicated .claude/claude-md-review.md: which suggestions were folded in (as which proposal #),
which rejected and why — or "no pending draft".]

## Key Learnings
- What worked well: [...]
- What needs improvement: [...]

## Summary
[1-2 sentences: what the system will be better at next time if these are accepted]
```

## Phase 4: Report and stop

Summarize: alignment score, proposal count by tag, what improves if accepted. **Then stop — the human curates.** After approval:

1. Apply **[PROJECT]** proposals in this project
2. Apply **[PACK]** proposals upstream in `Build System/ai-layer/`, then re-copy to projects
3. Delete `.claude/claude-md-review.md` (its content now lives in this review)
4. Commit with a `Context:` section (per `/commit`) so the evolution is traceable in git log

## Important

- **Be specific**: not "the plan was unclear" but "the plan didn't specify which auth pattern to use"
- **Suggest the actual text** — don't just describe the change, write it
- **Every finding needs a concrete asset update**; analysis without a proposal is noise
