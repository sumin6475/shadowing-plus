#!/usr/bin/env python3
"""Shared helpers for the Build Journal hooks: hook payload, project root,
macOS notification, and transcript scanning.

Everything here fails open. A broken payload or a missing tool must never brick
a session. Language-agnostic: the code-file detection covers common source
extensions, so this pack drops into Python, TS/JS, Go, Rust, and mixed repos.

Source: Build Journal pack (Code HQ/03), extracted 2026-07-15 from the Second
Brain install. `notify` + `read_hook_event` + `project_dir` originate in
Code HQ/01_Build System ai-layer/.claude/hooks/_common.py. The transcript scan
is git-independent by design, so the pack works in repos with no git yet.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HOOKS_DIR = Path(__file__).resolve().parent

_EDIT_TOOLS = {"Write", "Edit", "MultiEdit", "NotebookEdit"}

# Common source extensions. A Write/Edit to one of these (outside docs/journal/
# and .claude/) counts as "built code this session". Config/data/docs
# extensions are deliberately excluded to keep false positives low.
_CODE_EXTS = (
    ".py", ".sql", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".go", ".rs", ".java", ".rb", ".php", ".c", ".h", ".cpp", ".cc",
    ".cs", ".swift", ".kt", ".scala", ".vue", ".svelte", ".css", ".scss",
)
_EXCLUDE_SUBSTR = ("/docs/journal/", "/.claude/", "/node_modules/", "/.venv/", "/venv/")


def project_dir() -> Path:
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env).resolve()
    # hooks live at <project>/.claude/hooks/
    return HOOKS_DIR.parents[1]


def read_hook_event() -> dict:
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def notify(message: str, title: str = "Build Journal") -> None:
    """macOS notification via osascript; a silent no-op elsewhere."""
    osascript = shutil.which("osascript")
    if not osascript:
        return
    safe_msg = message.replace("\\", "\\\\").replace('"', '\\"')[:200]
    safe_title = title.replace("\\", "\\\\").replace('"', '\\"')
    try:
        subprocess.run(
            [osascript, "-e", f'display notification "{safe_msg}" with title "{safe_title}"'],
            capture_output=True, timeout=5,
        )
    except Exception:
        pass


def _find_tool_uses(node):
    """Yield every tool_use block anywhere inside a decoded transcript line."""
    if isinstance(node, dict):
        if node.get("type") == "tool_use":
            yield node
        for value in node.values():
            yield from _find_tool_uses(value)
    elif isinstance(node, list):
        for value in node:
            yield from _find_tool_uses(value)


def scan_transcript(transcript_path: str) -> dict:
    """Read a Claude Code transcript (JSONL) and count file edits this session,
    split into code edits vs journal edits. Fails open to zeros.

    code    = a Write/Edit to a source file (see _CODE_EXTS) outside .claude/
    journal = a Write/Edit to anything under docs/journal/
    """
    code_edits = 0
    journal_edits = 0
    edited_code: list[str] = []
    try:
        with open(transcript_path, encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                for tu in _find_tool_uses(obj):
                    if tu.get("name") not in _EDIT_TOOLS:
                        continue
                    inp = tu.get("input") or {}
                    fp = str(inp.get("file_path") or inp.get("notebook_path") or "").replace("\\", "/")
                    if not fp:
                        continue
                    if "/docs/journal/" in fp:
                        journal_edits += 1
                    elif fp.endswith(_CODE_EXTS) and not any(s in fp for s in _EXCLUDE_SUBSTR):
                        code_edits += 1
                        edited_code.append(fp.rsplit("/", 1)[-1])
    except OSError:
        pass
    return {
        "code_edits": code_edits,
        "journal_edits": journal_edits,
        "edited_code": edited_code,
    }
