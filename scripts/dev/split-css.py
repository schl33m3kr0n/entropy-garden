#!/usr/bin/env python3
"""Split css/style.css into partials. Run from repo root."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "css" / "style.css"
OUT_DIR = ROOT / "css"

IMPORTS = [
    ("tokens.css", "tokens"),
    ("base.css", "base"),
    ("garden.css", "garden"),
    ("chrome.css", "chrome"),
    ("games.css", "games"),
    ("ios.css", "ios"),
    ("motion.css", "motion"),
]


def tokenize_blocks(text: str) -> list[tuple[int, str]]:
    """Return (start_line, block_text) for top-level CSS blocks."""
    blocks: list[tuple[int, str]] = []
    i = 0
    n = len(text)
    depth = 0
    line = 1
    block_start = 0
    block_start_line = 1

    while i < n:
        ch = text[i]
        if ch == "\n":
            line += 1
        if ch == "{":
            if depth == 0:
                block_start = i
                # Include selector / at-rule prefix before '{'
                j = block_start - 1
                while j >= 0 and text[j] in " \t\r\n":
                    j -= 1
                while j >= 0 and text[j] != "}":
                    j -= 1
                block_start = j + 1
                while block_start < n and text[block_start] in " \t\r\n":
                    block_start += 1
                block_start_line = text.count("\n", 0, block_start) + 1
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                blocks.append((block_start_line, text[block_start : i + 1]))
        i += 1

    return blocks


def is_keyframes(block: str) -> bool:
    stripped = block.lstrip()
    return stripped.startswith("@keyframes")


def is_ios_block(block: str) -> bool:
    head = block.split("{", 1)[0]
    return "ios-ui" in head or "html:has(body.ios-ui)" in head


def is_reduced_motion(block: str) -> bool:
    return "@media (prefers-reduced-motion: reduce)" in block


def is_tokens_block(block: str, line: int) -> bool:
    stripped = block.lstrip()
    return stripped.startswith(":root") or stripped.startswith("@font-face")


def categorize(line: int, block: str) -> str:
    if is_keyframes(block) or is_reduced_motion(block):
        return "motion"
    if is_ios_block(block):
        return "ios"
    if is_tokens_block(block, line):
        return "tokens"
    if line <= 349:
        return "base"
    if line <= 767:
        return "garden"
    if line <= 2181:
        return "chrome"
    if line <= 2356:
        return "chrome"
    if line <= 2477:
        return "base"
    if line <= 3765:
        return "games"
    if line <= 4143:
        return "chrome"
    return "ios"


def header(name: str) -> str:
    return f"/* Entropy Garden — {name} */\n\n"


def main() -> None:
    text = SRC.read_text(encoding="utf-8")
    blocks = tokenize_blocks(text)

    buckets: dict[str, list[str]] = {key: [] for _, key in IMPORTS}
    keyframes: list[str] = []
    reduced: list[str] = []
    motion_other: list[str] = []

    for line, block in blocks:
        if is_keyframes(block):
            keyframes.append(block.strip() + "\n\n")
            continue
        if is_reduced_motion(block):
            reduced.append(block.strip() + "\n\n")
            continue

        cat = categorize(line, block)
        if cat == "motion":
            motion_other.append(block.strip() + "\n\n")
        else:
            buckets[cat].append(block.strip() + "\n\n")

    motion_parts = keyframes + motion_other + reduced
    buckets["motion"] = motion_parts

    file_labels = {
        "tokens.css": "design tokens & fonts",
        "base.css": "reset, gatekeeper, loader",
        "garden.css": "matrix, panopticon, artifacts, docking bay",
        "chrome.css": "sidebar, modals, HUD, terminal, playlist",
        "games.css": "arcade, cards of chaos, pong overlays",
        "ios.css": "iOS layout & overrides",
        "motion.css": "keyframes & reduced-motion overrides",
    }

    for filename, key in IMPORTS:
        path = OUT_DIR / filename
        body = "".join(buckets[key]).strip()
        path.write_text(header(file_labels[filename]) + body + "\n", encoding="utf-8")
        print(f"wrote {path} ({len(buckets[key])} blocks)")

    entry = "/* Entropy Garden — stylesheet entry point */\n\n" + "\n".join(
        f'@import url("{filename}");' for filename, _ in IMPORTS
    ) + "\n"
    SRC.write_text(entry, encoding="utf-8")
    print(f"updated {SRC} (imports only)")


if __name__ == "__main__":
    main()
