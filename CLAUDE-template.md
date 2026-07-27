<!-- Source: coleam00/ai-transformation-workshop .claude/CLAUDE-template.md, layered-root discipline + Critical Gotchas pattern from coleam00/helpline CLAUDE.md — adapted 2026-07-10 -->
<!-- This file is consumed by /create-rules, which fills it in as the project's CLAUDE.md (project root). Delete this template from the project once CLAUDE.md is approved. -->

# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

**Keep this file lean — it holds only what's true everywhere in the repo.** Heavy knowledge goes in On-Demand Context docs or skill references. If the repo grows into areas with their own conventions (monorepo, multi-service), give each area its own CLAUDE.md and keep only repo-wide truths here.

## Project Overview

{One paragraph: what this project is, who it's for, current status. If a PRD exists, link it: `.agents/PRDs/{name}.md`}

## Tech Stack

| Technology | Purpose |
|------------|---------|
| {tech} | {why it's used} |

## Commands

```bash
# Development
{dev-command}

# Build
{build-command}

# Test
{test-command}

# Lint / format
{lint-command}
```

## Architecture

<!-- Folder organization and the reasoning behind it: layered, feature slices, MVC, event-driven... -->

```
{root}/
├── {dir}/     # {description}
├── {dir}/     # {description}
└── {dir}/     # {description}
```

{Describe the architectural approach and data flow in 2-4 sentences}

## Code Patterns

### Naming conventions
- {convention}

### File organization
- {pattern}

### Error handling
- {approach}

### Git workflow
- {trunk-based or feature branches; branch naming; who creates branches}

## Testing

<!-- Good defaults worth adopting if the project has no pattern yet: expected + edge + failure case per feature; scope test runs to what you changed when the suite is slow. Only write what's actually true for this project. -->

- **Run tests**: `{test-command}`
- **Test location**: `{test-directory}`
- **Pattern**: {test approach}

## Validation

<!-- CONTRACT: baseline command set. /validate runs these plus e2e/smoke as the full gauntlet. Keep in sync with .claude/hooks/hooks_config.json — the Stop hook enforces lint+test mechanically from there, so a change here alone does NOT update the gate. -->

```bash
{lint-command}
{typecheck-command}
{test-command}
{build-command}
```

## Critical Gotchas (repo-wide)

<!-- Things that bite: shared modules whose changes ripple everywhere, stateful test fixtures, ordering constraints, protected files an agent must never touch. Delete if none yet — do not pad. -->

- {gotcha}

## Deployment

<!-- Per-project deploy tweaks read by /deploy. Defaults are Vercel (web) / Railway (backend) — record here anything project-specific: platform + linked project name, env-var promotion steps, migration commands and their ordering, staging environment, known edge cases. Delete if this project never deploys. -->

- **Target**: {Vercel / Railway / both — with linked project name}
- **Env vars**: {how they're promoted; source of truth}
- **Migrations**: {command + when they run relative to deploy}
- **Edge cases**: {anything that bit before}

## Key Files

| File | Purpose |
|------|---------|
| `{path}` | {description} |

## On-Demand Context

<!-- Load-only-when-relevant docs. Row format: when working on X, read Y first. For larger repos also consider a CODEBASE_MAP.md (feature-location map) and a .claudeignore (caches, lockfiles, build output). -->

| Read when working on... | File |
|-------------------------|------|
| {topic} | `{path}` |

## Notes

<!-- Special instructions or constraints. Leave empty rather than padding. -->

- {note}
