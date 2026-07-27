#!/usr/bin/env python3
"""SessionStart hook — dynamic orientation.

Prints a short orientation block at the start of every Claude Code session.
Claude Code injects this stdout into the session context, so Claude starts
already knowing which part of the codebase has active work — and the recent
direction of travel from git history — without spending a turn re-exploring.
/prime builds on this instead of re-deriving it.

Test standalone: `python3 .claude/hooks/session_start_context.py < /dev/null`

Wired to: SessionStart
Source: coleam00/helpline .claude/hooks/session_start_context.py — adapted
2026-07-10 (project name derived from the root dir instead of hardcoded;
CODEBASE_MAP.md pointer made conditional on the file existing).
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

_EXCLUDE_DIRS = frozenset({
    ".git", ".venv", "venv", "env", "node_modules", "__pycache__",
    ".pytest_cache", ".mypy_cache", ".ruff_cache", "build", "dist",
})


def _project_root() -> Path:
    project = os.environ.get("CLAUDE_PROJECT_DIR")
    return Path(project) if project else Path(__file__).resolve().parents[2]


def _claude_md_areas(root: Path) -> set[str]:
    """Every directory (relative posix) that carries its own CLAUDE.md, except
    the repo root — the areas the CLAUDE.md hierarchy governs."""
    areas: set[str] = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in _EXCLUDE_DIRS]
        if "CLAUDE.md" in filenames:
            rel = Path(dirpath).relative_to(root).as_posix()
            if rel != ".":
                areas.add(rel)
    return areas


def _area_of(changed: str, areas: set[str]) -> str | None:
    """The nearest CLAUDE.md-governed directory containing a changed file."""
    parts = changed.split("/")
    for depth in range(len(parts) - 1, 0, -1):
        candidate = "/".join(parts[:depth])
        if candidate in areas:
            return candidate
    return None


def _working_tree_changes(root: Path) -> list[str] | None:
    """Changed/untracked paths; None when this isn't a git repository."""
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=5, cwd=str(root),
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    paths: list[str] = []
    for line in result.stdout.splitlines():
        if len(line) > 3:
            paths.append(line[3:].strip().replace("\\", "/"))
    return paths


def _recent_commits(root: Path, limit: int = 5) -> list[str]:
    try:
        result = subprocess.run(
            ["git", "log", f"-{limit}", "--pretty=format:%h %s"],
            capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=5, cwd=str(root),
        )
    except (OSError, subprocess.SubprocessError):
        return []
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def main() -> None:
    # Drain the hook payload on stdin; this hook doesn't need it.
    try:
        sys.stdin.read()
    except (OSError, ValueError):
        pass

    root = _project_root()
    lines = [f"## {root.name} — session orientation", ""]

    changes = _working_tree_changes(root)
    if changes is None:
        lines.append("No git repository yet — `git init` pending; no history to orient from.")
        print("\n".join(lines))
        return

    governed = _claude_md_areas(root)
    areas = sorted({a for a in (_area_of(p, governed) for p in changes) if a})

    if areas:
        lines.append(f"Active area(s) this session: **{', '.join(areas)}**.")
        lines.append("Load the matching `CLAUDE.md` in each before editing.")
    elif changes:
        lines.append(f"Working tree has {len(changes)} changed/untracked file(s).")
    else:
        lines.append("Working tree is clean — no pending work in progress.")

    commits = _recent_commits(root)
    if commits:
        lines.append("")
        lines.append("Recent commits (newest first):")
        lines.extend(f"- {commit}" for commit in commits)

    if (root / "CODEBASE_MAP.md").exists():
        lines.append("")
        lines.append("Use `CODEBASE_MAP.md` to find where a feature lives before exploring.")

    print("\n".join(lines))


if __name__ == "__main__":
    main()
