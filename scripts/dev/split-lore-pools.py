#!/usr/bin/env python3
"""Split js/data/lore-pools.data.js into js/data/lore/*.data.js partials."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "js" / "data" / "lore-pools.data.js"
OUT = ROOT / "js" / "data" / "lore"

GROUPS = {
    "identity.data.js": [
        "baseLocationsSafe",
        "baseLocationsGritty",
        "classTitlesSafe",
        "classTitlesGritty",
    ],
    "stats-bio.data.js": [
        "statsSafe",
        "statsGritty",
        "bioFragmentsSafe",
        "bioFragmentsGritty",
    ],
    "projects.data.js": ["projectsSafe", "projectsGritty"],
    "vibes.data.js": [
        "vibesAudioSafe",
        "vibesAudioGritty",
        "vibesActivitySafe",
        "vibesActivityGritty",
        "vibesMoodSafe",
        "vibesMoodGritty",
    ],
    "terminal.data.js": [
        "terminalOutputSafe",
        "terminalOutputGritty",
        "idleMessagesSafe",
        "idleMessagesGritty",
    ],
    "panopticon.data.js": [
        "panopticonIdleCommentsSafe",
        "panopticonIdleCommentsGritty",
        "panopticonReturnCommentsSafe",
        "panopticonReturnCommentsGritty",
        "panopticonHighCommentsSafe",
        "panopticonHighCommentsGritty",
        "panopticonHighReturnCommentsSafe",
        "panopticonHighReturnCommentsGritty",
        "panopticonGodModeComments",
        "panopticonTriggerComments",
    ],
}


def extract_key_block(text: str, key: str) -> str:
    pattern = rf"^    {re.escape(key)}:\s"
    match = re.search(pattern, text, re.MULTILINE)
    if not match:
        raise ValueError(f"Key not found: {key}")
    start = match.start()
    pos = match.end()
    if text[pos - 1 : pos + 1].strip().startswith("{"):
        depth = 0
        i = match.end() - 1
        while i < len(text):
            ch = text[i]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    if text[end : end + 1] == ",":
                        end += 1
                    return text[start:end].rstrip().rstrip(",")
            i += 1
        raise ValueError(f"Unclosed brace for {key}")
    lines = [text[start : match.end()]]
    i = match.end()
    while i < len(text):
        line = text[i : text.find("\n", i) + 1] if "\n" in text[i:] else text[i:]
        if not line:
            break
        lines.append(line)
        i += len(line)
        joined = "".join(lines)
        if joined.rstrip().endswith("],") or joined.rstrip().endswith("],"):
            break
        if re.search(r"\],\s*$", joined):
            break
    block = "".join(lines).rstrip().rstrip(",")
    return block


def main() -> None:
    text = SRC.read_text(encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)

    for filename, keys in GROUPS.items():
        blocks = []
        for key in keys:
            blocks.append(extract_key_block(text, key))
        body = ",\n".join(blocks)
        content = f"""// Lore pool partial — merged at boot into globalThis.lorePools
(function (g) {{
    g.lorePools = g.lorePools || {{}};
    Object.assign(g.lorePools, {{
{body}
    }});
}})(globalThis);
"""
        (OUT / filename).write_text(content, encoding="utf-8")
        print(f"wrote {OUT / filename}")

    loader = """// Merges lore partials into globalThis.lorePools (classic scripts, no ESM).
// Partials assign via Object.assign; load order matches index.html script tags.
"""
    (OUT / "README.txt").write_text(
        "Load identity, stats-bio, projects, vibes, terminal, panopticon .data.js in order.\n",
        encoding="utf-8",
    )

    # Keep stub at old path for backwards compat discovery
    stub = """// Deprecated entry — lore lives in js/data/lore/*.data.js (see index.html).
globalThis.lorePools = globalThis.lorePools || {};
"""
    SRC.write_text(stub, encoding="utf-8")
    print("updated lore-pools.data.js stub")


if __name__ == "__main__":
    main()
