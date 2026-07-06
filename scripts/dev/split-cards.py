#!/usr/bin/env python3
"""Split js/game/cards/game.js into state, rules, render, ui modules."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "js" / "game" / "cards" / "game.js"
OUT = ROOT / "js" / "game" / "cards"

IMPORTS = """import { sfx, playSound, perf } from '../../core/shared.js';
import { callHook } from '../../core/hooks.js';
import {
    ROUND_COUNT,
    MAX_SWAPS,
    HAND_SIZE,
    MIN_PLAYERS,
    MAX_PLAYERS,
    SUITS,
    HAND_LABELS,
    RULES_SECTIONS,
    buildDeck,
    allCardTemplates,
    cardKey,
    dieSidesForSuit,
    rollDie,
    dieMedian,
    hexWedgeFaceSvg,
    sierpinskiFaceSvg,
    icosaCornerSvg,
    icosahedronShapeSvg,
    isDieSixFace,
    isDieNineFace,
} from '../../data/cards-of-chaos.data.js';
import { game, rootEl, bound, keyboardBound, setGame, setRootEl, setBound, setKeyboardBound } from './state.js';
"""

STATE_HEADER = """/** Cards of Chaos — shared session refs. */
import {
    ROUND_COUNT,
    MIN_PLAYERS,
    buildDeck,
} from '../../data/cards-of-chaos.data.js';

export let game = null;
export let rootEl = null;
export let bound = false;
export let keyboardBound = false;

export function setGame(value) { game = value; }
export function setRootEl(value) { rootEl = value; }
export function setBound(value) { bound = value; }
export function setKeyboardBound(value) { keyboardBound = value; }

"""

RULES_HEADER = IMPORTS.replace("from './state.js';", "from './state.js';\nimport { renderGame } from './render.js';")

RENDER_HEADER = IMPORTS + "\nimport { handScore, evaluateHand } from './rules.js';\n"

UI_HEADER = IMPORTS + """
import { newGameState, dealRound, finishRound, advanceToNextRound, swapPlayerCard } from './state.js';
import { renderGame, buildShell, renderRules } from './render.js';
"""


def slice(start: int, end: int) -> str:
    lines = SRC.read_text(encoding="utf-8").splitlines(keepends=True)
    return "".join(lines[start - 1 : end])


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing {SRC}")

    # Line ranges from original cards-of-chaos.js (1-indexed)
    (OUT / "state.js").write_text(
        STATE_HEADER + slice(267, 341) + slice(849, 1116),
        encoding="utf-8",
    )
    (OUT / "rules.js").write_text(
        RULES_HEADER + slice(25, 36) + slice(345, 848),
        encoding="utf-8",
    )
    (OUT / "render.js").write_text(
        RENDER_HEADER + slice(682, 1501),
        encoding="utf-8",
    )
    (OUT / "ui.js").write_text(
        UI_HEADER + slice(65, 266) + slice(1502, 1517),
        encoding="utf-8",
    )
    (OUT / "index.js").write_text(
        "/** Cards of Chaos — lazy entry. */\nexport { initCardsOfChaos } from './ui.js';\n",
        encoding="utf-8",
    )
    SRC.unlink()
    print("split cards into state, rules, render, ui")


if __name__ == "__main__":
    main()
