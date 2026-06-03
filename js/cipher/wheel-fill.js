/**
 * Detects blank / tofu cipher wheel slots and refills them from a render-tested pool.
 */
import { FULL_MATRIX_CHARS, HEBREW_CIPHER_CHARS } from '../data/cipher-glyphs.data.js';
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
    '!?@#$%&*_+=<>[]{}|/~';

const RASTER_SIZE = 28;
const RASTER_CX = RASTER_SIZE / 2;
const RASTER_CY = RASTER_SIZE / 2;

let desktopRenderable = null;
let iosRenderable = null;
let tofuRefBits = null;

/** Clear cached render tests (call after resize or font change). */
export function resetCipherRenderCache() {
    desktopRenderable = null;
    iosRenderable = null;
    tofuRefBits = null;
}

function rasterSignature(ctx, ch, font) {
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

function buildTofuRefBits(ctx, font) {
    if (tofuRefBits) return tofuRefBits;
    const refs = ['\uFFFD', '\u{1F700}', '\u{10FFFF}'];
    tofuRefBits = new Set(refs.map((ch) => rasterSignature(ctx, ch, font).bits));
    return tofuRefBits;
}

/** True when the glyph has no visible ink or draws the missing-glyph box. */
export function isRenderableCipherGlyph(ctx, ch, font) {
    if (!ch || typeof ch !== 'string') return false;
    const trimmed = ch.trim();
    if (!trimmed) return false;
    const { bits, pixels } = rasterSignature(ctx, ch, font);
    if (pixels === 0) return false;
    const refs = buildTofuRefBits(ctx, font);
    if (refs.has(bits)) return false;
    const cp = ch.codePointAt(0);
    if (cp >= 0x1f700 && cp <= 0x1f77f) {
        const alchemicalTofu = rasterSignature(ctx, '\u{1F700}', font).bits;
        if (bits === alchemicalTofu) return false;
    }
    return true;
}

function filterRenderablePool(pool, ctx, font) {
    const out = [];
    for (const ch of pool) {
        if (isRenderableCipherGlyph(ctx, ch, font)) out.push(ch);
    }
    return out;
}

/** Build once per font channel (desktop monospace vs iOS). */
export function ensureCipherRenderCache(ctx, font, ios = usesIosCipherGlyphs()) {
    if (ios) {
        if (iosRenderable) return iosRenderable;
        iosRenderable = filterRenderablePool([...IOS_CIPHER_CHARS], ctx, font).join('');
        return iosRenderable;
    }
    if (desktopRenderable) return desktopRenderable;
    desktopRenderable = filterRenderablePool([...FULL_MATRIX_CHARS], ctx, font).join('');
    return desktopRenderable;
}

export function pickRenderableCipherChar(ctx, font, ios = usesIosCipherGlyphs()) {
    const pool = ensureCipherRenderCache(ctx, font, ios);
    if (!pool.length) return '·';
    return pool[Math.floor(Math.random() * pool.length)];
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
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} font
 * @param {{ skipHintWheels?: boolean }} [options]
 * @returns {number} slots rewritten
 */
export function populateEmptyWheelGlyphs(wheels, pickChar, ctx, font, options = {}) {
    const { skipHintWheels = true } = options;
    if (!wheels?.length || !ctx || !font) return 0;

    ensureCipherRenderCache(ctx, font);
    let filled = 0;

    for (const wheel of wheels) {
        if (skipHintWheels && wheel.isHintWheel) continue;
        for (let i = 0; i < wheel.glyphs.length; i++) {
            let glyph = wheel.glyphs[i];
            if (!isEmptyWheelGlyph(glyph) && isRenderableCipherGlyph(ctx, glyph, font)) continue;

            for (let attempt = 0; attempt < MAX_FILL_ATTEMPTS; attempt++) {
                glyph = pickChar();
                if (!isEmptyWheelGlyph(glyph) && isRenderableCipherGlyph(ctx, glyph, font)) {
                    wheel.glyphs[i] = glyph;
                    filled++;
                    break;
                }
            }
            if (!isEmptyWheelGlyph(wheel.glyphs[i]) && isRenderableCipherGlyph(ctx, wheel.glyphs[i], font)) {
                continue;
            }
            wheel.glyphs[i] = pickRenderableCipherChar(ctx, font);
            filled++;
        }
    }

    return filled;
}
