#!/usr/bin/env python3
"""Audit one DeepSeek Harness skill folder.

The plugin's host half runs this before a folder is imported, and the page can
run it again on demand. It emits one JSON object on stdout so the Node side can
report the same errors and warnings the standalone CLI shows.

Usage:
    python skill_audit.py <absolute-skill-folder>
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

SKILL_FILE = "SKILL.md"
NAME_PATTERN = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
MAX_NAME = 64
MAX_DESCRIPTION = 4096
MAX_FILE_BYTES = 1024 * 1024
MAX_TREE_ENTRIES = 2000
SKIP_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".pnpm-store",
}
SCAFFOLD_DIRS = ("references", "scripts", "templates")


def _unquote(value: str) -> str:
    text = value.strip()
    if len(text) >= 2 and text[0] == text[-1] == "'":
        return text[1:-1].replace("''", "'")
    if len(text) >= 2 and text[0] == text[-1] == '"':
        return (
            text[1:-1]
            .replace("\\n", "\n")
            .replace("\\t", "\t")
            .replace('\\"', '"')
        )
    return text


def _fold_block(lines: list[str], style: str) -> str:
    if style.startswith("|"):
        return "\n".join(lines)
    parts: list[str] = []
    buffer: list[str] = []

    def flush() -> None:
        if buffer:
            parts.append(" ".join(buffer))
            buffer.clear()

    for line in lines:
        if not line.strip():
            flush()
            parts.append("\n")
        else:
            buffer.append(line.strip())
    flush()
    return "".join(parts).replace("\n\n\n", "\n\n").rstrip("\n")


def parse_frontmatter(text: str) -> tuple[dict[str, str], bool]:
    source = text.lstrip("\ufeff")
    lines = source.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, False
    closing = -1
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            closing = index
            break
    if closing < 0:
        return {}, True
    body = lines[1:closing]
    data: dict[str, str] = {}
    index = 0
    while index < len(body):
        line = body[index]
        if not line.strip() or line.lstrip().startswith("#"):
            index += 1
            continue
        match = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):(?:[ \t]*(.*))?$", line)
        if not match:
            index += 1
            continue
        key = match.group(1)
        value = (match.group(2) or "").strip()
        if re.match(r"^[>|][+-]?$", value):
            style = value
            block: list[str] = []
            cursor = index + 1
            while cursor < len(body):
                nxt = body[cursor]
                if not nxt.strip():
                    block.append("")
                    cursor += 1
                    continue
                if not nxt[:1].isspace():
                    break
                block.append(nxt.lstrip())
                cursor += 1
            if not style.endswith("+"):
                while block and block[-1] == "":
                    block.pop()
            data[key] = _fold_block(block, style)
            index = cursor
            continue
        if value == "":
            cursor = index + 1
            while cursor < len(body) and (body[cursor][:1].isspace() or not body[cursor].strip()):
                cursor += 1
            data[key] = ""
            index = cursor
            continue
        data[key] = _unquote(value)
        index += 1
    return data, True


def audit(folder: Path) -> dict:
    errors: list[str] = []
    warnings: list[str] = []
    result: dict = {
        "ok": False,
        "engine": "python",
        "name": "",
        "description": "",
        "whenToUse": "",
        "folder": folder.name,
        "errors": errors,
        "warnings": warnings,
        "files": {"count": 0, "bytes": 0, "text": 0},
        "scaffolding": [],
        "root": str(folder),
    }

    if not folder.exists():
        errors.append(f"The folder does not exist: {folder}")
        return result
    if not folder.is_dir():
        errors.append(f"Not a folder: {folder}")
        return result

    skill_file = folder / SKILL_FILE
    if not skill_file.is_file():
        errors.append(f"The folder has no {SKILL_FILE}.")
        return result

    try:
        raw = skill_file.read_bytes()
    except OSError as error:
        errors.append(f"Cannot read {SKILL_FILE}: {error}")
        return result
    if len(raw) > MAX_FILE_BYTES:
        errors.append(f"{SKILL_FILE} is larger than {MAX_FILE_BYTES // 1024} KB.")
        return result
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        errors.append(f"{SKILL_FILE} is not valid UTF-8 text.")
        return result

    data, has_frontmatter = parse_frontmatter(text)
    if not has_frontmatter:
        errors.append("SKILL.md must start with a YAML frontmatter block (--- ... ---).")
        return result

    name = (data.get("name") or "").strip()
    description = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", data.get("description") or "").strip()
    when_to_use = re.sub(
        r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]",
        " ",
        data.get("whenToUse") or data.get("when-to-use") or "",
    ).strip()
    result["name"] = name
    result["description"] = description
    result["whenToUse"] = when_to_use

    if not NAME_PATTERN.fullmatch(name) or len(name) > MAX_NAME:
        errors.append(
            "frontmatter.name must be kebab-case (a-z, 0-9, hyphen) and at most 64 characters."
        )
    if not description:
        errors.append("frontmatter.description is required.")
    elif len(description) > MAX_DESCRIPTION:
        errors.append(f"frontmatter.description is longer than {MAX_DESCRIPTION} characters.")

    if name and folder.name.lower() != name.lower():
        warnings.append(
            f"The folder is named \"{folder.name}\" but the skill is \"{name}\". Renaming the folder to match makes imports easier to recognize."
        )

    count = 0
    total_bytes = 0
    text_files = 0
    symlinks = 0
    for current, dirnames, filenames in os.walk(folder, followlinks=False):
        dirnames[:] = sorted(name for name in dirnames if name.lower() not in SKIP_DIRS)
        for filename in filenames:
            path = Path(current) / filename
            count += 1
            if path.is_symlink():
                symlinks += 1
                continue
            try:
                total_bytes += path.stat().st_size
            except OSError:
                pass
            if path.suffix.lower() in {
                ".md",
                ".txt",
                ".js",
                ".mjs",
                ".cjs",
                ".jsx",
                ".ts",
                ".tsx",
                ".json",
                ".yml",
                ".yaml",
                ".py",
                ".sh",
                ".ps1",
                ".css",
                ".html",
            }:
                text_files += 1
        if count > MAX_TREE_ENTRIES:
            warnings.append(f"The folder has more than {MAX_TREE_ENTRIES} files; the page lists only the first {MAX_TREE_ENTRIES}.")
            break

    result["files"] = {"count": count, "bytes": total_bytes, "text": text_files}
    result["scaffolding"] = [name for name in SCAFFOLD_DIRS if (folder / name).is_dir()]
    if not result["scaffolding"]:
        warnings.append(
            "No references/, scripts/ or templates/ folder. That is allowed, but a scaffold folder makes the skill reusable."
        )
    if symlinks:
        warnings.append(f"{symlinks} symlink(s) inside the folder are not followed by the editor.")
    if total_bytes > 20 * 1024 * 1024:
        warnings.append("The folder is larger than 20 MB; keep large assets out of a skill.")

    result["ok"] = not errors
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit a DeepSeek Harness skill folder.")
    parser.add_argument("folder", help="Absolute path to the skill folder")
    args = parser.parse_args()

    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    target = Path(args.folder).expanduser()
    try:
        report = audit(target)
    except Exception as error:  # noqa: BLE001 - the CLI must always emit JSON
        report = {
            "ok": False,
            "engine": "python",
            "name": "",
            "description": "",
            "errors": [f"Audit failed: {error}"],
            "warnings": [],
            "files": {"count": 0, "bytes": 0, "text": 0},
            "scaffolding": [],
            "root": str(target),
        }
    report["python"] = ".".join(str(part) for part in sys.version_info[:3])
    print(json.dumps(report, ensure_ascii=False))
    return 0 if report.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
