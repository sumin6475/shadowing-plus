---
name: plan-feature
description: Transform a feature request into a context-rich implementation plan in .agents/plans/ through codebase analysis, external research, and strategic thinking. The plan file is the human review gate before /execute. No code is written in this phase.
argument-hint: <feature description | path to PRD>
disable-model-invocation: true
---

<!-- Source: coleam00/habit-tracker .Codex/commands/core_piv_loop/plan-feature.md (5-phase process, plan template, task format, quality criteria); input-parse table, SOURCE-snippet pattern table, and risk table from coleam00/ai-transformation-workshop .Codex/commands/plan.md — adapted 2026-07-10 -->

# Plan a Feature

## Feature: $ARGUMENTS

## Mission

Transform a feature request into a **comprehensive implementation plan** through systematic codebase analysis, external research, and strategic planning.

**Core Principle**: We do NOT write code in this phase. The goal is a context-rich plan that enables one-pass implementation success.

**Key Philosophy**: Context is King. The plan must contain ALL information needed for implementation — patterns, mandatory reading, documentation, validation commands — so the execution agent (running fresh, with the plan as its only context) succeeds on the first attempt.

**Order**: CODEBASE FIRST. Solutions must fit existing patterns.

## Phase 0: Parse Input

| Input | Action |
|-------|--------|
| Path to a PRD in `.agents/PRDs/` | Read it; plan the next pending implementation phase (or the phase the user names) |
| Other `.md` file path | Read it and extract the feature description |
| Free-form text | Use directly as the feature request |
| Blank | Use conversation context; if none, ask what to plan |

## Phase 1: Feature Understanding

- Extract the core problem being solved
- Identify user value and impact
- Determine feature type: New Capability / Enhancement / Refactor / Bug Fix
- Assess complexity: Low / Medium / High
- Map affected systems and components

Create (or refine, if the user provided one) a user story:

```
As a <type of user>
I want to <action/goal>
So that <benefit/value>
```

## Phase 2: Codebase Intelligence Gathering

Use research subagents for parallel analysis where beneficial — the codebase-analyst subagent if installed, otherwise the built-in Explore agent. **Subagents are for research only, never implementation.**

**1. Project structure** — primary languages, frameworks, runtime versions; directory structure and architectural patterns; service/component boundaries and integration points; configuration files; build processes.

**2. Pattern recognition** — similar implementations already in the codebase; naming conventions (files, functions, classes); file organization; error handling approaches; logging patterns; anti-patterns to avoid. Check AGENTS.md (and per-area AGENTS.md files) for project-specific rules.

**3. Dependency analysis** — external libraries relevant to the feature and how they're integrated (imports, configs); relevant docs in `docs/`, On-Demand Context files, or `.agents/reference/` if present; versions and compatibility.

**4. Testing patterns** — test framework and structure; similar test examples to reference; unit vs integration organization; coverage standards.

**5. Integration points** — existing files that need updates; new files to create and their locations; router/API registration patterns; database/model patterns; auth patterns if relevant.

**Clarify ambiguities — hard stop:** if requirements are unclear at this point, ask the user and wait. Get specific preferences (libraries, approaches, patterns) and resolve architectural decisions before proceeding. Never assume.

## Phase 3: External Research & Documentation

Use research subagents where beneficial:

- Latest library versions and best practices; official documentation with **specific section anchors**
- Implementation examples, common gotchas, known issues, breaking changes
- Security considerations and performance patterns for this stack

Compile references in this shape (every link carries a why):

```markdown
- [Library Official Docs](https://example.com/docs#section)
  - Specific section: {what}
  - Why: {needed for X}
```

Prefer official docs over blog posts.

## Phase 4: Deep Strategic Thinking

Think harder about:

- How does this feature fit the existing architecture?
- Critical dependencies and order of operations?
- What could go wrong? (edge cases, race conditions, error paths)
- How will this be tested comprehensively?
- Performance implications? Security considerations? Maintainability?

Design decisions: choose between alternative approaches with clear rationale; design for extensibility; plan backward compatibility if needed.

Capture risks:

| Risk | Mitigation |
|------|------------|
| {potential issue} | {how the plan handles it} |

## Phase 5: Generate the Plan

**Output path**: `.agents/plans/{kebab-case-descriptive-name}.md` (create the directory if needed). Examples: `add-user-authentication.md`, `implement-search-api.md`.

Mark tasks requiring human-held resources with NEEDS-HUMAN so /execute can front-load the ask. Greenfield: scaffolding CLIs (create-next-app etc.) refuse non-empty directories and the ai-layer pack is already present — include the explicit workaround as task steps: scaffold to a temp dir outside the project, move contents in without overwriting, merge .gitignore lines (preserving committed templates like `.env.example` with a `!` negation), remove the temp dir.

Fill this template for the implementation agent:

```markdown
# Feature: <feature-name>

This plan should be complete, but validate documentation links, codebase patterns, and task sanity before implementing. Pay special attention to the naming of existing utils, types, and models — import from the right files.

## Feature Description

<Detailed description: purpose and value to users>

## User Story

As a <type of user>
I want to <action/goal>
So that <benefit/value>

## Problem Statement

<The specific problem or opportunity this feature addresses>

## Solution Statement

<The proposed solution approach and how it solves the problem>

## Metadata

**Feature Type**: [New Capability/Enhancement/Refactor/Bug Fix]
**Complexity**: [Low/Medium/High]
**Systems Affected**: [main components/services]
**Dependencies**: [external libraries or services]
**Source PRD**: [.agents/PRDs/{name}.md or N/A]
**PRD Phase**: [phase # from the PRD's Implementation Phases table, or N/A — /commit flips this phase's Status when the work lands]

---

## CONTEXT REFERENCES

### Relevant codebase files — MUST READ BEFORE IMPLEMENTING

- `path/to/file.py` (lines 15-45) — Why: contains the pattern for X we mirror
- `path/to/model.py` (lines 100-120) — Why: model structure to follow
- `path/to/test.py` — Why: test pattern example

### New files to create

- `path/to/new_service.py` — service implementation for X
- `tests/path/to/test_new_service.py` — unit tests for the new service

### Relevant documentation — READ BEFORE IMPLEMENTING

- [Doc link](https://example.com/doc#section)
  - Specific section: {what}
  - Why: {reason}

### Patterns to follow

<Extracted from THIS codebase — real snippets, not invented examples>

**{Pattern category}:**
```{lang}
// SOURCE: {file:lines}
{actual code snippet from the project}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation
<Foundational work: schemas, types, dependencies, utilities>

### Phase 2: Core Implementation
<Main work: business logic, services, endpoints, models>

### Phase 3: Integration
<Wiring: routers/handlers, registration, configuration>

### Phase 4: Testing & Validation
<Unit tests per component, integration tests, edge cases, acceptance criteria>

---

## STEP-BY-STEP TASKS

IMPORTANT: execute every task in order, top to bottom. Each task is atomic and independently verifiable.

Action keywords: **CREATE** (new file/component), **UPDATE** (modify existing), **ADD** (insert into existing code), **REMOVE** (delete deprecated), **REFACTOR** (restructure, no behavior change), **MIRROR** (copy a pattern from elsewhere in the codebase).

### {ACTION} {target_file}

- **IMPLEMENT**: {specific implementation detail}
- **PATTERN**: {existing pattern reference — file:line}
- **IMPORTS**: {required imports/dependencies}
- **GOTCHA**: {known issues or constraints to avoid}
- **NEEDS-HUMAN**: {human-held resource this task requires — API key, account, approval — omit if none}
- **VALIDATE**: `{executable validation command}`

<Continue with all tasks in dependency order...>

---

## TESTING STRATEGY

### Unit tests
<Scope and requirements per project standards; fixtures and assertions follow existing approaches>

### Integration tests
<Scope and requirements per project standards>

### Edge cases
<Specific edge cases that must be tested for this feature>

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and full feature correctness. Derive from the project's AGENTS.md Validation section plus feature-specific checks.

### Level 1: Syntax & style — {project lint/format commands}
### Level 2: Unit tests — {project unit test commands}
### Level 3: Integration tests — {project integration test commands}
### Level 4: Manual validation — {feature-specific steps: API calls, UI walk-through; the /e2e-test skill (if installed) for browser journeys}
### Level 5: Additional (optional) — {MCP servers or extra CLI tools if available}

---

## ACCEPTANCE CRITERIA

- [ ] Feature implements all specified functionality
- [ ] All validation commands pass with zero errors
- [ ] Tests cover expected, edge, and failure cases
- [ ] Code follows project conventions and patterns
- [ ] No regressions in existing functionality
- [ ] Documentation updated (if applicable)
- [ ] Performance meets requirements (if applicable)
- [ ] Security considerations addressed (if applicable)

---

## NOTES

<Additional context, design decisions, trade-offs>
```

## Quality Criteria (self-check before finishing)

**Context completeness** — all necessary patterns documented; external libraries linked; integration points mapped; gotchas captured; **every task has an executable VALIDATE command**. Schema/validation tasks encode the PRD's quantified constraints (counts, lengths, ranges) in the schema itself, not only in prompt text.

**Implementation ready** — another developer could execute without additional context; tasks ordered by dependency; each task atomic; pattern references carry file:line.

**Pattern consistency** — tasks follow existing conventions; new patterns justified; no reinvention of existing utils; testing matches project standards.

**Information density** — no generic references; URLs have section anchors; validation commands are non-interactive and executable. Dependency versions are pinned exactly (never `@latest`) and match AGENTS.md's Tech Stack table.

## Success Metrics

- **One-pass implementation**: the execution agent completes the feature without additional research or clarification.
- **No Prior Knowledge Test**: someone unfamiliar with the codebase could implement using only the plan's content.
- **Confidence score**: #/10 that execution succeeds on the first attempt.

## Report

After writing the plan file, report:

- Summary of feature and approach
- Full path to the plan file
- Complexity assessment and key risks
- Confidence score (#/10) for one-pass success

**Then stop. The user reviews and approves the plan before `/execute` runs — do not start implementation, and do not run `/execute` yourself.**
