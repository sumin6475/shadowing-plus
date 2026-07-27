#!/usr/bin/env python3
"""Shared helpers for the Build System hooks: config loading, project
auto-detection, command running, and macOS notifications.

Config lives in hooks_config.json next to this file. "auto" entries fall back
to detection from project files (pyproject.toml / package.json). Everything
here fails open: a broken config or missing tool must never brick a session.

Source: newly authored for Build System 2026-07-10 (run() helper adapted from
coleam00/harness-engineering-demo .claude/hooks/stop_validate.py).
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HOOKS_DIR = Path(__file__).resolve().parent
CONFIG_PATH = HOOKS_DIR / "hooks_config.json"


def project_dir() -> Path:
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env).resolve()
    # hooks live at <project>/.claude/hooks/
    return HOOKS_DIR.parents[1]


def load_config() -> dict:
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def run(
    cmd: list[str], cwd: str | Path, ok_returncodes: tuple[int, ...] = (0,)
) -> tuple[bool, str]:
    """Run a command; return (passed, short summary). Missing binary or bad
    cwd = failure with a clear message rather than an exception."""
    exe = shutil.which(cmd[0])
    if exe is None:
        return False, f"command not found: {cmd[0]}"
    try:
        result = subprocess.run(
            [exe, *cmd[1:]], cwd=str(cwd), capture_output=True, text=True, timeout=300
        )
    except subprocess.TimeoutExpired:
        return False, f"timed out (300s): {' '.join(cmd)}"
    except OSError as e:
        return False, f"exec error for {' '.join(cmd)}: {e}"
    passed = result.returncode in ok_returncodes
    out = (result.stdout + result.stderr).strip()
    lines = [l for l in out.splitlines() if l.strip()]
    summary = "\n".join(lines[:20]) if lines else "(no output)"
    return passed, summary


def notify(message: str, title: str = "Claude Build System") -> None:
    """macOS notification via osascript; silently a no-op elsewhere."""
    osascript = shutil.which("osascript")
    if not osascript:
        return
    # osascript string literals: escape backslashes and double quotes
    safe_msg = message.replace("\\", "\\\\").replace('"', '\\"')[:200]
    safe_title = title.replace("\\", "\\\\").replace('"', '\\"')
    try:
        subprocess.run(
            [osascript, "-e", f'display notification "{safe_msg}" with title "{safe_title}"'],
            capture_output=True, timeout=5,
        )
    except Exception:
        pass


def notify_mode(config: dict) -> str:
    mode = config.get("notify", "fail")
    return mode if mode in ("fail", "all", "off") else "fail"


# ---------------- project auto-detection ----------------

def _uv_prefix(root: Path) -> list[str]:
    """['uv', 'run'] when the project is uv-managed and uv exists, else []."""
    if (root / "uv.lock").exists() and shutil.which("uv"):
        return ["uv", "run"]
    return []


def _npm_scripts(root: Path) -> dict:
    try:
        with open(root / "package.json", encoding="utf-8") as f:
            return json.load(f).get("scripts", {}) or {}
    except Exception:
        return {}


def _tool_available(tool: str, root: Path) -> bool:
    """True if `tool` is runnable: on PATH, via uv, or in node_modules/.bin."""
    if shutil.which(tool):
        return True
    if _uv_prefix(root):
        ok, _ = run(["uv", "run", tool, "--version"], root)
        return ok
    return (root / "node_modules" / ".bin" / tool).exists()


def detect_stop_gate(root: Path) -> list[dict]:
    """Baseline gate commands (lint + tests) detected from project files.
    Only includes commands whose tools are actually present — a missing
    optional tool must not fail the gate."""
    gate: list[dict] = []
    if (root / "pyproject.toml").exists():
        uv = _uv_prefix(root)
        if _tool_available("ruff", root):
            gate.append({"name": "ruff", "command": [*uv, "ruff", "check", "."], "cwd": "."})
        if _tool_available("pytest", root):
            # pytest exit 5 = no tests collected — fine on a greenfield project
            gate.append({
                "name": "pytest", "command": [*uv, "pytest", "-q", "--tb=short"],
                "cwd": ".", "ok_returncodes": [0, 5],
            })
    scripts = _npm_scripts(root)
    if scripts:
        if "lint" in scripts:
            gate.append({"name": "npm lint", "command": ["npm", "run", "lint", "--silent"], "cwd": "."})
        test_script = scripts.get("test", "")
        if test_script and "no test specified" not in test_script:
            gate.append({"name": "npm test", "command": ["npm", "test", "--silent"], "cwd": "."})
        if (root / "node_modules" / ".bin" / "tsc").exists() and shutil.which("npx"):
            gate.append({"name": "tsc", "command": ["npx", "--no-install", "tsc", "--noEmit"], "cwd": "."})
    return gate


def detect_format_command(file_path: Path, root: Path) -> list[str] | None:
    """Safe mechanical formatter for one file, or None."""
    suffix = file_path.suffix
    if suffix == ".py" and _tool_available("ruff", root):
        return [*_uv_prefix(root), "ruff", "format", str(file_path)]
    if suffix in (".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md"):
        if (root / "node_modules" / ".bin" / "prettier").exists():
            return ["npx", "--no-install", "prettier", "--write", str(file_path)]
    return None


def detect_lint_command(file_path: Path, root: Path) -> list[str] | None:
    """Advisory lint/typecheck for one file, or None."""
    suffix = file_path.suffix
    if suffix == ".py" and _tool_available("ruff", root):
        return [*_uv_prefix(root), "ruff", "check", str(file_path)]
    if suffix in (".ts", ".tsx") and (root / "tsconfig.json").exists() and shutil.which("npx"):
        return ["npx", "--no-install", "tsc", "--noEmit"]
    return None


def substitute(cmd: list[str], file_path: Path) -> list[str]:
    """Replace the '{file}' placeholder in explicit config commands."""
    return [str(file_path) if part == "{file}" else part for part in cmd]


def read_hook_event() -> dict:
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


# ---------------- git + CLAUDE.md area helpers (used by the reflector pair) ----------------

_EXCLUDE_DIRS = frozenset({
    ".git", ".venv", "venv", "env", "node_modules", "__pycache__",
    ".pytest_cache", ".mypy_cache", ".ruff_cache", "build", "dist",
})

REFLECT_LOCK_ENV = "BUILD_SYSTEM_REFLECT_LOCK"

# The reflector's own outputs must never count as "session changes" — they
# would re-trigger reflection after every /commit that (correctly) skips them.
_REFLECT_TRANSIENTS = {".claude/claude-md-review.md", ".claude/.claude-md-review-state"}


def _is_noise_path(path: str) -> bool:
    return path in _REFLECT_TRANSIENTS or "__pycache__" in path


def git_out(args: list[str], root: Path, timeout: int = 10) -> str:
    try:
        result = subprocess.run(
            ["git", *args], cwd=str(root), capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=timeout,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return result.stdout


def claude_md_areas(root: Path) -> set[str]:
    """Directories (relative posix) carrying their own CLAUDE.md, excluding
    the repo root — the areas a CLAUDE.md hierarchy governs."""
    areas: set[str] = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in _EXCLUDE_DIRS]
        if "CLAUDE.md" in filenames:
            rel = Path(dirpath).relative_to(root).as_posix()
            if rel != ".":
                areas.add(rel)
    return areas


def area_of(changed: str, areas: set[str]) -> str | None:
    """The nearest CLAUDE.md-governed directory containing a changed file."""
    parts = changed.split("/")
    for depth in range(len(parts) - 1, 0, -1):
        candidate = "/".join(parts[:depth])
        if candidate in areas:
            return candidate
    return None


def touched_areas(root: Path) -> dict[str, int]:
    """Map each CLAUDE.md-governed area with working-tree changes to a count of
    changed files. Single-CLAUDE.md repos (only a root file — the common case
    for this pack) map ALL changes to the '.' pseudo-area, so the reflector
    still fires there; helpline's original only handled per-area hierarchies."""
    changed: list[str] = []
    for line in git_out(["status", "--porcelain"], root).splitlines():
        if len(line) > 3:
            path = line[3:].strip().replace("\\", "/")
            if not _is_noise_path(path):
                changed.append(path)
    if not changed:
        return {}
    governed = claude_md_areas(root)
    counts: dict[str, int] = {}
    if governed:
        for path in changed:
            area = area_of(path, governed)
            if area is not None:
                counts[area] = counts.get(area, 0) + 1
    if not counts and (root / "CLAUDE.md").is_file():
        counts["."] = len(changed)
    return counts


def session_changes(root: Path, areas: set[str]) -> tuple[str, str]:
    """(content_text, fingerprint) for the session's changes in the given areas.

    `git diff HEAD` misses untracked files entirely — a greenfield session is
    mostly NEW files — so untracked file contents are folded into both the
    reflection text and the fingerprint. Fingerprint also hashes the porcelain
    listing so renames/deletions change it too."""
    scoped = sorted(areas)
    diff = git_out(["diff", "HEAD"] if scoped == ["."] else ["diff", "HEAD", "--", *scoped], root)
    blocks: list[str] = [diff] if diff.strip() else []

    untracked = [
        p for p in git_out(["ls-files", "--others", "--exclude-standard"], root).splitlines()
        if p.strip() and not _is_noise_path(p)
    ]
    if scoped != ["."]:
        untracked = [p for p in untracked if area_of(p, areas)]
    for p in untracked[:50]:
        f = root / p
        try:
            if f.stat().st_size > 100_000:
                content = "(file too large to include)"
            else:
                content = f.read_text(encoding="utf-8", errors="replace")[:4_000]
        except OSError:
            content = "(unreadable)"
        blocks.append(f"## New (untracked) file: {p}\n```\n{content}\n```")

    text = "\n\n".join(blocks)
    porcelain = git_out(["status", "--porcelain"], root)
    fingerprint = hashlib.sha256(
        (porcelain + "\n" + text).encode("utf-8", "replace")
    ).hexdigest()
    return text, fingerprint
