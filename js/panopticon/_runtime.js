/** Panopticon implementation (gaze, god mode, comments, sleep/wake). */
import {
    gardenHasStarted,
    isCorrupted,
    isSingularityActive,
    getCipherStage,
    fontSize,
    cellSize,
} from '../core/state.js';
import { perf } from '../core/canvas-perf.js';
import { pickOne, createBag, commentTtlMs } from '../core/lore/random.js';
import { sfx, playSound, playSoundOverlap } from '../core/audio/sfx.js';
import { getHook } from '../core/hooks.js';
import {
    panopticonCommentEl,
    panopticonEl,
    panopticonInnerEl,
    panopticonGazeEl,
    panopticonPupilEl,
    panopticonIrisOuterEl,
    panopticonIrisMidEl,
    panopticonGodPupilEl,
    panopticonLidEl,
    panopticonClipPathEl,
    panopticonRainbowGradEl,
    godModeRainbowGradEl,
} from './dom.js';
import { applyGodPupilSymbol, resetGodPupilPosition } from './god-symbol-offsets.js';

export let eyeAngle = 0;
export let eyeMode = 'idle';

export {
    panopticonCommentEl,
    panopticonEl,
    panopticonInnerEl,
    panopticonGazeEl,
    panopticonPupilEl,
    panopticonIrisOuterEl,
    panopticonIrisMidEl,
    panopticonGodPupilEl,
    panopticonLidEl,
    panopticonClipPathEl,
    panopticonRainbowGradEl,
    godModeRainbowGradEl,
} from './dom.js';

/** Almond lid bounds in the eye SVG viewBox (100×100): x 8–92, y 12–88. */
const PANOPTICON_LID_WIDTH_RATIO = 0.84;
const PANOPTICON_LID_HEIGHT_RATIO = 0.76;
const GOD_TRIANGLE_EYE_CLEARANCE = 1.26;

function getGodTriangleLayerEl() {
    return document.getElementById('god-mode-triangle-layer');
}

function getGodTriangleEl() {
    return document.getElementById('panopticon-god-triangle');
}

function ensureGodTriangleLayer() {
    let layer = getGodTriangleLayerEl();
    if (layer) return layer;

    const canvas = document.getElementById('grid-canvas');
    const eye = document.getElementById('panopticon-eye');
    if (!canvas || !eye) return null;

    layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    layer.id = 'god-mode-triangle-layer';
    layer.classList.add('god-mode-triangle-layer');
    layer.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    layer.setAttribute('width', '100%');
    layer.setAttribute('height', '100%');
    layer.setAttribute('aria-hidden', 'true');

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.id = 'god-mode-rainbow';
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '100');
    grad.setAttribute('y2', '0');
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('spreadMethod', 'repeat');
    const stops = [
        ['0%', 'hsl(0, 100%, 55%)'],
        ['17%', 'hsl(60, 100%, 55%)'],
        ['33%', 'hsl(120, 100%, 55%)'],
        ['50%', 'hsl(180, 100%, 55%)'],
        ['67%', 'hsl(240, 100%, 55%)'],
        ['83%', 'hsl(300, 100%, 55%)'],
        ['100%', 'hsl(0, 100%, 55%)'],
    ];
    for (const [offset, color] of stops) {
        const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop.setAttribute('offset', offset);
        stop.setAttribute('stop-color', color);
        grad.appendChild(stop);
    }
    defs.appendChild(grad);
    layer.appendChild(defs);

    const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    tri.id = 'panopticon-god-triangle';
    tri.classList.add('panopticon-god-triangle');
    tri.setAttribute('points', '0,0 0,0 0,0');
    layer.appendChild(tri);

    eye.parentNode?.insertBefore(layer, eye);
    return layer;
}

export function syncGodModeTriangleSize() {
    ensureGodTriangleLayer();
    const layer = getGodTriangleLayerEl();
    const tri = getGodTriangleEl();
    if (!layer || !tri) return;

    const syncW = window.innerWidth;
    const syncH = window.innerHeight;
    if (!Number.isFinite(syncW) || !Number.isFinite(syncH) || syncW <= 0 || syncH <= 0) return;

    layer.setAttribute('viewBox', `0 0 ${syncW} ${syncH}`);
    layer.setAttribute('width', '100%');
    layer.setAttribute('height', '100%');

    if (godModeRainbowGradEl || document.getElementById('god-mode-rainbow')) {
        (document.getElementById('god-mode-rainbow') ?? godModeRainbowGradEl)
            ?.setAttribute('x2', String(syncW));
    }

    const fs = Number(fontSize) || 16;
    const cs = Number(cellSize) || 16;
    const strokeW = Math.max(2.5, fs * 0.1, cs * 0.09);
    const eyeEl = document.getElementById('panopticon-eye');
    const eyeSize = eyeEl?.getBoundingClientRect().width ?? 0;
    let r;
    if (eyeSize > 0) {
        const eyeWidthPx = eyeSize * PANOPTICON_LID_WIDTH_RATIO;
        const eyeHeightPx = eyeSize * PANOPTICON_LID_HEIGHT_RATIO;
        const clearance = GOD_TRIANGLE_EYE_CLEARANCE;
        const rFromWidth = (eyeWidthPx * clearance) / Math.SQRT3;
        const rFromHeight = (eyeHeightPx * clearance) / 1.5;
        r = Math.max(rFromWidth, rFromHeight) + strokeW * 0.5;
    } else {
        r = Math.min(syncW, syncH) * 0.09;
    }

    if (!Number.isFinite(r) || r <= 0) return;

    const cx = syncW * 0.5;
    const cy = syncH * 0.5;
    const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
    const points = angles.map((a) => {
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');

    tri.setAttribute('points', points);
    tri.setAttribute('stroke-width', String(strokeW));
    tri.setAttribute('fill', 'none');
    tri.removeAttribute('stroke');
}

function showGodModeTriangle() {
    ensureGodTriangleLayer();
    const layer = getGodTriangleLayerEl();
    if (!layer) return;
    layer.classList.add('god-triangle-visible');
    layer.setAttribute('aria-hidden', 'false');
    syncGodModeTriangleSize();
}

function hideGodModeTriangle() {
    const layer = getGodTriangleLayerEl();
    if (!layer) return;
    layer.classList.remove('god-triangle-visible');
    layer.setAttribute('aria-hidden', 'true');
}

window.addEventListener('resize', () => {
    if (getGodTriangleLayerEl()?.classList.contains('god-triangle-visible')) {
        syncGodModeTriangleSize();
    }
}, { passive: true });

globalThis.syncGodModeTriangleSize = syncGodModeTriangleSize;
globalThis.syncPanopticonGodTriangleSize = syncGodModeTriangleSize;

/** One glyph per icosphere face (same set as singularity 3D). */
export const ICO_SYMBOLS = [
    '⛦', '⚛︎', '☯︎', '❖', '◉', '⧊', '☉', '⛬', '⛢', '☧',
    '☥', '♁', '∴', '△', '⊕', 'ψ', '✖', '☸', '⚖', '∞',
];

/** Rotating pupil glyphs during panopticon god mode (desktop). */
const GOD_MODE_SYMBOLS = [
    '⛦', '⚛︎', '☯︎', '❖', '◉', '⧊', '☉', '⛬', '⛢', '☧',
    '☥', '♁', '𖣂', '🜲', '🜁', '𖤓', '✖', '☸', '⚖', '∞',
];

const ICO_SYMBOL_FALLBACKS = {
    '⛦': '◆',
    '⚛︎': '◎',
    '☯︎': '☯',
    '❖': '◆',
    '◉': '●',
    '⧊': '◇',
    '☉': '○',
    '⛬': '▲',
    '⛢': '◈',
    '☧': '✚',
    '☥': '✚',
    '♁': '⊕',
    '∴': '∴',
    '△': '△',
    '⊕': '⊕',
    'ψ': 'ψ',
    '𖣂': '◈',
    '🜲': '⚗',
    '🜁': '⎔',
    '𖤓': '▣',
    '✖': '✕',
    '☸': '✦',
    '⚖': '⚖',
    '∞': '∞',
};

const ICO_SYMBOL_SAFE_FALLBACK = '◆';

function stripVariationSelectors(symbol) {
    return symbol.replace(/[\uFE0E\uFE0F]/g, '');
}

function resolveIcoSymbol(symbol) {
    if (!perf.isIOS) return symbol;
    const stripped = stripVariationSelectors(symbol);
    return ICO_SYMBOL_FALLBACKS[symbol]
        ?? ICO_SYMBOL_FALLBACKS[stripped]
        ?? stripped
        ?? ICO_SYMBOL_SAFE_FALLBACK;
}

let icoSymbolsForPlatform = null;

export function getIcoSymbolsForPlatform() {
    if (!icoSymbolsForPlatform) {
        icoSymbolsForPlatform = perf.isIOS
            ? ICO_SYMBOLS.map(resolveIcoSymbol)
            : ICO_SYMBOLS.slice();
    }
    return icoSymbolsForPlatform;
}

function getGodModeSymbolsForPlatform() {
    const pool = perf.isMobile ? ICO_SYMBOLS : GOD_MODE_SYMBOLS;
    return perf.isIOS ? pool.map(resolveIcoSymbol) : pool.slice();
}

const PANOPTICON_GOD_CLOSE_MS = 480;
const PANOPTICON_GOD_HOLD_MS = 280;
const PANOPTICON_GOD_OPEN_MS = 480;
const PANOPTICON_GOD_SYMBOL_MS = 260;
const PANOPTICON_LID_OPEN = 'M 8 50 C 28 12, 72 12, 92 50 C 72 88, 28 88, 8 50 Z';
const PANOPTICON_LID_CLOSED = 'M 8 50 L 92 50';
const PANOPTICON_CAT_MORPH_MS = 420;
const PANOPTICON_CAT_HOLD_MS = 1100;
const PANOPTICON_WAKE_PEEK_MS = 520;
const PANOPTICON_WAKE_BLINK_MS = 880;
const PANOPTICON_WAKE_BLINK_COUNT = 2;
const PANOPTICON_WAKE_YAWN_MS = 640;
const PANOPTICON_WAKE_SETTLE_MS = 360;
const PANOPTICON_WAKE_HALF_SHUT = 0.52;
const PANOPTICON_WAKE_BLINK_SHUT = 0.88;
const PANOPTICON_IDLE_COMMENT_MS = 10000;
const PANOPTICON_IDLE_COMMENT_CHANCE = 1;
const PANOPTICON_TAB_RETURN_MIN_MS = 500;
const PANOPTICON_PUPIL_R = 7;
const PANOPTICON_PUPIL_R_HIGH = 12;

let catEyePhase = null;
let catEyeStart = 0;
let catEyeAudioEl = null;

let sleepStart = 0;
let wakeStart = 0;
let lidShutNow = 0;
let wakeFromShut = 1;
let panopticonAuxId = null;
let panopticonIdleCommentTimer = null;
let panopticonCommentTimeout = null;
let panopticonTabHiddenAt = 0;
let panopticonCodeSequenceActivePrev = false;

function isPanopticonGodModeCommentary() {
    return document.body.classList.contains('god-mode');
}

function isPanopticonCodeSequenceActive() {
    if (getCipherStage() > 0) return true;
    if (getHook('isKonamiActivelyEntering')?.()) return true;
    if (getHook('isPongArmingActive')?.()) return true;
    if (getHook('isPongSessionActive')?.()) return true;
    if (godEyeSequence && godEyeSequence !== 'open') return true;
    return false;
}

function isGardenReady() {
    return document.body.classList.contains('garden-ready');
}

function canShowPanopticonComment() {
    if (!gardenHasStarted || !isGardenReady() || !panopticonEl?.classList.contains('visible')) return false;
    if (isPanopticonCodeSequenceActive()) return false;
    if (eyeMode === 'reroll' || eyeMode === 'waking') return false;
    if (document.body.classList.contains('pong-playing')) return false;
    if (document.hidden || isSingularityActive) return false;
    return true;
}

function canShowPanopticonIdleComment() {
    if (!canShowPanopticonComment()) return false;
    if (panopticonSleepWakeActive()) return false;
    return true;
}

function clearIosPanopticonCommentInlinePosition() {
    if (!perf.isIOS || !panopticonCommentEl) return;
    panopticonCommentEl.style.removeProperty('left');
    panopticonCommentEl.style.removeProperty('transform');
}

function positionPanopticonComment() {
    if (!panopticonCommentEl || !panopticonEl) return;

    const eyeRect = panopticonEl.getBoundingClientRect();

    if (perf.isIOS) {
        panopticonCommentEl.style.top = `${eyeRect.bottom + 10}px`;
        return;
    }

    const boxW = panopticonCommentEl.offsetWidth || panopticonCommentEl.scrollWidth;
    const margin = 8;
    const left = eyeRect.left + eyeRect.width / 2 - boxW / 2;
    const clampedLeft = Math.max(margin, Math.min(left, window.innerWidth - boxW - margin));

    panopticonCommentEl.style.left = `${clampedLeft}px`;
    panopticonCommentEl.style.top = `${eyeRect.bottom + 10}px`;
}

function repositionVisiblePanopticonComment() {
    if (!panopticonCommentEl?.classList.contains('visible')) return;
    positionPanopticonComment();
}

let panopticonCommentViewportBound = false;

function bindPanopticonCommentViewportSync() {
    if (panopticonCommentViewportBound || !perf.isIOS) return;
    panopticonCommentViewportBound = true;
    const vv = window.visualViewport;
    if (!vv) return;
    vv.addEventListener('resize', repositionVisiblePanopticonComment);
    vv.addEventListener('scroll', repositionVisiblePanopticonComment);
    document.getElementById('ios-scroll-shell')?.addEventListener('scroll', repositionVisiblePanopticonComment, {
        passive: true,
    });
}

const PANOPTICON_MUTE_KEY = 'entropy-garden-panopticon-muted-v1';
let panopticonMuted = false;

function loadPanopticonMutePref() {
    try {
        panopticonMuted = localStorage.getItem(PANOPTICON_MUTE_KEY) === '1';
    } catch {
        panopticonMuted = false;
    }
}

export function isPanopticonMuted() {
    return panopticonMuted;
}

export function syncPanopticonMuteButton() {
    const btn = document.getElementById('panopticon-mute-btn');
    if (!btn) return;
    btn.textContent = panopticonMuted ? 'EYE MUTED' : 'EYE SFX';
    btn.setAttribute('aria-pressed', panopticonMuted ? 'true' : 'false');
    btn.classList.toggle('is-muted', panopticonMuted);
}

export function setPanopticonMuted(muted) {
    panopticonMuted = !!muted;
    try {
        localStorage.setItem(PANOPTICON_MUTE_KEY, panopticonMuted ? '1' : '0');
    } catch {
        /* private mode */
    }
    document.body?.classList.toggle('panopticon-muted', panopticonMuted);
    syncPanopticonMuteButton();
}

export function togglePanopticonMuted() {
    setPanopticonMuted(!panopticonMuted);
    return panopticonMuted;
}

loadPanopticonMutePref();
if (document.body) {
    document.body.classList.toggle('panopticon-muted', panopticonMuted);
}

function playPanopticonCommentSfx() {
    if (panopticonMuted) return;
    playSoundOverlap(isPanopticonGodModeCommentary() ? sfx.echo : sfx.blip);
}

function showPanopticonIdleComment(text, ttlMs) {
    if (!panopticonCommentEl || !text || !canShowPanopticonIdleComment()) return;

    clearIosPanopticonCommentInlinePosition();
    syncPanopticonCommentChrome();
    playPanopticonCommentSfx();
    panopticonCommentEl.textContent = text;
    panopticonCommentEl.classList.add('visible');
    panopticonCommentEl.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
        if (!panopticonCommentEl.classList.contains('visible')) return;
        positionPanopticonComment();
    });

    const duration = ttlMs ?? commentTtlMs(text, { reducedMotion: perf.prefersReducedMotion });
    clearTimeout(panopticonCommentTimeout);
    panopticonCommentTimeout = setTimeout(() => hidePanopticonComment(), duration);
}

export function showPanopticonComment(text, ttlMs) {
    if (!panopticonCommentEl || !text || !canShowPanopticonComment()) return;

    clearIosPanopticonCommentInlinePosition();
    syncPanopticonCommentChrome();
    playPanopticonCommentSfx();
    panopticonCommentEl.textContent = text;
    panopticonCommentEl.classList.add('visible');
    positionPanopticonComment();
    panopticonCommentEl.setAttribute('aria-hidden', 'false');

    const duration = ttlMs ?? commentTtlMs(text, { reducedMotion: perf.prefersReducedMotion });
    clearTimeout(panopticonCommentTimeout);
    panopticonCommentTimeout = setTimeout(() => hidePanopticonComment(), duration);
}

const PANOPTICON_COMMENT_FADE_MS = 450;

export function hidePanopticonComment() {
    clearTimeout(panopticonCommentTimeout);
    if (!panopticonCommentEl) return;

    panopticonCommentEl.setAttribute('aria-hidden', 'true');
    if (!panopticonCommentEl.classList.contains('visible')) {
        panopticonCommentEl.classList.remove('panopticon-comment-god');
        return;
    }

    panopticonCommentEl.classList.remove('visible');

    const clearGodChrome = () => {
        panopticonCommentEl.classList.remove('panopticon-comment-god');
    };

    const onFadeEnd = (e) => {
        if (e.target !== panopticonCommentEl || e.propertyName !== 'opacity') return;
        panopticonCommentEl.removeEventListener('transitionend', onFadeEnd);
        clearTimeout(fadeFallback);
        clearGodChrome();
    };

    const fadeFallback = setTimeout(clearGodChrome, PANOPTICON_COMMENT_FADE_MS + 80);
    panopticonCommentEl.addEventListener('transitionend', onFadeEnd);
}

/** Hide idle/return bubbles when konami, pong, cipher, or god-eye sequences start. */
export function syncPanopticonCodeSequenceComments() {
    const active = isPanopticonCodeSequenceActive();
    if (active && !panopticonCodeSequenceActivePrev) {
        hidePanopticonComment();
        if (panopticonCommentEl) panopticonCommentEl.textContent = '';
    } else if (!active && panopticonCodeSequenceActivePrev) {
        if (!panopticonIdleCommentTimer) schedulePanopticonIdleCommentTimer();
    }
    panopticonCodeSequenceActivePrev = active;
}

function syncPanopticonCommentChrome() {
    if (!panopticonCommentEl) return;
    panopticonCommentEl.classList.toggle('panopticon-comment-god', isPanopticonGodModeCommentary());
}

function pickPanopticonIdleComment() {
    const pools = globalThis.lorePools;
    if (!pools) return null;
    if (isApril420()) {
        const high = pools.panopticonHighCommentsSafe;
        if (!high?.length) return null;
        return pickOne(high, pools.panopticonHighCommentsGritty || []);
    }
    if (isPanopticonGodModeCommentary()) {
        const god = pools.panopticonGodModeComments;
        return god?.length ? pickOne(god, []) : null;
    }
    const safe = pools.panopticonIdleCommentsSafe;
    if (!safe?.length) return null;
    return pickOne(safe, pools.panopticonIdleCommentsGritty || []);
}

function pickPanopticonReturnComment() {
    const pools = globalThis.lorePools;
    if (!pools) return 'missed me?';
    if (isApril420()) {
        const high = pools.panopticonHighReturnCommentsSafe;
        if (!high?.length) return 'welcome back. did you forget where you were';
        return pickOne(high, pools.panopticonHighReturnCommentsGritty || []);
    }
    if (isPanopticonGodModeCommentary()) {
        const god = pools.panopticonGodModeComments;
        return god?.length ? pickOne(god, []) : 'YOU HAVE RETURNED TO THE THRESHOLD';
    }
    const safe = pools.panopticonReturnCommentsSafe;
    if (!safe?.length) return 'missed me?';
    return pickOne(safe, pools.panopticonReturnCommentsGritty || []);
}

function clearPanopticonIdleCommentTimer() {
    clearTimeout(panopticonIdleCommentTimer);
    panopticonIdleCommentTimer = null;
}

export function startPanopticonIdleComments() {
    bindPanopticonCommentViewportSync();
    resetPanopticonIdleCommentTimer();
}

function schedulePanopticonIdleCommentTimer() {
    clearPanopticonIdleCommentTimer();

    if (!gardenHasStarted || !isGardenReady()) return;

    panopticonIdleCommentTimer = setTimeout(() => {
        syncPanopticonCodeSequenceComments();
        if (!isPanopticonCodeSequenceActive() && canShowPanopticonIdleComment()) {
            if (Math.random() < PANOPTICON_IDLE_COMMENT_CHANCE) {
                const text = pickPanopticonIdleComment();
                if (text) showPanopticonIdleComment(text);
            }
        }

        schedulePanopticonIdleCommentTimer();
    }, PANOPTICON_IDLE_COMMENT_MS);
}

export function resetPanopticonIdleCommentTimer() {
    syncPanopticonCodeSequenceComments();
    schedulePanopticonIdleCommentTimer();
}

export function handlePanopticonVisibilityChange(hidden) {
    if (hidden) {
        panopticonTabHiddenAt = performance.now();
        hidePanopticonComment();
        clearPanopticonIdleCommentTimer();
        return;
    }

    if (!gardenHasStarted) return;

    const awayMs = panopticonTabHiddenAt ? performance.now() - panopticonTabHiddenAt : 0;
    panopticonTabHiddenAt = 0;

    if (awayMs >= PANOPTICON_TAB_RETURN_MIN_MS) {
        const text = pickPanopticonReturnComment();
        requestAnimationFrame(() => {
            if (canShowPanopticonComment()) showPanopticonComment(text);
        });
    }

    resetPanopticonIdleCommentTimer();
}

function panopticonSleepWakeActive() {
    return eyeMode === 'sleeping' || eyeMode === 'waking';
}

function cancelPanopticonAuxLoop() {
    if (panopticonAuxId != null) {
        cancelAnimationFrame(panopticonAuxId);
        panopticonAuxId = null;
    }
}

function schedulePanopticonAuxLoop() {
    if (panopticonAuxId != null) return;

    const frame = () => {
        panopticonAuxId = null;
        if (!panopticonSleepWakeActive()) return;

        updatePanopticonVisibility();
        if (!animatePanopticonGodEye(performance.now())) {
            updatePanopticonSleepWake(performance.now());
        }

        if (panopticonSleepWakeActive()) {
            panopticonAuxId = requestAnimationFrame(frame);
        }
    };

    panopticonAuxId = requestAnimationFrame(frame);
}

function panopticonSleepCloseMs() {
    return perf.prefersReducedMotion ? 300 : PANOPTICON_GOD_CLOSE_MS;
}

function panopticonWakeTimings() {
    const rm = perf.prefersReducedMotion;
    return {
        peekMs: rm ? 280 : PANOPTICON_WAKE_PEEK_MS,
        blinkMs: rm ? 480 : PANOPTICON_WAKE_BLINK_MS,
        yawnMs: rm ? 320 : PANOPTICON_WAKE_YAWN_MS,
        settleMs: rm ? 180 : PANOPTICON_WAKE_SETTLE_MS,
    };
}

function applyPanopticonSleepVisual(shut, breatheY = 0) {
    const clamped = Math.max(0, Math.min(1, shut));
    applyPanopticonLidShut(clamped);
    if (panopticonInnerEl) {
        panopticonInnerEl.style.transform = breatheY ? `translateY(${breatheY}px)` : '';
    }
}

/** Round-cap arch for yawn (single smooth curve, same stroke/fill as normal lid). */
function panopticonYawnArchPath(intensity) {
    const k = smoothstep(Math.max(0, Math.min(1, intensity)));
    if (k < 0.001) return PANOPTICON_LID_CLOSED;

    const rise = k * 26;
    const yMid = 50;
    const yPeak = yMid - rise;
    const yLower = yMid + 3 + k * 5;
    return `M 8 ${yMid} C 26 ${yPeak}, 74 ${yPeak}, 92 ${yMid} C 74 ${yLower}, 26 ${yLower}, 8 ${yMid} Z`;
}

function applyPanopticonSocketPath(path, gazeStrength = 0) {
    panopticonLidEl?.setAttribute('d', path);

    if (path === PANOPTICON_LID_CLOSED) {
        panopticonClipPathEl?.setAttribute('d', 'M 8 50 L 92 50 L 92 50 L 8 50 Z');
        if (panopticonGazeEl) panopticonGazeEl.style.opacity = '0';
        return;
    }

    panopticonClipPathEl?.setAttribute('d', path);
    if (panopticonGazeEl) {
        panopticonGazeEl.style.opacity = String(Math.min(1, Math.max(0, gazeStrength)));
    }
}

function applyPanopticonYawnShape(progress) {
    const p = Math.max(0, Math.min(1, progress));

    if (p < 0.28) {
        const shut = PANOPTICON_WAKE_HALF_SHUT + (1 - PANOPTICON_WAKE_HALF_SHUT) * smoothstep(p / 0.28);
        lidShutNow = shut;
        applyPanopticonLidShut(shut);
        if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
        return;
    }

    if (p < 0.72) {
        const archPhase = (p - 0.28) / 0.44;
        const intensity = Math.sin(Math.PI * archPhase);
        const path = panopticonYawnArchPath(intensity);
        lidShutNow = 1 - intensity * 0.82;
        applyPanopticonSocketPath(path, intensity * 0.45);
        if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
        return;
    }

    const shut = 1 - smoothstep((p - 0.72) / 0.28) * (1 - PANOPTICON_WAKE_HALF_SHUT);
    lidShutNow = shut;
    applyPanopticonLidShut(shut);
    if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
}

function easePanopticonWakeGaze() {
    panopticonGazeX += (0 - panopticonGazeX) * 0.18;
    panopticonGazeY += (0 - panopticonGazeY) * 0.18;
    panopticonGazeEl?.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);
}

let panopticonGodActive = false;
let godEyeSequence = null;
let godEyeSeqStart = 0;
let godSymbolBag = null;
let godSymbolTick = 0;

function resetGodSymbolBag() {
    godSymbolBag = createBag(getGodModeSymbolsForPlatform());
}

function drawGodSymbol() {
    if (!godSymbolBag) resetGodSymbolBag();
    return godSymbolBag();
}

const PANOPTICON_MAX_GAZE = 14;
const PANOPTICON_REROLL_MS = 2800;
let panopticonTargetX = 0;
let panopticonTargetY = 0;
let panopticonGazeX = 0;
let panopticonGazeY = 0;
let rerollStart = 0;
let rerollUntil = 0;
let rerollSettleTarget = 0;
let angularVelocity = 0;
let rerollInitialVelocity = 0;
let rerollPhase = 'active';
let landStart = 0;
let landFromAngle = 0;
let landFromGazeX = 0;
let landFromGazeY = 0;

const PANOPTICON_LAND_MS = 500;
const PANOPTICON_EYEROLL_MS = 1300;
const PANOPTICON_STARE_MS = 2500;
let eyerollStart = 0;
let eyerollFromX = 0;
let eyerollFromY = 0;
let stareStart = 0;
let stareFromX = 0;
let stareFromY = 0;

function normalizeMod360(angle) {
    return ((angle % 360) + 360) % 360;
}

function nearestHorizontal(angle) {
    return Math.round(angle / 360) * 360;
}

function smoothstep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
}

function rerollWobbleEnvelope(elapsedSec, durationSec, speedNorm) {
    const rampOut = smoothstep(Math.max(0, (durationSec - elapsedSec) / 0.65));
    const inertiaBlend = 0.45 + (1 - speedNorm) * 0.55;
    return inertiaBlend * rampOut;
}

function applyPanopticonGazeEase() {
    const ease = perf.prefersReducedMotion ? 0.08 : 0.14;
    panopticonGazeX += (panopticonTargetX - panopticonGazeX) * ease;
    panopticonGazeY += (panopticonTargetY - panopticonGazeY) * ease;
    panopticonGazeEl?.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);
}

function setPanopticonCursor(clientX, clientY) {
    if (!panopticonEl || !panopticonEl.classList.contains('visible')) return;
    if (eyeMode !== 'idle' && eyeMode !== 'eyeroll' && eyeMode !== 'stare') return;

    const rect = panopticonInnerEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const influence = Math.min(len / (Math.min(window.innerWidth, window.innerHeight) * 0.4), 1);
    const maxGaze = perf.prefersReducedMotion ? PANOPTICON_MAX_GAZE * 0.45 : PANOPTICON_MAX_GAZE;

    panopticonTargetX = (dx / len) * maxGaze * influence;
    panopticonTargetY = (dy / len) * maxGaze * influence;
}

if (panopticonEl) {
    window.addEventListener('mousemove', (e) => setPanopticonCursor(e.clientX, e.clientY));
    const onTouchGaze = (e) => {
        const t = e.touches?.[0];
        if (t) setPanopticonCursor(t.clientX, t.clientY);
    };
    window.addEventListener('touchstart', onTouchGaze, { passive: true });
    window.addEventListener('touchmove', onTouchGaze, { passive: true });
}

function enterPanopticonReroll() {
    cancelPanopticonCatEye();
    const mod = normalizeMod360(eyeAngle);
    const minSpins = perf.prefersReducedMotion ? 2 : 3;
    const extraSpins = perf.prefersReducedMotion ? 0 : Math.floor(Math.random() * 2);
    const toHorizontal = mod === 0 ? 0 : 360 - mod;
    rerollSettleTarget = nearestHorizontal(eyeAngle + toHorizontal + (minSpins + extraSpins) * 360);

    angularVelocity = perf.prefersReducedMotion ? 16 : 24 + Math.random() * 8;
    rerollInitialVelocity = angularVelocity;
    rerollPhase = 'active';

    eyeMode = 'reroll';
    rerollStart = performance.now();
    rerollUntil = rerollStart + (perf.prefersReducedMotion ? 1600 : PANOPTICON_REROLL_MS);

    panopticonEl?.classList.remove('flash-anim', 'dizzy');
    if (panopticonEl) {
        void panopticonEl.offsetWidth;
        panopticonEl.classList.add('flash-anim', 'dizzy');
    }
}

export function triggerPanopticonReroll() {
    if (!panopticonEl) return;
    enterPanopticonReroll();
}

export function triggerPanopticonEyeRoll() {
    if (!panopticonEl || !panopticonGazeEl) return;
    if (eyeMode === 'reroll') return;

    eyerollFromX = panopticonGazeX;
    eyerollFromY = panopticonGazeY;
    eyerollStart = performance.now();
    eyeMode = 'eyeroll';
}

export function triggerPanopticonCenterStare() {
    if (!panopticonEl || !panopticonGazeEl) return;
    if (eyeMode === 'reroll') return;

    stareFromX = panopticonGazeX;
    stareFromY = panopticonGazeY;
    stareStart = performance.now();
    eyeMode = 'stare';
}

export function triggerPanopticonSleep() {
    if (!panopticonEl) return;
    updatePanopticonVisibility();
    if (!panopticonEl.classList.contains('visible')) return;
    if (panopticonGodActive || godEyeSequence) return;
    if (eyeMode === 'reroll' || eyeMode === 'sleeping') return;
    cancelPanopticonCatEye();
    hidePanopticonComment();
    eyeMode = 'sleeping';
    const closeMs = panopticonSleepCloseMs();
    sleepStart = document.hidden ? performance.now() - closeMs : performance.now();
    panopticonEl.classList.add('panopticon-sleeping');
    schedulePanopticonAuxLoop();
    updatePanopticonSleepWake(performance.now());
}

export function triggerPanopticonWake() {
    if (!panopticonEl) return;
    if (eyeMode !== 'sleeping') return;
    resetPanopticonIdleCommentTimer();
    wakeFromShut = lidShutNow;
    eyeMode = 'waking';
    wakeStart = performance.now();
    schedulePanopticonAuxLoop();
    updatePanopticonSleepWake(performance.now());
}

function onCatEyeAudioEnded() {
    if (catEyePhase !== 'hold') return;
    catEyePhase = 'out';
    catEyeStart = performance.now();
    catEyeAudioEl = null;
}

export function triggerPanopticonCatEye(audioEl = null) {
    if (!panopticonEl?.classList.contains('visible')) return;
    if (godEyeSequence || panopticonGodActive) return;
    if (eyeMode === 'reroll') return;

    if (catEyeAudioEl && catEyeAudioEl !== audioEl) {
        catEyeAudioEl.removeEventListener('ended', onCatEyeAudioEnded);
    }
    catEyeAudioEl = audioEl || null;
    if (catEyeAudioEl) {
        catEyeAudioEl.addEventListener('ended', onCatEyeAudioEnded, { once: true });
    }

    catEyePhase = 'in';
    catEyeStart = performance.now();
}

export function isApril420() {
    try {
        const params = new URLSearchParams(globalThis.location?.search || '');
        if (params.has('420') || params.get('preview420') === '1') return true;
    } catch {
        /* non-browser */
    }
    const now = new Date();
    return now.getMonth() === 3 && now.getDate() === 20;
}

function syncPanopticonApril420() {
    const on = isApril420();
    document.body.classList.toggle('april-420', on);
    panopticonEl?.classList.toggle('panopticon-high', on);
    if (panopticonPupilEl) {
        panopticonPupilEl.setAttribute('r', String(on ? PANOPTICON_PUPIL_R_HIGH : PANOPTICON_PUPIL_R));
    }
}

function animatePanopticonHighIdle(now) {
    const t = now * 0.001;
    const droop = 0.34 + Math.sin(t * 1.2) * 0.05;
    applyPanopticonLidShut(droop);

    const driftX = Math.sin(t * 0.7) * 4 + Math.sin(t * 1.35) * 2;
    const driftY = Math.cos(t * 0.55) * 3 + Math.sin(t * 0.95) * 2;
    const ease = perf.prefersReducedMotion ? 0.07 : 0.05;

    panopticonGazeX += (panopticonTargetX + driftX - panopticonGazeX) * ease;
    panopticonGazeY += (panopticonTargetY + driftY - panopticonGazeY) * ease;
    panopticonGazeEl?.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);
    panopticonInnerEl.style.transform = perf.prefersReducedMotion
        ? ''
        : `rotate(${Math.sin(t * 0.4) * 2.5}deg)`;
}

export function updatePanopticonVisibility() {
    if (!panopticonEl) return;

    const singularity = document.getElementById('singularity-overlay');
    const boss = document.getElementById('boss-key-overlay');
    const hidden = singularity?.style.display === 'flex' || boss?.classList.contains('active');
    panopticonEl.classList.toggle('visible', gardenHasStarted && !hidden);
    syncPanopticonApril420();
}

function horizontalOffset(angle) {
    const mod = normalizeMod360(angle);
    return mod > 180 ? mod - 360 : mod;
}

function finishPanopticonReroll() {
    eyeMode = 'idle';
    eyeAngle = 0;
    angularVelocity = 0;
    rerollPhase = 'active';
    panopticonEl?.classList.remove('dizzy', 'flash-anim');
    if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
    panopticonGazeX += (panopticonTargetX - panopticonGazeX) * 0.2;
    panopticonGazeY += (panopticonTargetY - panopticonGazeY) * 0.2;
}

function beginPanopticonLand(displayAngle, gazeX, gazeY) {
    rerollPhase = 'land';
    landStart = performance.now();
    landFromAngle = horizontalOffset(displayAngle);
    landFromGazeX = gazeX;
    landFromGazeY = gazeY;
    angularVelocity = 0;
}

export function syncPanopticonRainbow() {
    // God-eye hues track the cipher wheel via CSS --cipher-wheel-hue-filter on #panopticon-eye.
    // HUD chrome still animates --rainbow-offset in matrix.js.
    if (panopticonRainbowGradEl) {
        panopticonRainbowGradEl.removeAttribute('gradientTransform');
    }
    const godRainbow = document.getElementById('god-mode-rainbow') ?? godModeRainbowGradEl;
    if (godRainbow) {
        godRainbow.removeAttribute('gradientTransform');
    }
}

function panopticonLidPath(shut) {
    if (shut >= 0.98) return PANOPTICON_LID_CLOSED;

    const yTop = 12 + 38 * shut;
    const yBot = 88 - 38 * shut;
    return `M 8 50 C 28 ${yTop}, 72 ${yTop}, 92 50 C 72 ${yBot}, 28 ${yBot}, 8 50 Z`;
}

function setPanopticonScaleAtCenter(el, sx, sy, cx = 50, cy = 50) {
    if (!el) return;

    if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) {
        el.removeAttribute('transform');
        return;
    }

    el.setAttribute('transform', `translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
}

function resetPanopticonCatMorph() {
    panopticonIrisOuterEl?.removeAttribute('transform');
    panopticonIrisMidEl?.removeAttribute('transform');
    panopticonPupilEl?.removeAttribute('transform');
    panopticonIrisOuterEl?.style.removeProperty('opacity');
    panopticonIrisMidEl?.style.removeProperty('opacity');
}

function applyPanopticonCatMorph(morph) {
    const m = Math.max(0, Math.min(1, morph));

    if (m <= 0.001) {
        resetPanopticonCatMorph();
        return;
    }

    setPanopticonScaleAtCenter(panopticonIrisOuterEl, 1 - m * 0.48, 1 + m * 0.18);
    setPanopticonScaleAtCenter(panopticonIrisMidEl, 1 - m * 0.58, 1 + m * 0.42);
    setPanopticonScaleAtCenter(panopticonPupilEl, 1 - m * 0.68, 1 + m * 2.8);

    if (panopticonIrisOuterEl) {
        panopticonIrisOuterEl.style.opacity = String(0.55 * (1 - m));
    }
    if (panopticonIrisMidEl) {
        panopticonIrisMidEl.style.opacity = String(0.85 * (1 - m));
    }
}

function cancelPanopticonCatEye() {
    if (catEyeAudioEl) {
        catEyeAudioEl.removeEventListener('ended', onCatEyeAudioEnded);
        catEyeAudioEl = null;
    }
    catEyePhase = null;
    resetPanopticonCatMorph();
}

function animatePanopticonCatEye(now) {
    if (!catEyePhase) return;

    const morphMs = perf.prefersReducedMotion ? 280 : PANOPTICON_CAT_MORPH_MS;
    const holdMs = perf.prefersReducedMotion ? 520 : PANOPTICON_CAT_HOLD_MS;
    const elapsed = now - catEyeStart;

    if (catEyePhase === 'in') {
        applyPanopticonCatMorph(elapsed / morphMs);
        if (elapsed >= morphMs) {
            catEyePhase = 'hold';
            catEyeStart = now;
        }
        return;
    }

    if (catEyePhase === 'hold') {
        applyPanopticonCatMorph(1);
        if (catEyeAudioEl) {
            const d = catEyeAudioEl.duration;
            if (
                catEyeAudioEl.ended
                || (Number.isFinite(d) && d > 0 && catEyeAudioEl.currentTime >= d - 0.05)
                || elapsed > 15000
            ) {
                onCatEyeAudioEnded();
            }
            return;
        }
        if (elapsed >= holdMs) {
            catEyePhase = 'out';
            catEyeStart = now;
        }
        return;
    }

    if (catEyePhase === 'out') {
        applyPanopticonCatMorph(1 - smoothstep(Math.min(1, elapsed / morphMs)));
        if (elapsed >= morphMs) cancelPanopticonCatEye();
    }
}

function resetPanopticonLidGeometry() {
    cancelPanopticonCatEye();
    cancelPanopticonAuxLoop();
    panopticonEl?.classList.remove('panopticon-sleeping');
    lidShutNow = 0;
    panopticonLidEl?.setAttribute('d', PANOPTICON_LID_OPEN);
    panopticonClipPathEl?.setAttribute('d', PANOPTICON_LID_OPEN);
    if (panopticonGazeEl) panopticonGazeEl.style.opacity = '1';
    if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
}

function applyPanopticonLidShut(shut) {
    const path = panopticonLidPath(shut);
    panopticonLidEl?.setAttribute('d', path);

    if (shut >= 0.98) {
        panopticonClipPathEl?.setAttribute('d', 'M 8 50 L 92 50 L 92 50 L 8 50 Z');
        if (panopticonGazeEl) panopticonGazeEl.style.opacity = '0';
        return;
    }

    panopticonClipPathEl?.setAttribute('d', path);
    if (panopticonGazeEl) {
        const fade = shut <= 0.45 ? 1 : 1 - smoothstep((shut - 0.45) / 0.4);
        panopticonGazeEl.style.opacity = String(fade);
    }
}

function resetPanopticonGodStyling() {
    panopticonEl?.classList.remove('god-active', 'god-rainbow');
    hideGodModeTriangle();
    if (panopticonPupilEl) panopticonPupilEl.style.display = '';
    if (panopticonGodPupilEl) {
        panopticonGodPupilEl.style.display = 'none';
        resetGodPupilPosition(panopticonGodPupilEl);
    }
}

function resetPanopticonNormalPupil() {
    resetPanopticonGodStyling();
    resetPanopticonLidGeometry();
}

function enablePanopticonGodPupil() {
    panopticonEl?.classList.add('god-active', 'god-rainbow');
    showGodModeTriangle();
    if (panopticonPupilEl) panopticonPupilEl.style.display = 'none';
    if (panopticonGodPupilEl) {
        applyGodPupilSymbol(panopticonGodPupilEl, drawGodSymbol());
        panopticonGodPupilEl.style.display = 'block';
    }
    document.dispatchEvent(new CustomEvent('panopticon-god-active'));
    requestAnimationFrame(() => {
        syncGodModeTriangleSize();
        requestAnimationFrame(syncGodModeTriangleSize);
    });
}

export function setPanopticonGodMode(active) {
    if (active) {
        cancelPanopticonCatEye();
        panopticonGodActive = true;
        godEyeSequence = 'closing';
        godEyeSeqStart = performance.now();
        resetGodSymbolBag();
        godSymbolTick = 0;
        syncPanopticonCodeSequenceComments();
        return;
    }

    panopticonGodActive = false;
    if (godEyeSequence === 'open') {
        godEyeSequence = 'deactivating';
        godEyeSeqStart = performance.now();
        syncPanopticonCodeSequenceComments();
        return;
    }

    resetPanopticonNormalPupil();
    godEyeSequence = null;
    syncPanopticonCodeSequenceComments();
}

function animatePanopticonGodEye(now) {
    if (!godEyeSequence || !panopticonEl) return false;

    const closeMs = perf.prefersReducedMotion ? 300 : PANOPTICON_GOD_CLOSE_MS;
    const holdMs = perf.prefersReducedMotion ? 140 : PANOPTICON_GOD_HOLD_MS;
    const openMs = perf.prefersReducedMotion ? 300 : PANOPTICON_GOD_OPEN_MS;
    const elapsed = now - godEyeSeqStart;

    syncPanopticonRainbow();
    panopticonInnerEl.style.transform = '';

    if (godEyeSequence === 'closing') {
        const shut = smoothstep(Math.min(1, elapsed / closeMs));
        applyPanopticonLidShut(shut);
        applyPanopticonGazeEase();

        if (elapsed >= closeMs) {
            panopticonEl.classList.add('god-rainbow');
            godEyeSequence = 'closed';
            godEyeSeqStart = now;
        }
        return true;
    }

    if (godEyeSequence === 'closed') {
        applyPanopticonLidShut(1);
        panopticonEl.classList.add('god-rainbow');
        applyPanopticonGazeEase();

        if (elapsed >= holdMs) {
            godEyeSequence = 'opening';
            godEyeSeqStart = now;
        }
        return true;
    }

    if (godEyeSequence === 'opening') {
        const shut = 1 - smoothstep(Math.min(1, elapsed / openMs));
        applyPanopticonLidShut(shut);
        panopticonEl.classList.add('god-rainbow');
        applyPanopticonGazeEase();

        if (elapsed >= openMs) {
            enablePanopticonGodPupil();
            godEyeSequence = 'open';
            godSymbolTick = now;
        }
        return true;
    }

    if (godEyeSequence === 'open' && panopticonGodActive) {
        applyPanopticonLidShut(0);
        syncPanopticonRainbow();
        syncGodModeTriangleSize();

        if (now - godSymbolTick >= (perf.prefersReducedMotion ? 380 : PANOPTICON_GOD_SYMBOL_MS)) {
            if (panopticonGodPupilEl) {
                applyGodPupilSymbol(panopticonGodPupilEl, drawGodSymbol());
            }
            godSymbolTick = now;
        }

        applyPanopticonGazeEase();
        return true;
    }

    if (godEyeSequence === 'deactivating') {
        if (elapsed < closeMs) {
            const shut = smoothstep(elapsed / closeMs);
            applyPanopticonLidShut(shut);
            applyPanopticonGazeEase();
            return true;
        }

        if (elapsed < closeMs + holdMs) {
            applyPanopticonLidShut(1);
            resetPanopticonGodStyling();
            applyPanopticonGazeEase();
            return true;
        }

        const openElapsed = elapsed - closeMs - holdMs;
        const shut = 1 - smoothstep(Math.min(1, openElapsed / openMs));
        applyPanopticonLidShut(shut);
        applyPanopticonGazeEase();

        if (openElapsed >= openMs) {
            resetPanopticonNormalPupil();
            godEyeSequence = null;
        }
        return true;
    }

    return false;
}

/** @returns {boolean} true when sleep/wake consumed this frame */
function updatePanopticonSleepWake(now) {
    if (!panopticonGazeEl || !panopticonInnerEl) return false;

    if (eyeMode === 'sleeping') {
        const closeMs = panopticonSleepCloseMs();
        const elapsed = now - sleepStart;

        if (elapsed >= closeMs) {
            lidShutNow = 1;
            applyPanopticonLidShut(1);
            if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
            return true;
        }

        const shut = smoothstep(elapsed / closeMs);
        lidShutNow = shut;
        applyPanopticonLidShut(shut);
        if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
        return true;
    }

    if (eyeMode === 'waking') {
        const elapsed = now - wakeStart;
        const { peekMs, blinkMs, yawnMs, settleMs } = panopticonWakeTimings();
        easePanopticonWakeGaze();

        if (elapsed < peekMs) {
            const t = smoothstep(elapsed / peekMs);
            const shut = wakeFromShut + (PANOPTICON_WAKE_HALF_SHUT - wakeFromShut) * t;
            lidShutNow = shut;
            applyPanopticonSleepVisual(shut);
            return true;
        }

        const blinkElapsed = elapsed - peekMs;
        if (blinkElapsed < blinkMs) {
            const wave = Math.abs(Math.sin((blinkElapsed / blinkMs) * PANOPTICON_WAKE_BLINK_COUNT * Math.PI));
            const shut = PANOPTICON_WAKE_HALF_SHUT
                + (PANOPTICON_WAKE_BLINK_SHUT - PANOPTICON_WAKE_HALF_SHUT) * wave;
            lidShutNow = shut;
            applyPanopticonSleepVisual(shut);
            return true;
        }

        const yawnElapsed = blinkElapsed - blinkMs;
        if (yawnElapsed < yawnMs) {
            applyPanopticonYawnShape(yawnElapsed / yawnMs);
            return true;
        }

        const settleElapsed = yawnElapsed - yawnMs;
        if (settleElapsed < settleMs) {
            const shut = PANOPTICON_WAKE_HALF_SHUT * (1 - smoothstep(settleElapsed / settleMs));
            lidShutNow = shut;
            applyPanopticonSleepVisual(shut);
            return true;
        }

        lidShutNow = 0;
        applyPanopticonSleepVisual(0);
        eyeMode = 'idle';
        panopticonEl?.classList.remove('panopticon-sleeping');
        cancelPanopticonAuxLoop();
        if (!panopticonIdleCommentTimer) schedulePanopticonIdleCommentTimer();
        return true;
    }

    return false;
}

export function animatePanopticon() {
    if (!panopticonGazeEl || !panopticonInnerEl) return;

    updatePanopticonVisibility();
    if (!panopticonEl?.classList.contains('visible')) return;

    if (panopticonEl.classList.contains('god-rainbow')) {
        syncPanopticonRainbow();
    }

    if (animatePanopticonGodEye(performance.now())) return;

    if (updatePanopticonSleepWake(performance.now())) return;

    if (panopticonEl.classList.contains('pong-active')) return;

    animatePanopticonCatEye(performance.now());

    if (eyeMode === 'eyeroll') {
        if (isApril420()) applyPanopticonLidShut(0);
        const elapsed = performance.now() - eyerollStart;
        const duration = perf.prefersReducedMotion ? 900 : PANOPTICON_EYEROLL_MS;
        const p = Math.min(1, elapsed / duration);
        const rollTargetX = 5;
        const rollTargetY = -14;

        let towardRoll = 0;
        if (p <= 0.38) towardRoll = smoothstep(p / 0.38);
        else if (p <= 0.58) towardRoll = 1;
        else towardRoll = 1 - smoothstep((p - 0.58) / 0.42);

        const rolledX = eyerollFromX + (rollTargetX - eyerollFromX) * towardRoll;
        const rolledY = eyerollFromY + (rollTargetY - eyerollFromY) * towardRoll;
        const returnT = p > 0.58 ? smoothstep((p - 0.58) / 0.42) : 0;

        panopticonGazeX = rolledX + (panopticonTargetX - rolledX) * returnT;
        panopticonGazeY = rolledY + (panopticonTargetY - rolledY) * returnT;
        panopticonInnerEl.style.transform = '';
        panopticonGazeEl.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);

        if (p >= 1) eyeMode = 'idle';
        return;
    }

    if (eyeMode === 'stare') {
        if (isApril420()) applyPanopticonLidShut(0);
        const elapsed = performance.now() - stareStart;
        const duration = perf.prefersReducedMotion ? 1800 : PANOPTICON_STARE_MS;
        const arriveT = smoothstep(Math.min(1, elapsed / 320));
        const leaveStart = duration * 0.62;
        const leaveT = elapsed > leaveStart ? smoothstep((elapsed - leaveStart) / (duration - leaveStart)) : 0;

        if (leaveT === 0) {
            panopticonGazeX = stareFromX * (1 - arriveT);
            panopticonGazeY = stareFromY * (1 - arriveT);
        } else {
            panopticonGazeX = panopticonTargetX * leaveT;
            panopticonGazeY = panopticonTargetY * leaveT;
        }

        panopticonInnerEl.style.transform = '';
        panopticonGazeEl.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);

        if (elapsed >= duration) eyeMode = 'idle';
        return;
    }

    if (eyeMode === 'reroll') {
        if (isApril420()) applyPanopticonLidShut(0);
        const now = performance.now();

        if (rerollPhase === 'land') {
            const landMs = perf.prefersReducedMotion ? 320 : PANOPTICON_LAND_MS;
            const landT = smoothstep((now - landStart) / landMs);
            const angle = landFromAngle * (1 - landT);

            panopticonInnerEl.style.transform = landT < 1 ? `rotate(${angle}deg)` : '';
            panopticonGazeX = landFromGazeX * (1 - landT);
            panopticonGazeY = landFromGazeY * (1 - landT);
            panopticonGazeEl.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);

            if (landT >= 1) finishPanopticonReroll();
            return;
        }

        const elapsed = now - rerollStart;
        const duration = rerollUntil - rerollStart;
        const t = elapsed / 1000;
        const durationSec = duration / 1000;

        eyeAngle += angularVelocity;
        angularVelocity *= perf.prefersReducedMotion ? 0.965 : 0.978;

        const speedNorm = rerollInitialVelocity > 0
            ? Math.min(1, Math.abs(angularVelocity) / rerollInitialVelocity)
            : 0;
        const envelope = rerollWobbleEnvelope(t, durationSec, speedNorm);

        const settleT = speedNorm < 0.1 && elapsed > duration * 0.4
            ? smoothstep((elapsed - duration * 0.4) / (duration * 0.6))
            : 0;
        const baseAngle = eyeAngle + (rerollSettleTarget - eyeAngle) * settleT * 0.15;

        const wobbleDeg =
            Math.sin(t * 8.5) * 13 * envelope +
            Math.sin(t * 12.8) * 5.5 * envelope +
            angularVelocity * 1.25;
        const displayAngle = baseAngle + wobbleDeg;
        panopticonInnerEl.style.transform = `rotate(${displayAngle}deg)`;

        const wobbleX = (Math.sin(t * 11.2) * 7.5 + Math.cos(t * 7.8) * 5) * envelope;
        const wobbleY = (Math.cos(t * 9.8) * 7.5 + Math.sin(t * 7.1) * 5) * envelope;
        const gazeEase = perf.prefersReducedMotion ? 0.08 : 0.11;
        panopticonGazeX += (0 - panopticonGazeX) * gazeEase;
        panopticonGazeY += (0 - panopticonGazeY) * gazeEase;
        const gazeX = panopticonGazeX + wobbleX;
        const gazeY = panopticonGazeY + wobbleY;
        panopticonGazeEl.setAttribute('transform', `translate(${gazeX}, ${gazeY})`);

        const readyToLand = elapsed > 700 && Math.abs(angularVelocity) < 0.4;
        const timedOut = now >= rerollUntil;

        if (readyToLand || timedOut) {
            beginPanopticonLand(displayAngle, gazeX, gazeY);
        }
        return;
    }

    if (
        isApril420() &&
        eyeMode === 'idle' &&
        !panopticonGodActive &&
        !panopticonEl.classList.contains('pong-active')
    ) {
        animatePanopticonHighIdle(performance.now());
        return;
    }

    panopticonInnerEl.style.transform = '';
    applyPanopticonGazeEase();
}


export function playMeow() {
    triggerPanopticonCatEye(sfx.meow);
    playSound(sfx.meow);
}
