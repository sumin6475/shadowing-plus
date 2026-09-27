#!/usr/bin/env python3
"""Stop hook — journal backstop.

Per the Build Journal contract, automatic work may DRAFT and NOTIFY, never
DECIDE or BLOCK. The semantic engine is CLAUDE.md: it recognises step
transitions and decisions, and works in Cursor and other tools too. This hook
is the deterministic, Claude-Code-only safety net. At turn end, if the session
wrote code but nothing under docs/journal/, it reminds via a macOS
notification, a stderr line, and a docs/journal/.pending.md note that the next
session surfaces.

It never blocks the turn and never writes a journal entry itself. Judging which
entry a moment deserves (ADR / postmortem / score / log line) is semantic work
that belongs to the assistant following the contract, not to a mechanical hook.

Guards:
  * stop_hook_active — do not nag inside a continue loop.
  * dedup — re-nudge only when more code was written than at the last nudge
    (state: .claude/.journal-gate-state).
  * fail open — any error exits 0; a turn-end must never brick.

Test standalone:
  echo '{"transcript_path":"/tmp/t.jsonl","stop_hook_active":false}' \
    | python3 .claude/hooks/journal_gate.py

Wired to: Stop
Source: Build Journal pack (Code HQ/03), 2026-07-15. Pattern from
Code HQ/01_Build System propose_claude_md.py (draft+notify, dedup, fail-open).
Git-independent: reads the transcript, not git.
"""
from __future__ import annotations

import sys
from pathlib import Path

from _common import notify, project_dir, read_hook_event, scan_transcript

_STATE_FILE = ".claude/.journal-gate-state"
_PENDING_FILE = "docs/journal/.pending.md"


def _read_state(path: Path) -> int:
    try:
        return int(path.read_text(encoding="utf-8").strip() or "0")
    except (OSError, ValueError):
        return 0


def main() -> int:
    payload = read_hook_event()
    if payload.get("stop_hook_active"):
        return 0

    transcript = payload.get("transcript_path") or ""
    if not transcript:
        return 0

    root = project_dir()
    counts = scan_transcript(transcript)
    code = counts["code_edits"]
    journaled = counts["journal_edits"]

    pending = root / _PENDING_FILE
    state = root / _STATE_FILE

    # Journaling happened this session: clear any pending nudge and reset state.
    if journaled > 0:
        try:
            pending.unlink()
        except OSError:
            pass
        try:
            state.write_text("0", encoding="utf-8")
        except OSError:
            pass
        return 0

    if code <= 0:
        return 0

    # Dedup: nudge only when more code was written than at the last nudge.
    if code <= _read_state(state):
        return 0

    files = ", ".join(sorted(set(counts["edited_code"]))[:6]) or "code"
    notify("You built code but haven't journaled it yet.", title=f"{root.name} — journal")
    try:
        pending.parent.mkdir(parents=True, exist_ok=True)
        pending.write_text(
            "# Pending journal\n\n"
            f"- This session wrote code ({files}) with no `docs/journal/` entry.\n"
            "- Draft the matching entry per `CLAUDE.md` -> Auto-Journal, then this file clears.\n",
            encoding="utf-8",
        )
    except OSError:
        pass
    try:
        state.parent.mkdir(parents=True, exist_ok=True)
        state.write_text(str(code), encoding="utf-8")
    except OSError:
        pass

    print(
        f"[journal-gate] built this session ({files}) but nothing in docs/journal/. "
        f"If a step finished, a decision was made, a bug was fixed, or a check ran, "
        f"draft the entry (CLAUDE.md -> Auto-Journal).",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
