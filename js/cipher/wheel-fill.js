/**
 * Cipher wheel glyph pool and empty-slot refill.
 */
import {
    FULL_MATRIX_CHARS,
    HEBREW_CIPHER_CHARS,
    CIPHER_ARABIC,
    CIPHER_TIBETAN,
    CIPHER_KANNADA,
    CIPHER_NUMERALS_LITE,
} from '../data/cipher-glyphs.data.js';

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

const desktopPool = [...FULL_MATRIX_CHARS];
const iosPool = [...IOS_CIPHER_CHARS];

export function pickCipherChar(ios = false) {
    const pool = ios ? iosPool : desktopPool;
    if (!pool.length) return '·';
    return pool[Math.floor(Math.random() * pool.length)];
}

export function isEmptyWheelGlyph(glyph) {
    if (glyph == null || glyph === '') return true;
    if (typeof glyph !== 'string') return true;
    return !glyph.trim();
}

/**
 * Replace blank or whitespace slots on cipher wheels.
 * @param {Array} wheels
 * @param {() => string} pickChar
 * @param {string} [_font]
 * @param {{ skipHintWheels?: boolean }} [options]
 * @returns {number} slots rewritten
 */
export function populateEmptyWheelGlyphs(wheels, pickChar, _font, options = {}) {
    const { skipHintWheels = true } = options;
    if (!wheels?.length) return 0;

    let filled = 0;
    for (const wheel of wheels) {
        if (skipHintWheels && wheel.isHintWheel) continue;
        for (let i = 0; i < wheel.glyphs.length; i++) {
            if (!isEmptyWheelGlyph(wheel.glyphs[i])) continue;
            wheel.glyphs[i] = pickChar();
            filled++;
        }
    }
    return filled;
}
