---
name: create-rules
description: Generate or refresh the project's AGENTS.md by analyzing the codebase (brownfield) or deriving from the PRD (greenfield). Run at project setup, or when conventions have drifted from what AGENTS.md says.
argument-hint: [path to PRD, optional]
disable-model-invocation: true
---

<!-- Source: coleam00/ai-transformation-workshop .Codex/commands/create-rules.md; layered AGENTS.md / CODEBASE_MAP.md / .claudeignore patterns from coleam00/helpline — adapted 2026-07-10 -->

# Create Global Rules

**Input**: $ARGUMENTS

Generate the project's `AGENTS.md` from evidence, not assumption: real code for brownfield, the PRD's decisions for greenfield.

## Objective

Produce project-specific global rules that give every future session:
- What this project is
- Technologies used and why
- How the code is organized
- Patterns and conventions to follow
- The exact commands to build, test, and validate (other components depend on these — see Phase 2)

## Phase 0: SOURCE

Determine where truth comes from. **Whenever substantial code exists, the code is the authority** — a PRD only fills gaps the code can't answer (intent, scope, deferred features). Rules describe what IS.

- **Refresh** — `AGENTS.md` already exists → edit it in place against current evidence; don't regenerate from the template (the template is only for first generation and lives upstream in Build System).
- **Brownfield** — substantial code exists, no AGENTS.md → extract the conventions that already exist in the code. Do not invent new ones.
- **Greenfield** — a PRD was passed as argument, or a PRD exists in `.agents/PRDs/` AND there is no substantial code yet → the PRD's tech decisions, architecture section, and scope are authoritative.
- **Neither PRD nor code** → stop and tell the user to run `/create-prd` first (there is nothing to extract rules from).

If `.agents/PRDs/` holds multiple PRDs: an argument-specified PRD wins; otherwise use the product-level (or newest) one and confirm the choice with the user before proceeding.

## Phase 1: DISCOVER

### Identify project type

| Type | Indicators |
|------|------------|
| Web app (full-stack) | Separate client/server dirs, API routes |
| Web app (frontend) | React/Vue/Svelte, no server code |
| API/backend | FastAPI/Express/etc., no frontend |
| Library/package | `main`/`exports` in package.json, publishable; `pyproject.toml` with build backend |
| CLI tool | `bin` entry, command-line interface |
| Monorepo | Multiple packages/services, workspaces config |
| Script/automation | Standalone scripts, task-focused |

### Analyze configuration

Read the root config files that exist: `package.json`, `pyproject.toml`, `tsconfig.json`, `go.mod`, `Cargo.toml`, `vite.config.*`, `docker-compose.yml`, CI configs. They name the stack, the scripts, and the tooling.

### Map directory structure

Where does source live? Where are tests? Any shared code whose changes ripple everywhere? Configuration locations?

## Phase 2: ANALYZE

### Extract tech stack

Runtime/language, frameworks, database, testing tools, build tools, lint/format tools — each with its purpose.

### Extract the validation commands (contract)

Find the **real, runnable** lint, typecheck, test, and build commands (from package scripts, pyproject, CI config, or README). These go into AGENTS.md's Validation section as the baseline command set: `/validate` runs them plus e2e/smoke as the full gauntlet, and they must be kept in sync with `.Codex/hooks/hooks_config.json` (the Stop hook enforces lint+test mechanically from there). Verify each command actually runs before writing it down. Then replace `hooks_config.json`'s `"auto"` entries with the explicit verified commands (see its `_explicit_example`), so the gate stops depending on detection heuristics.

### Identify patterns

Study existing code (brownfield) or the PRD's architecture section (greenfield) for:
- **Naming**: files, functions, classes
- **Structure**: how code is organized within files
- **Errors**: how errors are created and handled
- **Types**: how types/interfaces are defined
- **Tests**: how tests are structured
- **Gotchas**: shared modules with wide blast radius, stateful fixtures, ordering constraints, files that must never be touched

### Find key files

Entry points, configuration, core business logic, shared utilities, type definitions.

## Phase 3: GENERATE

First generation: fill `Codex-template.md` (project root) into **`AGENTS.md`** (project root). Refresh: edit the existing `AGENTS.md` in place, preserving its structure.

- **Keep it lean**: only repo-wide truths. Remove template sections that don't apply; never pad thin sections.
- **On-demand context**: heavy knowledge goes into referenced docs, one row per "read when working on X" trigger.
- **Large repo / monorepo**: keep the root AGENTS.md minimal and generate a per-area `AGENTS.md` for each service/package with local conventions and its scoped test command. Also generate `CODEBASE_MAP.md` (feature-location map: "a route → services/api/routes.py") and `.claudeignore` (caches, lockfiles, build output, .venv/node_modules).
- Every claim must trace to evidence found in Phase 1–2. If unsure, write nothing rather than guessing.

## Phase 4: REVIEW GATE

Report to the user:

```markdown
## Global Rules Created

**File**: `AGENTS.md` {+ per-area files / CODEBASE_MAP.md / .claudeignore if generated}

### Project type
{detected type}

### Tech stack summary
{key technologies}

### Validation contract
{the lint/typecheck/test/build commands written into the Validation section, each verified runnable: yes/no}

### Judgment calls
{anything inferred rather than directly observed — flag for review}
```

Then ask the user to review `AGENTS.md` before treating setup as done. After approval of a first generation, delete `Codex-template.md` from the project — the template lives upstream in Build System, and later `/create-rules` runs refresh `AGENTS.md` in place without needing it.

## Tips

- Focus on patterns and conventions, not exhaustive documentation — link instead of duplicating.
- Rules describe what IS, not what you wish. Aspirations belong in the PRD.
- Update AGENTS.md as the project evolves; `/system-review` will propose edits when reality drifts from the rules.
