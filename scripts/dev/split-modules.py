#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Split archive/legacy/script.js into ES modules with lazy loading."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "archive" / "legacy" / "script.js"
MODULES = ROOT / "js" / "modules"

# 1-based inclusive line ranges to extract from archive/legacy/script.js
EXTRACT = {
    "terminal": [(388, 878)],
    "singularity": [(1327, 1617), (1777, 2127)],
    "matrix": [(2199, 2376)],
    "arcade": [(2663, 2776)],
}

# Lines omitted from main.js (duplicates moved to shared/state/modules)
MAIN_SKIP = {
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43,
    44,
    45,
    *range(140, 151),
    *range(152, 352),  # audio, globals, perf listener, slotState
    *range(890, 901),  # playPrev/playNext duplicates (updatePlaylistUI stays in main)
    *range(922, 937),  # checkLateNight (in terminal init)
    *range(939, 946),  # eye vars/listeners (in shared.js)
    1687,  # slotIndexes duplicate
    185,  # slotState duplicate (imported from state.js)
    *range(1750, 1777),  # 3D drag handlers (in singularity module)
    *range(2378, 2382),  # matrix resize handler
    *range(2567, 2573),  # init() duplicate in MAIN_FOOTER
    386,
    387,
    2659,
    2660,
    2661,
    2662,
}


def slice_lines(lines, ranges):
    out = []
    for start, end in ranges:
        out.append("".join(lines[start - 1 : end]))
    return out


def main_lines(lines):
    skip = set(MAIN_SKIP)
    for ranges in EXTRACT.values():
        for start, end in ranges:
            skip.update(range(start, end + 1))
    return "".join(line for i, line in enumerate(lines, 1) if i not in skip)


def postprocess_terminal(body):
    body = body.replace("const termInput = ", "termInput = ")
    body = body.replace("const terminalContainer = ", "terminalContainer = ")
    body = re.sub(r"^let extraPizzas = 0;\n", "", body, flags=re.M)
    body = re.sub(
        r"^let cipherStage = 0;.*\n^let isCipherSolved = false;.*\n",
        "",
        body,
        flags=re.M,
    )
    body = body.replace("function pushTerminalLog(", "export function pushTerminalLog(")
    body = body.replace("openModal(", "globalThis.openModal(")
    body = re.sub(r"^let lastTerminalOpenTime = 0;.*\n", "", body, flags=re.M)
    body = re.sub(r"^let terminalPokes = 0;\n", "", body, flags=re.M)
    body = re.sub(r"^let pokeResetTimer;\n", "", body, flags=re.M)
    body = body.replace("toggleBossKey()", "globalThis.gardenHooks.toggleBossKey()")
    body = body.replace("handleReroll()", "globalThis.gardenHooks.handleReroll()")
    body = body.replace("toggleMode()", "globalThis.gardenHooks.toggleMode()")
    return body


def postprocess_singularity(body):
    body = re.sub(
        r"^let isSingularityActive = false;\n^let singularityAnimId;\n\n",
        "",
        body,
        flags=re.M,
    )
    body = body.replace("window.activeUtterances", "activeUtterances")
    return body


def postprocess_arcade(body):
    return body.replace("spawnPizza();", "loadTerminal().then((t) => t.spawnPizza());")


def postprocess_main(body):
    body = re.sub(r"^let slotState = \[null, null, null\]; \n", "", body, flags=re.M)
    body = body.replace(
        "document.addEventListener('DOMContentLoaded', () => {",
        "function bindDomEvents() {",
    )
    body = body.replace(
        "    initializeCycleSlots();\n});",
        "    initializeCycleSlots();\n}\n\nif (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', bindDomEvents);\n} else {\n    bindDomEvents();\n}",
    )
    body = body.replace(
        "terminalContainer.classList.add('burp-active');",
        "getTerminalContainer().classList.add('burp-active');",
    )
    body = body.replace(
        "terminalContainer.classList.remove('burp-active');",
        "getTerminalContainer().classList.remove('burp-active');",
    )
    body = body.replace(
        "            currentTrackIndex = 0;\n            playCurrentBgmTrack();",
        "            resetBgmToStart();",
    )
    body = body.replace(
        "            gardenHasStarted = true;",
        "            setGardenHasStarted(true);",
    )
    return body


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main():
    lines = SRC.read_text(encoding="utf-8").splitlines(keepends=True)

    write(ROOT / "js" / "state.js", STATE_JS)
    write(ROOT / "js" / "shared.js", SHARED_JS)
    write(ROOT / "js" / "lazy.js", LAZY_JS)

    terminal_body = postprocess_terminal("".join(slice_lines(lines, EXTRACT["terminal"])))
    write(
        MODULES / "terminal.js",
        TERMINAL_HEADER + terminal_body + TERMINAL_FOOTER,
    )

    sing_body = postprocess_singularity("".join(slice_lines(lines, EXTRACT["singularity"])))
    write(
        MODULES / "singularity.js",
        SINGULARITY_HEADER + sing_body + SINGULARITY_FOOTER,
    )

    matrix_body = "".join(slice_lines(lines, EXTRACT["matrix"]))
    write(
        MODULES / "matrix.js",
        MATRIX_HEADER + matrix_body + MATRIX_FOOTER,
    )

    arcade_body = postprocess_arcade("".join(slice_lines(lines, EXTRACT["arcade"])))
    write(
        MODULES / "arcade.js",
        ARCADE_HEADER + arcade_body + ARCADE_FOOTER,
    )

    main_body = postprocess_main(main_lines(lines))
    write(
        ROOT / "js" / "main.js",
        MAIN_HEADER + main_body + MAIN_FOOTER,
    )

    print("Wrote js/state.js, js/shared.js, js/lazy.js, js/main.js, js/modules/*.js")


STATE_JS = """// Mutable app state (live bindings for ES modules)
export let time = 0;
export let isCorrupted = false;
export let isRepulsing = false;
export let canvasDpr = 1;
export let fontSize = 16;
export let cellSize = 16;
export let cols;
export let rows;
export let gardenLoopActive = false;
export let gardenHasStarted = false;
export let gardenAnimId = null;
export let matrixFrameCount = 0;
export let needsFullRedraw = true;
export let isSingularityActive = false;
export let singularityAnimId = null;
export let cipherStage = 0;
export let isCipherSolved = false;
export let extraPizzas = 0;
export let slotState = [null, null, null];
export let slotIndexes = [0, 0, 0];
export let currentPoemIndex = 0;
export let arcadeScore = 0;
export let currentSequenceIndex = 0;
export let activeUtterances = [];

export function setGardenHasStarted(value = true) {
    gardenHasStarted = value;
}
"""

SHARED_JS = r"""// Shared utilities, audio, perf, canvas
import {
    gardenHasStarted,
    gardenLoopActive,
    singularityAnimId,
} from './state.js';

export { gardenHasStarted, gardenLoopActive, singularityAnimId };

export const asset = (path) => `assets/${path}`;
export const sfxPath = (file) => asset(`audio/sfx/${file}`);
export const musicPath = (file) => asset(`audio/music/${file}`);
export const imgPath = (file) => asset(`img/${file}`);

export function setImgWithFallback(el) {
    if (!el || el.tagName !== 'IMG' || el.getAttribute('src')) return;
    const primary = el.dataset.src;
    const fallback = el.dataset.fallback;
    if (!primary) return;
    if (fallback) {
        el.onerror = () => {
            el.onerror = null;
            el.src = fallback;
        };
    }
    el.src = primary;
}

function createLazyAudio(src) {
    const audio = new Audio();
    audio.preload = 'none';
    audio.src = src;
    return audio;
}

export const sfx = {
    oneUp: createLazyAudio(sfxPath('1 up.mp3')),
    checkpoint: createLazyAudio(sfxPath('checkpoint.mp3')),
    collectible: createLazyAudio(sfxPath('collectible.mp3')),
    glitch: createLazyAudio(sfxPath('glitch.mp3')),
    itemAcquired: createLazyAudio(sfxPath('item acquired.mp3')),
    missionCleared: createLazyAudio(sfxPath('mission cleared.mp3')),
    oopsy: createLazyAudio(sfxPath('oopsy daisies.mp3')),
    it: createLazyAudio(sfxPath('it.mp3')),
    transition: createLazyAudio(sfxPath('transition.mp3')),
    refresh: createLazyAudio(sfxPath('dry-fart.mp3')),
    taskComplete: createLazyAudio(sfxPath('task complete.mp3')),
    loading: createLazyAudio(sfxPath('loading.mp3')),
    radio: createLazyAudio(sfxPath('radio.mp3')),
    eat: createLazyAudio(sfxPath('eat.mp3')),
    exit: createLazyAudio(sfxPath('exit.mp3')),
    burp: document.getElementById('burp-sound'),
    error: document.getElementById('error-sound'),
    keystroke: createLazyAudio(sfxPath('keystroke.mp3')),
    clearThroat: createLazyAudio(sfxPath('clearing-throat.mp3')),
    unknown: createLazyAudio(sfxPath('unknown command.mp3')),
    ui: createLazyAudio(sfxPath('ui.mp3')),
    stfu: createLazyAudio(sfxPath('stfu.mp3')),
    close: createLazyAudio(sfxPath('close.mp3')),
    click: createLazyAudio(sfxPath('click.mp3')),
    press: createLazyAudio(sfxPath('press.mp3')),
    stop: createLazyAudio(sfxPath('stop it.mp3')),
};

export const BGM_TRACKS = [
    'init.mp3',
    'ambient2.mp3',
    'ambient3.mp3',
    'ambient4.mp3',
    'ambient6.mp3',
    'ambient7.mp3',
    'playboi carti - 7am (slowed reverb).mp3',
    'ambient8.mp3',
    'fractals.mp3',
];

const bgmCache = new Map();
export let currentTrackIndex = 0;

function wrapTrackIndex(index) {
    return ((index % BGM_TRACKS.length) + BGM_TRACKS.length) % BGM_TRACKS.length;
}

export function getBgmTrack(index) {
    const i = wrapTrackIndex(index);
    if (!bgmCache.has(i)) {
        const audio = createLazyAudio(musicPath(BGM_TRACKS[i]));
        audio.loop = false;
        audio.volume = 0.3;
        bgmCache.set(i, audio);
    }
    return bgmCache.get(i);
}

function stopBgmTrack(index) {
    const track = bgmCache.get(index);
    if (!track) return;
    track.pause();
    track.currentTime = 0;
    track.onended = null;
}

function preloadBgmTrack(index) {
    const track = getBgmTrack(index);
    if (track.readyState === 0) track.load();
}

function pruneBgmCache() {
    const keep = new Set([
        wrapTrackIndex(currentTrackIndex),
        wrapTrackIndex(currentTrackIndex + 1),
        wrapTrackIndex(currentTrackIndex - 1),
    ]);
    bgmCache.forEach((track, index) => {
        if (keep.has(index)) return;
        stopBgmTrack(index);
        track.removeAttribute('src');
        track.load();
        bgmCache.delete(index);
    });
}

export function playCurrentBgmTrack() {
    const track = getBgmTrack(currentTrackIndex);
    track.volume = 0.3;
    track.loop = false;
    track.onended = playNextTrack;
    track.play().catch(() => {});
    preloadBgmTrack(currentTrackIndex + 1);
    pruneBgmCache();
    if (typeof globalThis.updatePlaylistUI === 'function') {
        globalThis.updatePlaylistUI();
    }
}

export function playSound(sound) {
    if (!sound) return;
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

export function playMeow() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(392.0, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440.0, audioCtx.currentTime + 0.2);
        osc.frequency.exponentialRampToValueAtTime(392.0, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {}
}

export function shuffle(array) {
    let currentIndex = array.length;
    let randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

export function createBag(arr) {
    let bag = [];
    return function draw(count = 1) {
        const results = [];
        for (let i = 0; i < count; i++) {
            if (bag.length === 0) bag = shuffle([...arr]);
            results.push(bag.pop());
        }
        return count === 1 ? results[0] : results;
    };
}

export const canvas = document.getElementById('grid-canvas');
export const ctx = canvas.getContext('2d');
export const chars = "ÆÐÞǷȜƩƱƲƷƸƎƔƜɅꜲꜨꜬꜮꜴꜶꝎꝠꝏꟄꟿƁƇƊƑƓƘƤƬƳȡȴȶɁɃɆɎ∑∫∆∞≈µ¥£€¢±×÷∂∇∏√∝∠∧∨∩∪∴∵∼≅≠≤≥⊂⊃⊆⊇⊕⊗⊥─□△▽◇○◎★☆♪♀♂☼ϫϞ֍אבגדהוזחטיכלמנסעपफबभमयरलवशषसहअआइईउऊऋएऐओऔॐॠѢѪѦѮѰѲѴѶѸѠѾѼӁӃӇӋӚӜӞӠӢӤӦӨӪӬӮӰӲӴӶӸӺӼӾԀԂԄԆԈԊԌԎԐԒЖЗЛФЦЧШЩЪЫЬЭЮЯ道无极阴阳气玄虚禅空觉悟幻仁义礼智信理天命心变აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰჱჲჳჴჵჶჷჸჹჺァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶᚠᚢᚦᚬᚱᚴᚼᚽᚾᚿᛁᛅᛆᛋᛌᛏᛐᛒᛘᛚᛦঅআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলবশষসহకఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరలవశషసహ가나다라마바사아자차카타파하ሀለሐመሠረሰቀበተኀነአከወዐዘየደገጠጰጸፀፈፐကခဂဃငစဆဇဈညဋဌဍ႑ဏတထဒဓနပဖဗဘမယရလဝသဟဠအഅആഇഈഉഊഋഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനപഫബഭമയരലവശഷസഹᜀᜁᜂᜃᜄᜅᜆᜇᜈᜉᜊᜋᜌᜎᜏᜐᜑកខគឃងចឆជឈញដឋឌឍណតថទធនបផពភមយរលវសហឡអกขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหඅආඇඈඉඊඋඌඍඑඒඓඔඕඖකඛගඝඞඟචඡජඣඤඥඦටඨඩඪණඬතථදධනඳපඵබභමඹයරලවශෂසහළෆֆբգդեզէըթժլխծկհձղճմյնշոչպջռսվտրցւփքօႠႡႢႣႤႥႦႧႨႩႪႫႬႭႮႯႰႱႲႳႴႵႶႷႸႹႺႻႼႽႾႿჀⴀⴁⴂⴃⴄⴅⴆⴇⴈⴉⴊⴋⴌⴍⴎⴏⴐⴑⴒⴓⴔⴕⴖⴗⴘⴙⴚⴛⴜⴝⴞⴟⴠꔀꔃꔉꔊꔋꔌꔚꔛꔤꔥꔪ가고구그기나노누느니다도두드디라로루르리마모무므미바보부브비사소수스시아오우으이자조주즈지차초추츠치카코쿠크키타토투트티파포푸프피하호후흐히";

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isNarrowViewport = window.innerWidth <= 768;
const isMobile = isCoarsePointer || isNarrowViewport;

export const perf = {
    isMobile,
    prefersReducedMotion: reducedMotionQuery.matches,
    dprCap: isMobile ? 1.5 : 2,
    spawnPerFrame: reducedMotionQuery.matches ? 12 : (isMobile ? 4 : 8),
    steadySwapsPerFrame: reducedMotionQuery.matches ? 8 : (isMobile ? 12 : 30),
    matrixFrameSkip: isMobile && !reducedMotionQuery.matches ? 1 : 0,
    cellSpacing: isMobile ? 1.45 : 1.65,
};

export function applyPerfClass() {
    document.body.classList.toggle('perf-lite', isMobile || perf.prefersReducedMotion);
}

applyPerfClass();
reducedMotionQuery.addEventListener('change', (e) => {
    perf.prefersReducedMotion = e.matches;
    perf.spawnPerFrame = e.matches ? 12 : (perf.isMobile ? 4 : 8);
    perf.steadySwapsPerFrame = e.matches ? 8 : (perf.isMobile ? 12 : 30);
    perf.matrixFrameSkip = perf.isMobile && !e.matches ? 1 : 0;
    applyPerfClass();
    import('./state.js').then((s) => { s.needsFullRedraw = true; });
});

export let eyeAngle = 0;
export let eyeTargetAngle = 0;
export let eyeScale = 1;
export let eyeMode = 'slow';
export let eyeIsHovered = false;
export let eyeIsActive = false;
export const eyeEl = document.getElementById('reroll-eye');

eyeEl.addEventListener('mouseenter', () => { eyeIsHovered = true; });
eyeEl.addEventListener('mouseleave', () => { eyeIsHovered = false; });
eyeEl.addEventListener('mousedown', () => { eyeIsActive = true; });
window.addEventListener('mouseup', () => { eyeIsActive = false; });

export function playPrevTrack() {
    stopBgmTrack(currentTrackIndex);
    currentTrackIndex = wrapTrackIndex(currentTrackIndex - 1);
    playCurrentBgmTrack();
}

export function playNextTrack() {
    stopBgmTrack(currentTrackIndex);
    currentTrackIndex = wrapTrackIndex(currentTrackIndex + 1);
    playCurrentBgmTrack();
}

export function resetBgmToStart() {
    currentTrackIndex = 0;
    playCurrentBgmTrack();
}
"""

LAZY_JS = r"""// Lazy module loader with call-through stubs

let terminalMod;
let singularityMod;
let matrixMod;
let arcadeMod;

let terminalPromise;
let singularityPromise;
let matrixPromise;
let arcadePromise;

const terminalQueue = [];

export function loadTerminal() {
    if (!terminalPromise) {
        terminalPromise = import('./modules/terminal.js').then((mod) => {
            terminalMod = mod;
            mod.initTerminal();
            terminalQueue.splice(0).forEach((msg) => mod.pushTerminalLog(msg));
            return mod;
        });
    }
    return terminalPromise;
}

export function loadSingularity() {
    if (!singularityPromise) {
        singularityPromise = import('./modules/singularity.js').then((mod) => {
            singularityMod = mod;
            return mod;
        });
    }
    return singularityPromise;
}

export function loadMatrix() {
    if (!matrixPromise) {
        matrixPromise = import('./modules/matrix.js').then((mod) => {
            matrixMod = mod;
            return mod;
        });
    }
    return matrixPromise;
}

export function loadArcade() {
    if (!arcadePromise) {
        arcadePromise = import('./modules/arcade.js').then((mod) => {
            arcadeMod = mod;
            return mod;
        });
    }
    return arcadePromise;
}

export function pushTerminalLog(msg) {
    if (terminalMod) terminalMod.pushTerminalLog(msg);
    else {
        terminalQueue.push(msg);
        loadTerminal();
    }
}

export function triggerSingularity() {
    loadSingularity().then((mod) => mod.triggerSingularity());
}

export function triggerOspreyEvent() {
    loadSingularity().then((mod) => mod.triggerOspreyEvent());
}

export function cyclePoem() {
    loadSingularity().then((mod) => mod.cyclePoem());
}

export async function ensureMatrix() {
    return loadMatrix();
}

export function startGardenLoop() {
    loadMatrix().then((mod) => mod.startGardenLoop());
}

export function stopGardenLoop() {
    if (matrixMod) matrixMod.stopGardenLoop();
}

export function resizeCanvas() {
    if (matrixMod) matrixMod.resizeCanvas();
    else loadMatrix().then((mod) => mod.resizeCanvas());
}

export function setMatrixNeedsRedraw() {
    import('./state.js').then((s) => { s.needsFullRedraw = true; });
}

export async function loadArcadeLevel() {
    const mod = await loadArcade();
    mod.loadArcadeLevel();
}

export function getTerminalContainer() {
    return terminalMod?.terminalContainer ?? document.getElementById('terminal-container');
}

export function getTermInput() {
    return terminalMod?.termInput ?? document.getElementById('term-input');
}

// Preload terminal after first paint
if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => loadTerminal());
} else {
    setTimeout(() => loadTerminal(), 200);
}
"""

TERMINAL_HEADER = r"""import {
    sfx,
    playSound,
    playMeow,
    createBag,
    shuffle,
} from '../shared.js';
import {
    cipherStage,
    isCipherSolved,
    extraPizzas,
} from '../state.js';
import { triggerSingularity, triggerOspreyEvent } from '../lazy.js';

export let terminalContainer;
export let termInput;
let lastTerminalOpenTime = 0;
let terminalPokes = 0;
let pokeResetTimer;

export function getCipherStage() {
    return cipherStage;
}

// --- TERMINAL LOG SYSTEM ---
"""

TERMINAL_FOOTER = r"""

export function initTerminal() {
    initLateNightLogs();
}

function initLateNightLogs() {
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 5) {
        document.documentElement.style.setProperty('--neon-green', '#ccff00');
        const lateNightLogs = [
            "> WHO ARE YOU PERFORMING FOR?",
            "> THE SUN IS COMING UP. HOW EMBARRASSING.",
            "> THE TOPOLOGY CAN WAIT. SLEEP.",
            "> GEOMETRY JUDGES YOU IN THE DARK.",
            "> NOT EVEN THE BOTS ARE AWAKE.",
        ];
        drawTerminalLog = createBag([...baseTerminalOutput, ...lateNightLogs]);
    }
}

export { spawnPizza, processCommand, printShortcuts, printLexicon, triggerScatter, triggerCipherReward };
"""

SINGULARITY_HEADER = r"""import { sfx, playSound } from '../shared.js';
import {
    isSingularityActive,
    singularityAnimId,
    currentPoemIndex,
    activeUtterances,
} from '../state.js';
import { pushTerminalLog } from '../lazy.js';

let angleX = 0;
let angleY = 0;
let isDragging3D = false;
let lastMouseX;
let lastMouseY;
const sCanvas = document.getElementById('singularity-canvas');

"""

SINGULARITY_FOOTER = r"""

function handle3DStart(e) {
    isDragging3D = true;
    lastMouseX = e.clientX || e.touches[0].clientX;
    lastMouseY = e.clientY || e.touches[0].clientY;
}
function handle3DMove(e) {
    if (isDragging3D) {
        let cx = e.clientX || e.touches[0].clientX;
        let cy = e.clientY || e.touches[0].clientY;
        angleY += (cx - lastMouseX) * 0.01;
        angleX += (cy - lastMouseY) * 0.01;
        lastMouseX = cx;
        lastMouseY = cy;
    }
}
function handle3DEnd() { isDragging3D = false; }

sCanvas.addEventListener('mousedown', handle3DStart);
sCanvas.addEventListener('touchstart', handle3DStart, { passive: false });
sCanvas.addEventListener('mousemove', handle3DMove);
sCanvas.addEventListener('touchmove', handle3DMove, { passive: false });
sCanvas.addEventListener('mouseup', handle3DEnd);
sCanvas.addEventListener('touchend', handle3DEnd);

export { triggerSingularity, triggerOspreyEvent, cyclePoem, init3D };
"""

MATRIX_HEADER = r"""import {
    canvas,
    ctx,
    chars,
    perf,
    eyeEl,
    eyeAngle,
    eyeTargetAngle,
    eyeScale,
    eyeMode,
    eyeIsHovered,
    eyeIsActive,
} from '../shared.js';
import {
    time,
    isCorrupted,
    canvasDpr,
    fontSize,
    cellSize,
    cols,
    rows,
    gardenLoopActive,
    gardenHasStarted,
    gardenAnimId,
    matrixFrameCount,
    needsFullRedraw,
} from '../state.js';

// --- SOLID WALL MATRIX ENGINE ---
"""

MATRIX_FOOTER = r"""

window.addEventListener('resize', () => {
    resizeCanvas();
    if (gardenLoopActive) needsFullRedraw = true;
});

export { resizeCanvas, startGardenLoop, stopGardenLoop };
"""

ARCADE_HEADER = r"""import { sfx, playSound } from '../shared.js';
import { arcadeScore, currentSequenceIndex } from '../state.js';
import { pushTerminalLog, loadTerminal } from '../lazy.js';

// --- ARCADE MINIGAME: SEQUENCE PROTOCOL ---
"""

ARCADE_FOOTER = r"""

export { loadArcadeLevel };
"""

MAIN_HEADER = r"""// Entropy Garden — main entry (lazy-loads terminal, matrix, singularity, arcade)
import {
    sfx,
    playSound,
    playMeow,
    createBag,
    shuffle,
    setImgWithFallback,
    imgPath,
    canvas,
    perf,
    eyeEl,
    eyeAngle,
    eyeTargetAngle,
    eyeScale,
    eyeMode,
    eyeIsHovered,
    eyeIsActive,
    currentTrackIndex,
    playCurrentBgmTrack,
    playPrevTrack,
    playNextTrack,
    resetBgmToStart,
    getBgmTrack,
} from './shared.js';
import {
    time,
    isCorrupted,
    needsFullRedraw,
    gardenHasStarted,
    isSingularityActive,
    singularityAnimId,
    slotState,
    slotIndexes,
    cipherStage,
    isCipherSolved,
    setGardenHasStarted,
} from './state.js';
import {
    pushTerminalLog,
    triggerSingularity,
    cyclePoem,
    startGardenLoop,
    stopGardenLoop,
    resizeCanvas,
    setMatrixNeedsRedraw,
    loadArcadeLevel,
    loadTerminal,
    getTerminalContainer,
    getTermInput,
} from './lazy.js';
import { registerServiceWorkerAfterInit } from './sw-register.js';

// Bind init immediately so a later module error cannot block the gatekeeper.
function beginGardenExperience() {
    playSound(sfx.collectible);
    resetBgmToStart();

    document.getElementById('init-screen').style.display = 'none';
    canvas.classList.remove('matrix-visible');
    setGardenHasStarted(true);
    startGardenLoop();
    startLoader();
    registerServiceWorkerAfterInit();
}

function bindInitButton() {
    const initBtn = document.getElementById('init-btn');
    if (!initBtn || initBtn.dataset.bound) return;
    initBtn.dataset.bound = '1';
    initBtn.addEventListener('click', beginGardenExperience);
}

bindInitButton();

// ==========================================
// ENTROPY GARDEN - v24.0 ENGINE
// ==========================================

"""

MAIN_FOOTER = r"""

globalThis.gardenHooks = { toggleBossKey, handleReroll, toggleMode };

// --- GLOBAL HTML HANDLERS ---
window.openModal = openModal;
window.playPrevTrack = playPrevTrack;
window.playNextTrack = playNextTrack;
globalThis.updatePlaylistUI = updatePlaylistUI;

function init() {
    resizeCanvas();
    randomizeData();
}

if (document.readyState === 'complete') {
    init();
} else {
    window.addEventListener('load', init);
}

registerServiceWorkerAfterInit();
"""


if __name__ == "__main__":
    main()
