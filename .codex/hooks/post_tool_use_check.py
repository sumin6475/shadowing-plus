#!/usr/bin/env python3
"""Post-tool-use format + lint hook.

After every Edit/Write: (1) auto-format the touched file — a safe mechanical
fix, per the Build System automation policy — then (2) lint/typecheck it and
surface issues as advisory feedback. ALWAYS exits 0: this hook informs, the
Stop hook enforces.

Commands come from hooks_config.json ("post_edit"); "auto" detects per file
type (ruff for .py, prettier/tsc for the JS family); any other value (e.g.
"off") disables this hook. Unknown file types are skipped silently.

Feedback is delivered via the PostToolUse hookSpecificOutput.additionalContext
JSON schema — plain stdout would only reach the user transcript, not the model.

Wired to: PostToolUse / Edit|Write
Source: coleam00/harness-engineering-demo .claude/hooks/post_tool_use_lint.py —
adapted 2026-07-10 (generalized from hardcoded app/backend|frontend paths to
config + per-suffix detection; auto-format step added per automation policy;
additionalContext delivery so the model actually sees the feedback).
"""
import json
import sys
from pathlib import Path

from _common import (
    detect_format_command, detect_lint_command, load_config, project_dir,
    read_hook_event, run, substitute,
)


def main() -> None:
    data = read_hook_event()
    tool_input: dict = data.get("tool_input") or {}
    file_path_raw = tool_input.get("file_path")
    if not file_path_raw:
        sys.exit(0)

    file_path = Path(file_path_raw).resolve()
    root = project_dir()
    try:
        rel = file_path.relative_to(root).as_posix()
    except ValueError:
        sys.exit(0)  # outside the project — not ours to check
    if not file_path.exists():
        sys.exit(0)

    config = load_config()
    post_edit = config.get("post_edit", "auto")

    if isinstance(post_edit, dict):
        fmt_map = post_edit.get("format", {}) or {}
        lint_map = post_edit.get("lint", {}) or {}
        fmt_cmd = fmt_map.get(file_path.suffix)
        lint_cmd = lint_map.get(file_path.suffix)
        fmt_cmd = substitute(fmt_cmd, file_path) if fmt_cmd else None
        lint_cmd = substitute(lint_cmd, file_path) if lint_cmd else None
    elif post_edit == "auto":
        fmt_cmd = detect_format_command(file_path, root)
        lint_cmd = detect_lint_command(file_path, root)
    else:  # "off" or anything else: disabled
        sys.exit(0)

    feedback: list[str] = []

    if fmt_cmd:
        passed, summary = run(fmt_cmd, root)
        if passed:
            feedback.append(
                f"[format-hook] {rel} was auto-formatted on disk — "
                "re-read it before making further edits (your in-memory copy may be stale)."
            )
        else:
            feedback.append(f"[format-hook] format failed for {rel}: {summary}")

    if lint_cmd:
        passed, summary = run(lint_cmd, root)
        if not passed:
            feedback.append(
                f"[lint-hook] issues after editing {rel} — fix the root causes "
                f"before committing:\n{summary}"
            )

    if feedback:
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": "\n\n".join(feedback)[:4000],
            }
        }))

    sys.exit(0)  # advisory — never blocks


if __name__ == "__main__":
    main()
