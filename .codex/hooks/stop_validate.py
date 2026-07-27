#!/usr/bin/env python3
"""Stop hook — the deterministic validation gate.

Runs the baseline gate (lint + tests) when Claude tries to end its turn.
On failure, emits a JSON block decision so Claude cannot stop until the gate
is green — validation is not a step the model remembers to run, it is
enforced. On pass, exits silently (or notifies, per config).

Commands come from hooks_config.json ("stop_gate"); "auto" detects them from
project files. No gate commands detected/configured → pass through silently
(a docs-only or brand-new project must not be blocked from stopping).

stop_hook_active guard prevents the infinite block loop. Fails open on any
parse/internal error.

Wired to: Stop
Source: coleam00/harness-engineering-demo .claude/hooks/stop_validate.py —
adapted 2026-07-10 (generalized from hardcoded ruff/pytest to config +
auto-detection; macOS notification added per Build System automation policy).
"""
import json
import os
import sys

from _common import (
    REFLECT_LOCK_ENV, detect_stop_gate, load_config, notify, notify_mode,
    project_dir, read_hook_event, run,
)


def main() -> None:
    # Never gate the auto-reflector's own headless claude child.
    if os.environ.get(REFLECT_LOCK_ENV):
        sys.exit(0)

    data = read_hook_event()
    if not data:
        sys.exit(0)  # unparseable event: fail open

    # Prevent infinite loop: already blocked once this turn-end cycle.
    if data.get("stop_hook_active"):
        sys.exit(0)

    root = project_dir()
    config = load_config()

    gate = config.get("stop_gate", "auto")
    if gate == "auto":
        gate = detect_stop_gate(root)
    if not isinstance(gate, list) or not gate:
        sys.exit(0)  # nothing to enforce

    failures: list[str] = []
    for step in gate:
        cmd = step.get("command") or []
        if not cmd:
            continue
        cwd = root / step.get("cwd", ".")
        ok_rcs = tuple(step.get("ok_returncodes", [0]))
        passed, summary = run(cmd, cwd, ok_returncodes=ok_rcs)
        if not passed:
            failures.append(f"{step.get('name', cmd[0])} failed:\n{summary}")

    mode = notify_mode(config)

    if failures:
        reason = "Validation gate failed: " + " | ".join(
            f.replace("\n", " ") for f in failures
        )
        reason += ". Fix the root causes and try again — do not weaken or skip the checks."
        if mode in ("fail", "all"):
            notify(f"Stop gate BLOCKED: {failures[0].splitlines()[0]}")
        print(json.dumps({"decision": "block", "reason": reason}))
        sys.exit(0)

    if mode == "all":
        notify("Turn complete — validation gate green.")
    sys.exit(0)


if __name__ == "__main__":
    main()
