#!/usr/bin/env python3
"""Build content/index.json from content/*.md alternate-history entries.

One-time migration from legacy JS data:
  python3 scripts/dev/build-alternate-history.py --export-from-js
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT_DIR = ROOT / "content"
INDEX_PATH = CONTENT_DIR / "index.json"
LEGACY_FILES = (
    ROOT / "js" / "data" / "alternate-history.data.js",
)


def yaml_quote(value: str) -> str:
    if re.search(r'[:#\[\]{}&*!|>\'"\\@`%]', value) or value.strip() != value:
        return json.dumps(value, ensure_ascii=False)
    return value


def write_markdown(article: dict, path: Path) -> None:
    tags = article.get("tags") or []
    tag_lines = "\n".join(f"  - {yaml_quote(tag)}" for tag in tags)
    frontmatter = (
        "---\n"
        f"id: {yaml_quote(article['id'])}\n"
        f"title: {yaml_quote(article['title'])}\n"
        f"year: {yaml_quote(article['year'])}\n"
        "tags:\n"
        f"{tag_lines}\n"
        "---\n"
    )
    body = (article.get("excerpt") or "").strip()
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
    current_list_key: str | None = None

    for line in raw_fm.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        if line.startswith("  - ") and current_list_key:
            data.setdefault(current_list_key, []).append(unyaml_scalar(line[4:].strip()))
            continue

        if ":" not in stripped:
            raise ValueError(f"invalid frontmatter line: {line!r}")

        key, value = stripped.split(":", 1)
        key = key.strip()
        value = value.strip()
        current_list_key = None

        if value == "":
            current_list_key = key
            data[key] = []
            continue

        if value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            if not inner:
                data[key] = []
            else:
                data[key] = [unyaml_scalar(part.strip()) for part in inner.split(",")]
            continue

        data[key] = unyaml_scalar(value)

    return data, body


def unyaml_scalar(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return json.loads(value)
    return value


def parse_markdown(path: Path) -> dict:
    meta, excerpt = parse_frontmatter(path.read_text(encoding="utf-8"))
    article_id = meta.get("id") or path.stem
    return {
        "id": article_id,
        "title": meta.get("title", ""),
        "year": meta.get("year", ""),
        "tags": list(meta.get("tags") or []),
        "excerpt": excerpt,
    }


def build_index() -> int:
    if not CONTENT_DIR.is_dir():
        print(f"content directory missing: {CONTENT_DIR}", file=sys.stderr)
        return 1

    articles = [parse_markdown(path) for path in sorted(CONTENT_DIR.glob("*.md"))]
    if not articles:
        print("no markdown entries found in content/", file=sys.stderr)
        return 1

    articles.sort(key=lambda item: item["id"])
    INDEX_PATH.write_text(
        json.dumps(articles, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {INDEX_PATH} ({len(articles)} entries)")
    return 0


def read_js_string(text: str, start: int) -> tuple[str, int]:
    quote = text[start]
    if quote not in "'\"":
        raise ValueError(f"expected quoted string at {start}")

    i = start + 1
    parts: list[str] = []
    while i < len(text):
        ch = text[i]
        if ch == "\\":
            i += 1
            if i >= len(text):
                raise ValueError("unterminated escape")
            esc = text[i]
            parts.append({"n": "\n", "t": "\t", "r": "\r"}.get(esc, esc))
            i += 1
            continue
        if ch == quote:
            return "".join(parts), i + 1
        parts.append(ch)
        i += 1

    raise ValueError("unterminated string")


def read_js_array(text: str, start: int) -> tuple[list[str], int]:
    if text[start] != "[":
        raise ValueError("expected array")

    i = start + 1
    items: list[str] = []
    while i < len(text):
        while i < len(text) and text[i] in " \t\r\n,":
            i += 1
        if i >= len(text):
            break
        if text[i] == "]":
            return items, i + 1
        if text[i] not in "'\"":
            raise ValueError(f"expected string in array at {i}")
        value, i = read_js_string(text, i)
        items.append(value)
    raise ValueError("unterminated array")


def parse_article_block(block: str) -> dict:
    def field_string(name: str) -> str:
        match = re.search(rf"{name}:\s*(['\"])", block)
        if not match:
            raise ValueError(f"missing {name} in article block")
        value, _ = read_js_string(block, match.start(1))
        return value

    def field_tags() -> list[str]:
        match = re.search(r"tags:\s*\[", block)
        if not match:
            raise ValueError("missing tags in article block")
        tags, _ = read_js_array(block, match.end() - 1)
        return tags

    return {
        "id": field_string("id"),
        "title": field_string("title"),
        "year": field_string("year"),
        "tags": field_tags(),
        "excerpt": field_string("excerpt"),
    }


def parse_legacy_js(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    articles: list[dict] = []
    pos = 0

    while True:
        id_idx = text.find("id:", pos)
        if id_idx == -1:
            break

        block_start = text.rfind("{", 0, id_idx)
        block_end = text.find("\n    },", id_idx)
        if block_start == -1 or block_end == -1:
            break

        block = text[block_start : block_end + 1]
        articles.append(parse_article_block(block))
        pos = block_end + 1

    return articles


def load_legacy_articles() -> list[dict]:
    articles: list[dict] = []
    seen: set[str] = set()

    for path in LEGACY_FILES:
        if not path.is_file():
            continue
        for article in parse_legacy_js(path):
            if article["id"] in seen:
                raise ValueError(f"duplicate article id: {article['id']}")
            seen.add(article["id"])
            articles.append(article)

    return articles


def export_from_js() -> int:
    articles = load_legacy_articles()
    if not articles:
        print("no legacy articles found", file=sys.stderr)
        return 1
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)

    for article in articles:
        path = CONTENT_DIR / f"{article['id']}.md"
        write_markdown(article, path)

    print(f"exported {len(articles)} entries to {CONTENT_DIR}/")
    return build_index()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--export-from-js",
        action="store_true",
        help="one-time export from js/data/alternate-history.data.js before deleting legacy arrays",
    )
    args = parser.parse_args()

    if args.export_from_js:
        if not any(path.is_file() for path in LEGACY_FILES):
            print("legacy data files missing", file=sys.stderr)
            return 1
        return export_from_js()

    return build_index()


if __name__ == "__main__":
    raise SystemExit(main())
