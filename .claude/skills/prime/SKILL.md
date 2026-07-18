---
name: prime
description: Load codebase understanding at session start, before planning or implementation. Read-only analysis ending in a scannable summary report.
---

<!-- Source: coleam00/habit-tracker .claude/commands/core_piv_loop/prime.md; read-only guard block from coleam00/remote-agentic-coding-system .agents/commands/prime.md — adapted 2026-07-10 -->

# Prime: Load Project Context

## Objective

Build comprehensive understanding of the codebase by analyzing structure, documentation, and key files.

**🚨 CRITICAL RULE — READ THIS FIRST 🚨**

**YOU ARE FORBIDDEN FROM IMPLEMENTING ANYTHING.**

This is a READ-ONLY analysis command. You must:
- ❌ NOT edit ANY files (no Write, Edit, or file modification tools)
- ❌ NOT make any code changes whatsoever
- ❌ NOT solve any problem — just understand the project
- ✅ ONLY read files and analyze the project structure
- ✅ ONLY provide a summary report

Implementation happens later, through `/execute` with an approved plan. If you implement anything here, you have failed this command.

## Process

### 1. Analyze project structure

Run: `git ls-files` to list all tracked files.

Show directory structure (skip if the file list already makes it obvious):
`tree -L 3 -I 'node_modules|__pycache__|.git|dist|build|.venv'` (install via `brew install tree` if missing, or derive the tree from `git ls-files`)

### 2. Read core documentation

- `CLAUDE.md` (and per-area CLAUDE.md files if this is a monorepo)
- `CODEBASE_MAP.md` if present — the feature-location map
- The PRD in `.agents/PRDs/` if present
- README files at project root and major directories
- Any architecture documentation, plus the On-Demand Context docs relevant to the upcoming work (CLAUDE.md's table says which)

### 3. Identify key files

Based on the structure, identify and read:
- Main entry points (main.py, index.ts, app.py, ...)
- Core configuration files (pyproject.toml, package.json, tsconfig.json, ...)
- Key model/schema definitions
- Important service or controller files

### 4. Understand current state

If the SessionStart hook already injected orientation (git status, recent commits) at session start, don't re-derive it — reference it. Otherwise run:

- `git log -10 --oneline` — recent activity
- `git status` — current branch and working-tree state

## Output Report

Provide a concise summary covering:

### Project overview
- Purpose and type of application
- Primary technologies and frameworks
- Current version/state

### Architecture
- Overall structure and organization
- Key architectural patterns identified
- Important directories and their purposes

### Tech stack
- Languages and versions
- Frameworks and major libraries
- Build tools and package managers
- Testing frameworks

### Core principles
- Code style and conventions observed
- Documentation standards
- Testing approach

### Current state
- Active branch
- Recent changes or development focus
- Any uncommitted changes or immediate observations

**Make this summary easy to scan — bullet points and clear headers.**
