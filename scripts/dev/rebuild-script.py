#!/usr/bin/env python3
"""Rebuild archive/legacy/script.js from corrupted split pieces."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
script_path = ROOT / "archive/legacy/script.js"
lines = script_path.read_text(encoding="utf-8").splitlines(keepends=True)

terminal = (
    "// --- TERMINAL LOG SYSTEM ---\n"
    "const baseTerminalOutput = [\n"
    + (ROOT / "js/modules/terminal.js").read_text(encoding="utf-8")
    + "\n"
)

keyboard = "".join(lines[388:958])  # tabSpam through vibes };

# Poems from singularity module tail
sing = (ROOT / "js/modules/singularity.js").read_text(encoding="utf-8")
poem_start = sing.index("open your eyes")
poem_end = sing.index("let currentPoemIndex = 0;") + len("let currentPoemIndex = 0;\n")
poems = "    const singularityPoems = [\n`descent\n\n" + sing[poem_start:poem_end] + "\n"

draw_bags = (
    "const drawBase = createBag(baseLocations); \n"
    "const drawClass = createBag(classTitles); \n"
    "const drawAudio = createBag(vibes.audio); \n"
    "const drawActivity = createBag(vibes.activity); \n"
    "const drawMood = createBag(vibes.mood); \n"
    "const drawBioFragment = createBag(bioFragments); \n"
    "const drawProjects = createBag(projectDatabase); \n"
    "const drawStats = createBag(statsDatabase);\n\n"
)

reroll_block = "".join(lines[971:1020])  # handleReroll through end randomizeData

combo_block = "".join(lines[1056:1126])  # combination lock through checkCycleWin

singularity_3d = sing[: sing.index("// --- CORRUPTED MODE TOGGLE ---")].strip() + "\n"

singularity_logic = (
    "// --- SINGULARITY EVENT LOGIC ---\n"
    "let isSingularityActive = false;\n"
    "let singularityAnimId;\n\n"
)
logic_start = sing.index("function triggerSingularity()")
logic_end = sing.index("// --- INTERACTIVE 3D ENGINE (ICO-SPHERE) ---", logic_start)
# resetTimeline ends before duplicate 3D comment in poems section
logic_end = sing.index("function resetTimeline()")
logic_end = sing.index("}", sing.index('pushTerminalLog("> NEW TIMELINE INITIALIZED.")')) + 1
singularity_logic += sing[logic_start:logic_end + 1] + "\n\n"

toggle_mode = """// --- CORRUPTED MODE TOGGLE ---
function toggleMode() {
    const btn = document.getElementById('mode-btn');
    isCorrupted = !isCorrupted;
    needsFullRedraw = true;
    if (isCorrupted) {
        document.body.classList.add('corrupted');
        btn.innerText = "CORRUPTED MODE";
        playSound(sfx.glitch);
        pushTerminalLog("> CORRUPTED MODE ENGAGED");
    } else {
        document.body.classList.remove('corrupted');
        btn.innerText = "SAFE MODE";
        playSound(sfx.it);
        pushTerminalLog("> SAFE MODE RESTORED");
    }
}

"""

easter_egg = "".join(lines[1147:1165])

matrix_raw = (ROOT / "js/modules/matrix.raw.js").read_text(encoding="utf-8")
matrix_block = "// --- SOLID WALL MATRIX ENGINE ---\nlet gridMap = [];\n" + matrix_raw.split("function activateVaultMedia")[0]

tail_start = None
for i, line in enumerate(lines):
    if line.startswith("function activateVaultMedia"):
        tail_start = i
        break
if tail_start is None:
    raise SystemExit("activateVaultMedia not found")

arcade = (
    "// ==========================================\n"
    "// --- ARCADE MINIGAME: SEQUENCE PROTOCOL ---\n"
    "// ==========================================\n"
    + (ROOT / "js/modules/arcade.js").read_text(encoding="utf-8")
    + "\n"
)

tail = "".join(lines[tail_start:])
# Remove arcade from tail if duplicated - grep loadArcadeLevel in tail only once

rebuilt = (
    "".join(lines[:386])
    + terminal
    + keyboard
    + poems
    + draw_bags
    + reroll_block
    + combo_block
    + "\n"
    + singularity_3d
    + singularity_logic
    + toggle_mode
    + easter_egg
    + matrix_block
    + tail
)

# Inject arcade before chromatic glitch if missing
if "function loadArcadeLevel" not in rebuilt:
    marker = "// --- OCCASIONAL CHROMATIC ABERRATION ENGINE ---"
    rebuilt = rebuilt.replace(marker, arcade + marker)

script_path.write_text(rebuilt, encoding="utf-8")
print(f"Rebuilt script.js: {len(rebuilt.splitlines())} lines")
