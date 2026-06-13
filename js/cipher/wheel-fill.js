/**
 * Detects blank / tofu cipher wheel slots and refills them from a render-tested pool.
 * Raster tests use an offscreen canvas (not the game canvas).
 */
import {
    FULL_MATRIX_CHARS,
    HEBREW_CIPHER_CHARS,
    CIPHER_ARABIC,
    CIPHER_TIBETAN,
    CIPHER_KANNADA,
    CIPHER_NUMERALS_LITE,
    CIPHER_LATIN,
    CIPHER_MATH_DECORATIVE,
    CIPHER_BMP_SAFE_EXTRA,
    CIPHER_VAI,
    CIPHER_BAYBAYIN,
    CIPHER_CHEROKEE,
} from '../data/cipher-glyphs.data.js';
import { usesIosCipherGlyphs } from '../core/shared.js';

const IOS_CIPHER_CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
    '∑∫∆∞≈±×÷√∧∨∩∪∴∵∼≠≤≥⊕⊗⊥─□△▽◇○◎★☆♪♀♂☼' +
    'αβγδεζηθικλμνξοπρστυφχψω' +
    'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЮЯ' +
    'アイウエオカキクケコサシスセソタチツテトナニヌネノ' +
    'ハヒフヘホマミムメモヤユヨラリルレロワン' +
    '道禅空幻心理气天阴阳' +
    HEBREW_CIPHER_CHARS +
    CIPHER_ARABIC +
    CIPHER_TIBETAN +
    CIPHER_KANNADA +
    CIPHER_NUMERALS_LITE +
    '!?@#$%&*_+=<>[]{}|/~';

/** WebKit-safe pool — drops scripts that often render as numbered Last Resort boxes. */
const IOS_CIPHER_SAFE =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
    '∑∫∆∞≈±×÷√∧∨∩∪∴∵∼≠≤≥⊕⊗⊥─□△▽◇○◎★☆♪♀♂☼' +
    'αβγδεζηθικλμνξοπρστυφχψω' +
    'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЮЯ' +
    'アイウエオカキクケコサシスセソタチツテトナニヌネノ' +
    'ハヒフヘホマミムメモヤユヨラリルレロワン' +
    '道禅空幻心理气天阴阳' +
    CIPHER_ARABIC +
    CIPHER_KANNADA +
    CIPHER_NUMERALS_LITE +
    '!?@#$%&*_+=<>[]{}|/~';

const LAST_RESORT_PROBE_CHARS =
    CIPHER_VAI + CIPHER_BAYBAYIN + CIPHER_CHEROKEE.slice(0, 16) + CIPHER_TIBETAN.slice(0, 8);

const RASTER_SIZE = 28;
const RASTER_CX = RASTER_SIZE / 2;
const RASTER_CY = RASTER_SIZE / 2;
const MIN_RENDER_POOL = 12;
const UPGRADE_CHUNK_SIZE = 60;
const UPGRADE_CHUNK_SIZE_RESTRICTIVE = 24;
const POOL_GROWTH_SCRUB_THRESHOLD = 32;
const PROBE_READBACK_BLOCK_THRESHOLD = 4;
const UPGRADE_IDLE_TIMEOUT_MS = 2000;
const UPGRADE_IDLE_TIMEOUT_RESTRICTIVE_MS = 6000;
const UPGRADE_RELIABILITY_RETRY_MS = 4500;

const ETHIOPIC_BLOCK_MIN = 0x1200;
const ETHIOPIC_BLOCK_MAX = 0x137f;

const DESKTOP_CIPHER_FALLBACK =
    CIPHER_LATIN + CIPHER_MATH_DECORATIVE + CIPHER_BMP_SAFE_EXTRA + '0123456789';

/** ASCII + BMP symbols only — used when private browsing blocks reliable exotic rendering. */
const CIPHER_STRICT_SAFE =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
    '∑∆∞≈±×÷√∧∨∩∪∴∵∼≠≤≥⊕⊗⊥─□△▽◇○◎★☆♀♂☼' +
    '♠♣♥♦←→↑↓↔⇐⇒◆●▪■▲▼✦✧✩✪✫✭✯∀∃∅∈∉' +
    '!?@#$%&*_+=<>[]{}|/~';

function detectPrivateBrowsing() {
    try {
        const key = '__eg_pb__';
        localStorage.setItem(key, '1');
        localStorage.removeItem(key);
        return false;
    } catch {
        return true;
    }
}

const privateBrowsingMode = detectPrivateBrowsing();

/** True when storage quota suggests a private window (Firefox, Chrome Incognito, etc.). */
let storageQuotaPrivateMode = privateBrowsingMode;
/** Until quota resolves, withhold Ethiopic so hex boxes never flash in private. */
let storageQuotaProbePending = !privateBrowsingMode;
let restrictiveProbeInitialized = false;

let probeCtx = null;
let desktopRenderable = null;
let iosRenderable = null;
let tofuRefBits = null;
let tofuRefFont = '';
/** True when canvas readback is persistently blocked (e.g. private Firefox). */
let canvasProbeBlocked = false;
let probeReadbackFailures = 0;
let restrictiveProbeEnv = false;
let probeSafeCharSet = null;
let upgradeReliabilityRetryTimer = null;
let reliabilityRetryCount = 0;
const MAX_RELIABILITY_RETRIES = 10;

let domProbeEl = null;
let domBaselineWidths = null;
let domBaselineFont = '';

let measureBaselines = null;
let measureBaselineFont = '';

function getRestrictiveGlyphMode() {
    return privateBrowsingMode || canvasProbeBlocked;
}

function isPrivateGlyphContext() {
    if (privateBrowsingMode) return true;
    return storageQuotaProbePending || storageQuotaPrivateMode;
}

function isEthiopicScript(ch) {
    const cp = ch.codePointAt(0);
    return cp != null && cp >= ETHIOPIC_BLOCK_MIN && cp <= ETHIOPIC_BLOCK_MAX;
}

function getProbeCtxForMeasure() {
    return getProbeCtx() || createProbeSurface();
}

/** Canvas measureText matches fillText metrics and needs no readback. */
function canvasMeasureWidth(ch, font) {
    const ctx = getProbeCtxForMeasure();
    if (!ctx) return 0;
    ctx.font = font;
    return ctx.measureText(ch).width;
}

function getMeasureBaselines(font) {
    if (measureBaselines && measureBaselineFont === font) return measureBaselines;
    measureBaselineFont = font;
    const ctx = getProbeCtxForMeasure();
    if (!ctx) {
        measureBaselines = { missing: 0, narrow: 0, wide: 0, boxRef: 0 };
        return measureBaselines;
    }
    ctx.font = font;
    const missing = ctx.measureText('\uFFFD').width;
    const narrow = ctx.measureText('i').width;
    const wide = ctx.measureText('W').width;
    let boxRef = missing;
    for (const ch of LAST_RESORT_PROBE_CHARS) {
        const w = ctx.measureText(ch).width;
        if (w > boxRef) boxRef = w;
    }
    measureBaselines = { missing, narrow, wide, boxRef };
    return measureBaselines;
}

/** Detect Last Resort numbered boxes via canvas/DOM width (no readback). */
function isLikelyNumberedFallbackMeasure(ch, font) {
    const w = canvasMeasureWidth(ch, font) || domGlyphWidth(ch, font);
    if (w <= 0) return true;
    const { missing, narrow, wide, boxRef } = getMeasureBaselines(font);
    if (missing > 0 && Math.abs(w - missing) < 0.75) return true;
    if (boxRef > wide * 1.15 && Math.abs(w - boxRef) < 1.5) return true;
    if (w > Math.max(wide * 1.55, narrow * 3.2, 11)) return true;
    return false;
}

function getDomProbeEl() {
    if (!domProbeEl && typeof document !== 'undefined') {
        domProbeEl = document.createElement('span');
        domProbeEl.setAttribute('aria-hidden', 'true');
        domProbeEl.style.cssText =
            'position:fixed;left:-9999px;top:0;visibility:hidden;white-space:nowrap;pointer-events:none;';
        document.body?.appendChild(domProbeEl);
    }
    return domProbeEl;
}

function domGlyphWidth(ch, font) {
    const el = getDomProbeEl();
    if (!el) return 0;
    el.style.font = font;
    el.textContent = ch;
    return el.getBoundingClientRect().width;
}

function getDomBaselineWidths(font) {
    if (domBaselineWidths && domBaselineFont === font) return domBaselineWidths;
    domBaselineFont = font;
    domBaselineWidths = {
        narrow: domGlyphWidth('i', font),
        wide: domGlyphWidth('W', font),
        missing: domGlyphWidth('\uFFFD', font),
    };
    return domBaselineWidths;
}

/** Detect Last Resort numbered boxes via layout width (DOM fallback). */
function isLikelyNumberedFallbackDom(ch, font) {
    return isLikelyNumberedFallbackMeasure(ch, font);
}

function getFallbackSource(ios = usesIosCipherGlyphs()) {
    if (getRestrictiveGlyphMode()) {
        return [...CIPHER_STRICT_SAFE];
    }
    return ios ? [...IOS_CIPHER_SAFE] : [...DESKTOP_CIPHER_FALLBACK];
}

/** @type {{ active: boolean, complete: boolean, font: string, ios: boolean, pendingChars: string[], pendingIndex: number, lastScrubSize: number, onPoolGrowth: ((size: number) => void) | null }} */
let upgradeState = {
    active: false,
    complete: false,
    font: '',
    ios: false,
    pendingChars: [],
    pendingIndex: 0,
    lastScrubSize: 0,
    onPoolGrowth: null,
};

function createProbeSurface() {
    const canvas = document.createElement('canvas');
    canvas.width = RASTER_SIZE;
    canvas.height = RASTER_SIZE;
    return canvas.getContext('2d', { willReadFrequently: true });
}

function getProbeCtx() {
    if (!probeCtx) {
        probeCtx = createProbeSurface();
    }
    return probeCtx;
}

function markProbeReadbackFailure() {
    probeReadbackFailures++;
    restrictiveProbeEnv = true;
    if (probeReadbackFailures >= PROBE_READBACK_BLOCK_THRESHOLD) {
        canvasProbeBlocked = true;
        tofuRefBits = null;
        tofuRefFont = '';
    }
}

function markProbeReadbackSuccess() {
    probeReadbackFailures = 0;
}

function cancelCipherPoolBackgroundUpgrade() {
    upgradeState.active = false;
    upgradeState.complete = false;
    upgradeState.pendingChars = [];
    upgradeState.pendingIndex = 0;
    upgradeState.font = '';
    upgradeState.onPoolGrowth = null;
}

function clearUpgradeReliabilityRetry() {
    if (upgradeReliabilityRetryTimer != null) {
        clearTimeout(upgradeReliabilityRetryTimer);
        upgradeReliabilityRetryTimer = null;
    }
}

function getFullSourcePool(ios) {
    const base = ios ? [...IOS_CIPHER_CHARS] : [...FULL_MATRIX_CHARS];
    if (!isPrivateGlyphContext()) return base;
    return base.filter((ch) => !isEthiopicScript(ch));
}

function getRenderablePoolRef(ios) {
    return ios ? iosRenderable : desktopRenderable;
}

function setRenderablePool(ios, pool) {
    if (ios) iosRenderable = pool;
    else desktopRenderable = pool;
}

/** Clear cached render tests (call after resize or font change). */
export function resetCipherRenderCache() {
    cancelCipherPoolBackgroundUpgrade();
    clearUpgradeReliabilityRetry();
    desktopRenderable = null;
    iosRenderable = null;
    tofuRefBits = null;
    tofuRefFont = '';
    probeSafeCharSet = null;
    canvasProbeBlocked = false;
    probeReadbackFailures = 0;
    restrictiveProbeEnv = false;
    reliabilityRetryCount = 0;
    domBaselineWidths = null;
    domBaselineFont = '';
    measureBaselines = null;
    measureBaselineFont = '';
}

/**
 * Ethiopic (U+1200–U+137F) renders as numbered hex boxes in private windows but
 * works in normal browsing. Detect private via storage quota (all browsers) and
 * Safari localStorage throw; exclude that block only while private.
 * @param {() => void} [onModeChange]
 */
export function initCipherRestrictiveProbe(onModeChange) {
    if (restrictiveProbeInitialized) return;
    restrictiveProbeInitialized = true;

    if (privateBrowsingMode) {
        storageQuotaPrivateMode = true;
        storageQuotaProbePending = false;
        return;
    }

    if (!navigator.storage?.estimate) {
        storageQuotaPrivateMode = true;
        storageQuotaProbePending = false;
        onModeChange?.();
        return;
    }

    navigator.storage.estimate()
        .then(({ quota }) => {
            storageQuotaProbePending = false;
            storageQuotaPrivateMode = quota == null || quota < 150_000_000;
            onModeChange?.();
        })
        .catch(() => {
            storageQuotaProbePending = false;
            storageQuotaPrivateMode = true;
            onModeChange?.();
        });
}

function getProbeSafeCharSet(ios = usesIosCipherGlyphs()) {
    if (!probeSafeCharSet) {
        probeSafeCharSet = new Set(getFallbackSource(ios));
    }
    return probeSafeCharSet;
}

function rasterSignatureFromCtx(ctx, ch, font) {
    ctx.clearRect(0, 0, RASTER_SIZE, RASTER_SIZE);
    ctx.font = font;
    ctx.fillStyle = '#00ff00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, RASTER_CX, RASTER_CY);
    const { data } = ctx.getImageData(0, 0, RASTER_SIZE, RASTER_SIZE);
    let pixels = 0;
    let bits = '';
    for (let y = 0; y < 14; y += 2) {
        for (let x = 0; x < 14; x += 2) {
            const a = data[((y * RASTER_SIZE + x) * 4) + 3];
            const on = a > 24 ? 1 : 0;
            pixels += on;
            bits += on;
        }
    }
    return { bits, pixels };
}

/** Try shared offscreen canvas, then a fresh surface — per-glyph, not whole-pool. */
function rasterSignature(ch, font) {
    if (canvasProbeBlocked) return { bits: '', pixels: 0 };

    const shared = getProbeCtx();
    if (shared) {
        try {
            const sig = rasterSignatureFromCtx(shared, ch, font);
            markProbeReadbackSuccess();
            return sig;
        } catch {
            /* try fresh surface */
        }
    }

    const fresh = createProbeSurface();
    if (fresh) {
        try {
            const sig = rasterSignatureFromCtx(fresh, ch, font);
            markProbeReadbackSuccess();
            restrictiveProbeEnv = true;
            return sig;
        } catch {
            /* fall through */
        }
    }

    markProbeReadbackFailure();
    return { bits: '', pixels: 0 };
}

function isUnsafeCodePoint(ch) {
    const cp = ch.codePointAt(0);
    if (cp == null) return true;
    if (cp < 0x20 || cp === 0x7f) return true;
    if (cp >= 0x80 && cp <= 0x9f) return true;
    if (cp >= 0x200b && cp <= 0x200f) return true;
    if (cp >= 0x202a && cp <= 0x202e) return true;
    if (cp === 0xfeff) return true;
    return false;
}

function isLikelyNumberedFallback(ch, font) {
    if (isLikelyNumberedFallbackMeasure(ch, font)) return true;
    if (getRestrictiveGlyphMode()) return false;
    const sig = rasterSignature(ch, font);
    const narrow = rasterSignature('i', font);
    const wide = rasterSignature('W', font);
    const maxNormal = Math.max(wide.pixels, narrow.pixels * 2, 8);
    return sig.pixels > maxNormal + 7;
}

function buildTofuRefBits(font) {
    if (tofuRefBits && tofuRefFont === font) return tofuRefBits;
    tofuRefFont = font;
    const bits = new Set(['\uFFFD', '\u{10FFFF}'].map((ch) => rasterSignature(ch, font).bits));
    const baseline = rasterSignature('n', font).pixels;
    for (const ch of LAST_RESORT_PROBE_CHARS) {
        const sig = rasterSignature(ch, font);
        if (sig.pixels > Math.max(20, baseline * 2.2)) {
            bits.add(sig.bits);
        }
    }
    tofuRefBits = bits;
    return tofuRefBits;
}

/** True when the glyph has no visible ink or draws the missing-glyph box. */
export function isRenderableCipherGlyph(ch, font) {
    if (!ch || typeof ch !== 'string') return false;
    if (isUnsafeCodePoint(ch)) return false;
    const trimmed = ch.trim();
    if (!trimmed) return false;
    if ([...ch].length !== 1) return false;

    if (isPrivateGlyphContext() && isEthiopicScript(ch)) return false;

    if (isLikelyNumberedFallbackMeasure(ch, font)) return false;

    if (getRestrictiveGlyphMode()) {
        return getProbeSafeCharSet().has(ch);
    }

    const { bits, pixels } = rasterSignature(ch, font);
    if (pixels === 0) return false;
    if (buildTofuRefBits(font).has(bits)) return false;
    if (isLikelyNumberedFallback(ch, font)) return false;
    return true;
}

function filterRenderablePool(pool, font) {
    const out = [];
    for (const ch of pool) {
        if (isRenderableCipherGlyph(ch, font)) out.push(ch);
    }
    return out;
}

/** False when canvas readback/fonts are blocked (common in private browsing). */
function isCanvasProbeReliable(font) {
    if (canvasProbeBlocked) return false;
    const known = rasterSignature('M', font);
    const missing = rasterSignature('\uFFFD', font);
    if (known.pixels === 0) return false;
    return known.bits !== missing.bits;
}

function buildRenderablePool(source, font, fallbackSource) {
    if (getRestrictiveGlyphMode()) {
        const pool = filterRenderablePool(fallbackSource, font);
        if (pool.length >= MIN_RENDER_POOL) return pool.join('');
        return [...CIPHER_STRICT_SAFE].join('');
    }
    if (canvasProbeBlocked) {
        const pool = filterRenderablePool(fallbackSource, font);
        if (pool.length >= MIN_RENDER_POOL) return pool.join('');
        return [...CIPHER_STRICT_SAFE].join('');
    }
    if (!isCanvasProbeReliable(font)) {
        return [...fallbackSource].join('');
    }
    let pool = filterRenderablePool(fallbackSource, font);
    if (pool.length >= MIN_RENDER_POOL) return pool.join('');
    if (source.length <= fallbackSource.length) {
        pool = filterRenderablePool(source, font);
        if (pool.length >= MIN_RENDER_POOL) return pool.join('');
    }
    return [...fallbackSource].join('');
}

/** Build once per font channel (desktop monospace vs iOS). */
export function ensureCipherRenderCache(font, ios = usesIosCipherGlyphs()) {
    const fallback = getFallbackSource(ios);
    if (ios) {
        if (iosRenderable) return iosRenderable;
        iosRenderable = buildRenderablePool(
            [...IOS_CIPHER_SAFE],
            font,
            fallback,
        );
        return iosRenderable;
    }
    if (desktopRenderable) return desktopRenderable;
    desktopRenderable = buildRenderablePool(
        [...DESKTOP_CIPHER_FALLBACK],
        font,
        fallback,
    );
    return desktopRenderable;
}

export function pickRenderableCipherChar(font, ios = usesIosCipherGlyphs()) {
    const pool = ensureCipherRenderCache(font, ios);
    if (!pool.length) return '·';
    return pool[Math.floor(Math.random() * pool.length)];
}

/** Live renderable pool size (code points, not string length). */
export function getCipherPoolSize(ios = usesIosCipherGlyphs()) {
    const pool = getRenderablePoolRef(ios);
    return pool ? [...pool].length : 0;
}

/** True when background upgrade finished or was skipped (unreliable probe). */
export function isCipherPoolUpgradeComplete(ios = usesIosCipherGlyphs()) {
    if (canvasProbeBlocked) return true;
    if (upgradeState.active) return false;
    return upgradeState.complete && upgradeState.ios === ios;
}

export function isCipherPoolUpgradeActive() {
    return upgradeState.active;
}

/** True when canvas readback is blocked — wheels stay on the safe glyph pool. */
export function isCipherProbeReadbackBlocked() {
    return canvasProbeBlocked;
}

/** True when probing needed extra surfaces or hit transient readback errors. */
export function isCipherProbeRestrictiveEnv() {
    return restrictiveProbeEnv;
}

function upgradeIdleTimeoutMs() {
    return restrictiveProbeEnv ? UPGRADE_IDLE_TIMEOUT_RESTRICTIVE_MS : UPGRADE_IDLE_TIMEOUT_MS;
}

function upgradeChunkSize() {
    return restrictiveProbeEnv ? UPGRADE_CHUNK_SIZE_RESTRICTIVE : UPGRADE_CHUNK_SIZE;
}

function scheduleUpgradeSlice() {
    const runSlice = (deadline) => {
        processUpgradeSlice(deadline);
    };
    const timeout = upgradeIdleTimeoutMs();
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(runSlice, { timeout });
    } else {
        setTimeout(() => runSlice({ timeRemaining: () => 16 }), restrictiveProbeEnv ? 32 : 0);
    }
}

function scheduleUpgradeReliabilityRetry(font, ios, options) {
    if (upgradeReliabilityRetryTimer != null || canvasProbeBlocked) return;
    if (reliabilityRetryCount >= MAX_RELIABILITY_RETRIES) {
        upgradeState.complete = true;
        upgradeState.font = font;
        upgradeState.ios = ios;
        return;
    }
    reliabilityRetryCount++;
    upgradeReliabilityRetryTimer = setTimeout(() => {
        upgradeReliabilityRetryTimer = null;
        if (canvasProbeBlocked) return;
        if (isCanvasProbeReliable(font)) {
            reliabilityRetryCount = 0;
            startCipherPoolBackgroundUpgrade(font, ios, options);
        } else if (!upgradeState.complete) {
            scheduleUpgradeReliabilityRetry(font, ios, options);
        }
    }, UPGRADE_RELIABILITY_RETRY_MS);
}

function processUpgradeSlice(deadline) {
    if (!upgradeState.active) return;

    const { font, ios, pendingChars, onPoolGrowth } = upgradeState;
    const known = new Set(getRenderablePoolRef(ios) || '');
    const added = [];
    let processed = 0;
    const hasTime = () => !deadline?.timeRemaining || deadline.timeRemaining() > 1;

    const chunkLimit = upgradeChunkSize();
    while (
        upgradeState.pendingIndex < pendingChars.length
        && processed < chunkLimit
        && hasTime()
    ) {
        const ch = pendingChars[upgradeState.pendingIndex++];
        processed++;
        if (known.has(ch)) continue;
        if (isRenderableCipherGlyph(ch, font)) {
            known.add(ch);
            added.push(ch);
        }
    }

    if (added.length) {
        setRenderablePool(ios, (getRenderablePoolRef(ios) || '') + added.join(''));
        const newSize = known.size;
        if (
            onPoolGrowth
            && newSize - upgradeState.lastScrubSize >= POOL_GROWTH_SCRUB_THRESHOLD
        ) {
            upgradeState.lastScrubSize = newSize;
            onPoolGrowth(newSize);
        }
    }

    if (upgradeState.pendingIndex >= pendingChars.length) {
        upgradeState.active = false;
        upgradeState.complete = true;
        upgradeState.onPoolGrowth = null;
        return;
    }

    scheduleUpgradeSlice();
}

/**
 * Lazily widen the renderable pool from the full source alphabet after boot.
 * When canvas probing is blocked (private browsing), stays on the safe pool.
 * @param {string} font
 * @param {boolean} [ios]
 * @param {{ onPoolGrowth?: (size: number) => void }} [options]
 * @returns {boolean} true when a new upgrade run was started
 */
export function startCipherPoolBackgroundUpgrade(font, ios = usesIosCipherGlyphs(), options = {}) {
    if (upgradeState.active) return false;
    if (upgradeState.complete && upgradeState.font === font && upgradeState.ios === ios) {
        return false;
    }

    ensureCipherRenderCache(font, ios);

    if (getRestrictiveGlyphMode() || canvasProbeBlocked) {
        upgradeState.complete = true;
        upgradeState.font = font;
        upgradeState.ios = ios;
        return false;
    }

    if (!isCanvasProbeReliable(font)) {
        upgradeState.font = font;
        upgradeState.ios = ios;
        scheduleUpgradeReliabilityRetry(font, ios, options);
        return false;
    }

    clearUpgradeReliabilityRetry();

    const current = new Set(getRenderablePoolRef(ios) || '');
    const pendingChars = [];
    for (const ch of getFullSourcePool(ios)) {
        if (!current.has(ch)) pendingChars.push(ch);
    }

    if (!pendingChars.length) {
        upgradeState.complete = true;
        upgradeState.font = font;
        upgradeState.ios = ios;
        return false;
    }

    upgradeState = {
        active: true,
        complete: false,
        font,
        ios,
        pendingChars,
        pendingIndex: 0,
        lastScrubSize: current.size,
        onPoolGrowth: options.onPoolGrowth || null,
    };

    scheduleUpgradeSlice();
    return true;
}

export function isEmptyWheelGlyph(glyph) {
    if (glyph == null || glyph === '') return true;
    if (typeof glyph !== 'string') return true;
    return !glyph.trim();
}

const MAX_FILL_ATTEMPTS = 12;

/**
 * Replace blank, whitespace, or non-renderable slots on cipher wheels.
 * @param {Array} wheels
 * @param {() => string} pickChar
 * @param {string} font
 * @param {{ skipHintWheels?: boolean }} [options]
 * @returns {number} slots rewritten
 */
export function populateEmptyWheelGlyphs(wheels, pickChar, font, options = {}) {
    const { skipHintWheels = true } = options;
    if (!wheels?.length || !font) return 0;

    ensureCipherRenderCache(font);
    let filled = 0;

    for (const wheel of wheels) {
        if (skipHintWheels && wheel.isHintWheel) continue;
        for (let i = 0; i < wheel.glyphs.length; i++) {
            let glyph = wheel.glyphs[i];
            if (!isEmptyWheelGlyph(glyph) && isRenderableCipherGlyph(glyph, font)) continue;

            for (let attempt = 0; attempt < MAX_FILL_ATTEMPTS; attempt++) {
                glyph = pickChar();
                if (!isEmptyWheelGlyph(glyph) && isRenderableCipherGlyph(glyph, font)) {
                    wheel.glyphs[i] = glyph;
                    filled++;
                    break;
                }
            }
            if (!isEmptyWheelGlyph(wheel.glyphs[i]) && isRenderableCipherGlyph(wheel.glyphs[i], font)) {
                continue;
            }
            wheel.glyphs[i] = pickRenderableCipherChar(font);
            filled++;
        }
    }

    return filled;
}

/** Re-check every slot and replace numbered-box / tofu glyphs. */
export function scrubWheelGlyphs(wheels, font, ios = usesIosCipherGlyphs()) {
    if (!wheels?.length || !font) return 0;
    ensureCipherRenderCache(font, ios);
    let scrubbed = 0;
    for (const wheel of wheels) {
        if (wheel.isHintWheel) continue;
        for (let i = 0; i < wheel.glyphs.length; i++) {
            const glyph = wheel.glyphs[i];
            if (!isEmptyWheelGlyph(glyph) && isRenderableCipherGlyph(glyph, font)) continue;
            wheel.glyphs[i] = pickRenderableCipherChar(font, ios);
            scrubbed++;
        }
    }
    return scrubbed;
}
