#!/usr/bin/env python3
"""Reflector — the *reasoning* half of the auto-reflector.

Spawned in the background by propose_claude_md.py after a turn that changed
CLAUDE.md-governed code. Gathers the session's working-tree diff plus the
current CLAUDE.md of every touched area, asks a headless `claude -p` whether
those conventions still hold, and writes a DRAFT proposal to
`.claude/claude-md-review.md`. Sends a macOS notification when the draft is
ready (per the Build System automation policy: draft + notify, never decide —
/system-review adjudicates the draft).

Safety properties (from the helpline original):
  * Recursion guard — the headless `claude` child runs with
    BUILD_SYSTEM_REFLECT_LOCK=1; this file, the trigger, and stop_validate
    all no-op under it.
  * Graceful fallback — if the `claude` CLI is missing or fails, writes a
    deterministic "re-check these files" note instead, so drift is flagged
    either way.

Run directly for a synchronous reflection:
    python3 .claude/hooks/reflect_claude_md.py

Source: coleam00/helpline .claude/hooks/reflect_claude_md.py — adapted
2026-07-10 (lock env renamed; '.' root-area support; macOS notification added;
shared helpers moved to _common.py).
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from _common import (
    REFLECT_LOCK_ENV, load_config, notify, notify_mode, project_dir,
    session_changes, touched_areas,
)

_REVIEW_FILE = ".claude/claude-md-review.md"
_MAX_DIFF_CHARS = 12_000
_CLAUDE_TIMEOUT = 180


def _claude_md_path(root: Path, area: str) -> Path:
    return root / "CLAUDE.md" if area == "." else root / area / "CLAUDE.md"


def _area_label(area: str) -> str:
    return "CLAUDE.md (root)" if area == "." else f"{area}/CLAUDE.md"


def _build_prompt(root: Path, areas: dict[str, int], diff: str) -> str:
    """Assemble a self-contained reflection prompt — no tools needed."""
    blocks: list[str] = []
    for area in sorted(areas):
        claude_md = _claude_md_path(root, area)
        content = (
            claude_md.read_text(encoding="utf-8")
            if claude_md.is_file()
            else "(this area has no CLAUDE.md yet)"
        )
        blocks.append(f"### {_area_label(area)}\n\n{content}")
    current = "\n\n".join(blocks)

    return f"""You are auditing whether a codebase's CLAUDE.md files still match \
reality after a coding session. CLAUDE.md is the instruction file an AI coding \
agent loads for that part of the repo.

Below is the git diff of the session's uncommitted changes, then the current \
CLAUDE.md for every area that changed.

For EACH area, output exactly one of:
- `No change needed` — the CLAUDE.md still holds; or
- a concrete proposed edit: the specific line(s) to add, change, or remove, \
plus one sentence on why.

Only propose an update when the diff introduces a genuine new convention, \
gotcha, command, or constraint that the CLAUDE.md does not yet capture. Do not \
propose stylistic rewrites. Be terse. Respond in plain text; do not use tools.

## Git diff (uncommitted work this session)

```diff
{diff}
```

## Current CLAUDE.md file(s)

{current}
"""


def _run_claude(prompt: str, root: Path) -> str | None:
    """Call headless `claude -p`. Returns the reflection text, or None on failure."""
    claude = shutil.which("claude")
    if not claude:
        return None

    env = dict(os.environ)
    env[REFLECT_LOCK_ENV] = "1"  # recursion guard for the nested claude's own hooks

    try:
        result = subprocess.run(
            [claude, "-p", "--output-format", "text"],
            cwd=str(root), input=prompt, capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=_CLAUDE_TIMEOUT, env=env,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    return result.stdout.strip() or None


def _deterministic_note(root: Path, areas: dict[str, int], stamp: str) -> str:
    """Fallback body when `claude` is unavailable — flag files, no LLM."""
    lines = [
        f"# CLAUDE.md review — {stamp}",
        "",
        "_`claude` CLI unavailable or the reflection call failed — deterministic "
        "fallback. The areas below changed this session; re-check their CLAUDE.md "
        "by hand._",
        "",
    ]
    for area, count in sorted(areas.items()):
        label = _area_label(area)
        if _claude_md_path(root, area).is_file():
            lines.append(
                f"- **{label}** ({count} file(s) changed) — re-read it: "
                f"do its conventions still hold?"
            )
        else:
            lines.append(
                f"- **{label}** ({count} file(s) changed) — no CLAUDE.md exists "
                f"there; consider adding one."
            )
    return "\n".join(lines) + "\n"


def reflect() -> int:
    # Recursion guard: never reflect from inside a reflection-spawned claude.
    if os.environ.get(REFLECT_LOCK_ENV):
        return 0

    root = project_dir()
    areas = touched_areas(root)
    if not areas:
        return 0

    # Session content scoped to the touched areas — includes untracked (new)
    # files, which `git diff HEAD` alone would miss entirely.
    diff, _fp = session_changes(root, set(areas))
    if not diff.strip():
        return 0  # nothing reflectable — never write a junk draft
    if len(diff) > _MAX_DIFF_CHARS:
        diff = diff[:_MAX_DIFF_CHARS] + "\n... (content truncated for the reflection)"

    stamp = datetime.now().isoformat(timespec="seconds")
    reflection = _run_claude(_build_prompt(root, areas, diff), root)

    if reflection:
        body = (
            f"# CLAUDE.md review — {stamp}\n\n"
            f"_DRAFT by the auto-reflector (`claude -p`) over {len(areas)} touched "
            f"area(s): {', '.join(_area_label(a) for a in sorted(areas))}. "
            f"Nothing is applied automatically — /system-review adjudicates this._\n\n"
            f"{reflection}\n"
        )
        mode_label = "LLM reflection"
    else:
        body = _deterministic_note(root, areas, stamp)
        mode_label = "deterministic fallback"

    review = root / _REVIEW_FILE
    try:
        review.parent.mkdir(parents=True, exist_ok=True)
        review.write_text(body, encoding="utf-8")
    except OSError as exc:
        print(f"[reflector] could not write {_REVIEW_FILE}: {exc}", file=sys.stderr)
        return 1

    if notify_mode(load_config()) != "off":
        notify(f"Reflector drafted CLAUDE.md proposals ({mode_label}) → .claude/claude-md-review.md")

    print(f"[reflector] wrote {_REVIEW_FILE} ({mode_label})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(reflect())
