#!/usr/bin/env python3
"""SessionStart hook — journal orientation.

Prints a short block at session start so the assistant begins already holding
the Auto-Journal contract and any pending nudge, without spending a turn.
Claude Code injects this stdout into the session context.

Test standalone: python3 .claude/hooks/session_start_journal.py < /dev/null

Wired to: SessionStart
Source: Build Journal pack (Code HQ/03), 2026-07-15. Pattern from
Code HQ/01_Build System session_start_context.py.
"""
from __future__ import annotations

import sys
from pathlib import Path

from _common import project_dir

_PENDING_FILE = "docs/journal/.pending.md"


def main() -> None:
    # Drain the payload on stdin; this hook does not need it.
    try:
        sys.stdin.read()
    except (OSError, ValueError):
        pass

    root = project_dir()
    lines = [
        f"## {root.name} — journal contract active",
        "",
        "As we build, auto-journal to `docs/journal/` per `CLAUDE.md` -> Auto-Journal "
        "(draft + notify, never decide). Read `MEMORY.md` (or the project's status doc) "
        "for the current phase first.",
    ]

    pending = root / _PENDING_FILE
    if pending.exists():
        lines += [
            "",
            "**Pending journal from a prior session** (`docs/journal/.pending.md`): "
            "code was written without a journal entry. Close it out when the current step allows.",
        ]

    print("\n".join(lines))


if __name__ == "__main__":
    main()
