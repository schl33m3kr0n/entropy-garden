#!/usr/bin/env python3
"""Build content/poems/index.json from content/poems/*.md singularity entries.

One-time migration from legacy JS data:
  python3 scripts/dev/build-singularity-poems.py --export-from-js
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT_DIR = ROOT / "content" / "poems"
INDEX_PATH = CONTENT_DIR / "index.json"
LEGACY_DATA = ROOT / "js" / "data" / "singularity-poems.data.js"


def yaml_quote(value: str) -> str:
    if re.search(r'[:#\[\]{}&*!|>\'"\\@`%]', value) or value.strip() != value:
        return json.dumps(value, ensure_ascii=False)
    return value


def slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.strip().lower()).strip("-")
    return slug or "transmission"


def poem_title(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return "Transmission"


def write_markdown(poem: dict, path: Path) -> None:
    frontmatter = (
        "---\n"
        f"id: {yaml_quote(poem['id'])}\n"
        f"title: {yaml_quote(poem['title'])}\n"
        f"tone: {yaml_quote(poem['tone'])}\n"
        f"order: {poem['order']}\n"
        "---\n"
    )
    body = poem["text"].strip()
    path.write_text(f"{frontmatter}\n{body}\n", encoding="utf-8")


def parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        raise ValueError("missing opening frontmatter delimiter")

    match = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n?", text, re.DOTALL)
    if not match:
        raise ValueError("invalid frontmatter block")

    raw_fm = match.group(1)
    body = text[match.end() :].strip()
    data: dict = {}

    for line in raw_fm.splitlines():
        stripped = line.strip()
        if not stripped or ":" not in stripped:
            continue
        key, value = stripped.split(":", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = json.loads(value)
        elif key.strip() == "order":
            value = int(value)
        data[key.strip()] = value

    return data, body


def parse_markdown(path: Path) -> dict:
    meta, body = parse_frontmatter(path.read_text(encoding="utf-8"))
    title = meta.get("title") or poem_title(body)
    poem_id = meta.get("id") or path.stem
    tone = meta.get("tone") or "safe"
    text = body if body.startswith(title) else f"{title}\n\n{body}".strip()
    return {
        "id": poem_id,
        "tone": tone,
        "title": title,
        "order": int(meta.get("order") or 0),
        "text": text,
    }


def read_backtick_strings(text: str, start: int) -> tuple[list[str], int]:
    strings: list[str] = []
    i = start

    while i < len(text):
        while i < len(text) and text[i] in " \t\r\n,":
            i += 1
        if i >= len(text) or text[i] == "]":
            if text[i] == "]":
                i += 1
            break
        if text[i] != "`":
            raise ValueError(f"expected backtick string at {i}")

        i += 1
        parts: list[str] = []
        while i < len(text):
            ch = text[i]
            if ch == "\\":
                i += 1
                if i >= len(text):
                    raise ValueError("unterminated escape")
                parts.append(text[i])
                i += 1
                continue
            if ch == "`":
                strings.append("".join(parts))
                i += 1
                break
            parts.append(ch)
            i += 1
        else:
            raise ValueError("unterminated backtick string")

    return strings, i


def extract_poem_array(text: str, key: str) -> list[str]:
    marker = f"export const {key} = ["
    start = text.find(marker)
    if start == -1:
        raise ValueError(f"missing array: {key}")
    array_start = start + len(marker)
    poems, _ = read_backtick_strings(text, array_start)
    return poems


def load_legacy_poems(source: Path | None = None) -> list[dict]:
    text = (source or LEGACY_DATA).read_text(encoding="utf-8")
    poems: list[dict] = []
    seen: set[str] = set()

    for tone, key in (("safe", "singularityPoemsSafe"), ("gritty", "singularityPoemsGritty")):
        for order, poem_text in enumerate(extract_poem_array(text, key)):
            title = poem_title(poem_text)
            poem_id = slugify(title)
            if poem_id in seen:
                suffix = 2
                candidate = f"{poem_id}-{suffix}"
                while candidate in seen:
                    suffix += 1
                    candidate = f"{poem_id}-{suffix}"
                poem_id = candidate
            seen.add(poem_id)
            poems.append(
                {
                    "id": poem_id,
                    "tone": tone,
                    "title": title,
                    "order": order,
                    "text": poem_text.strip(),
                }
            )

    return poems


def build_index() -> int:
    if not CONTENT_DIR.is_dir():
        print(f"poems directory missing: {CONTENT_DIR}", file=sys.stderr)
        return 1

    poems = [parse_markdown(path) for path in sorted(CONTENT_DIR.glob("*.md"))]
    if not poems:
        print("no markdown poems found in content/poems/", file=sys.stderr)
        return 1

    poems.sort(key=lambda item: (0 if item["tone"] == "safe" else 1, item["order"], item["id"]))
    INDEX_PATH.write_text(
        json.dumps(poems, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    safe_count = sum(1 for poem in poems if poem["tone"] == "safe")
    gritty_count = sum(1 for poem in poems if poem["tone"] == "gritty")
    print(f"wrote {INDEX_PATH} ({len(poems)} poems: {safe_count} safe, {gritty_count} gritty)")
    return 0


def export_from_js(source: Path | None = None) -> int:
    legacy = source or LEGACY_DATA
    if not legacy.is_file():
        print(f"legacy data file missing: {legacy}", file=sys.stderr)
        return 1

    poems = load_legacy_poems(legacy)
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)

    for poem in poems:
        path = CONTENT_DIR / f"{poem['id']}.md"
        write_markdown(poem, path)

    print(f"exported {len(poems)} poems to {CONTENT_DIR}/")
    return build_index()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--export-from-js",
        action="store_true",
        help="one-time export from js/data/singularity-poems.data.js",
    )
    parser.add_argument(
        "--legacy-file",
        type=Path,
        help="optional legacy JS source for --export-from-js",
    )
    args = parser.parse_args()

    if args.export_from_js:
        return export_from_js(args.legacy_file)

    return build_index()


if __name__ == "__main__":
    raise SystemExit(main())
