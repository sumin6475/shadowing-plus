#!/usr/bin/env python3
"""Stop hook — the *trigger* half of the auto-reflector.

Per the Build System automation policy: automatic work may DRAFT and NOTIFY,
never DECIDE. This hook does the cheap, deterministic part — notice which
CLAUDE.md-governed areas changed this session and decide whether a reflection
is worth spawning. The reflector (reflect_claude_md.py) then runs a headless
`claude -p` in the background and writes a DRAFT proposal to
`.claude/claude-md-review.md`. Nothing is ever applied automatically —
/system-review adjudicates the draft at the next human gate.

Guards (from the helpline original):
  * Recursion — the reflector's headless `claude` fires its own Stop hook,
    which lands back here; BUILD_SYSTEM_REFLECT_LOCK makes that a no-op.
  * Dedup — a sha256 fingerprint of the touched-area diff skips re-reflecting
    on a diff already handled (state: .claude/.claude-md-review-state).
  * Fail open — any error exits 0; this hook may never brick a turn-end.

Wired to: Stop (alongside stop_validate.py)
Source: coleam00/helpline .claude/hooks/propose_claude_md.py — adapted
2026-07-10 (lock env renamed; single-root-CLAUDE.md repos now count as one
'.' area via _common.touched_areas — the original only handled per-area
hierarchies; Windows detach path dropped, macOS/POSIX only).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from _common import REFLECT_LOCK_ENV, project_dir, session_changes, touched_areas

_STATE_FILE = ".claude/.claude-md-review-state"
_REFLECTOR = "reflect_claude_md.py"


def _spawn_reflector(reflector: Path, root: Path) -> bool:
    """Fire-and-forget the reflector, detached from this hook process."""
    try:
        subprocess.Popen(
            [sys.executable, str(reflector)],
            cwd=str(root),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        print(f"[reflector-trigger] could not start reflector: {exc}", file=sys.stderr)
        return False
    return True


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    # Guard 1 — recursion.
    if os.environ.get(REFLECT_LOCK_ENV):
        return 0

    # Guard 2 — during a red→fix Stop-gate loop (stop_hook_active), don't
    # draft from code the gate just declared broken, one reflection per cycle.
    if payload.get("stop_hook_active"):
        return 0

    root = project_dir()
    areas = set(touched_areas(root).keys())
    if not areas:
        return 0

    # Guard 3 — dedup: only reflect when the session content is new.
    # (Content includes untracked files; see _common.session_changes.)
    text, fingerprint = session_changes(root, areas)
    if not text.strip():
        return 0
    state = root / _STATE_FILE
    try:
        if state.read_text(encoding="utf-8").strip() == fingerprint:
            return 0
    except OSError:
        pass  # no prior state — first reflection for this content

    reflector = Path(__file__).with_name(_REFLECTOR)
    if not reflector.is_file():
        print(f"[reflector-trigger] {_REFLECTOR} missing — skipped", file=sys.stderr)
        return 0

    if not _spawn_reflector(reflector, root):
        return 0

    # State is written on spawn, not on draft success: if the reflector crashes,
    # this content is marked handled and won't retry until the content changes.
    # Deliberate fail-open tradeoff — never loop on a crashing reflector.
    try:
        state.parent.mkdir(parents=True, exist_ok=True)
        state.write_text(fingerprint, encoding="utf-8")
    except OSError:
        pass

    print(
        f"[reflector-trigger] {len(areas)} area(s) changed "
        f"({', '.join(sorted(areas))}) — drafting CLAUDE.md proposals in the "
        f"background → .claude/claude-md-review.md (adjudicated by /system-review)",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
