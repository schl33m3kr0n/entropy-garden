/** Matrix canvas refs, cipher glyph pools, perf tuning. */
import {
    FULL_MATRIX_CHARS,
    HEBREW_CIPHER_CHARS,
    CIPHER_ARABIC,
    CIPHER_TIBETAN,
    CIPHER_KANNADA,
    CIPHER_NUMERALS_LITE,
} from '../data/cipher-glyphs.data.js';
import {
    isIOS,
    isSafari,
} from './environment.js';

export const canvas = document.getElementById('grid-canvas');
export const ctx = canvas?.getContext('2d') ?? null;

export { FULL_MATRIX_CHARS };
export const chars = FULL_MATRIX_CHARS;

// BMP symbols that render reliably in iOS system fonts (cipher wheels only).
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

/** Smaller glyph pool on real iOS / ios-ui — desktop Safari can use the full set. */
export function usesIosCipherGlyphs() {
    return perf.isIOS || document.body?.classList.contains('ios-ui');
}

/** Flat green wheel only on iOS. Desktop Safari gets Firefox’s conic/radial color field. */
export function usesLiteCipherWheelPaint() {
    return usesIosCipherGlyphs();
}

export function pickCipherChar() {
    const pool = usesIosCipherGlyphs() ? IOS_CIPHER_CHARS : FULL_MATRIX_CHARS;
    return pool[Math.floor(Math.random() * pool.length)];
}

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isNarrowViewport = window.innerWidth <= 768;
const isMobile = isCoarsePointer || isNarrowViewport;

function applyPerfNumbers() {
    const rm = perf.prefersReducedMotion;
    const ios = perf.isIOS;
    const saf = perf.isSafari;
    const mob = perf.isMobile;

    // liteGfx is iOS-only so desktop Safari keeps the Firefox conic wheel paint.
    perf.liteGfx = ios;
    perf.dprCap = ios ? 1 : (saf ? 1.5 : (mob ? 1.5 : 2));
    perf.spawnPerFrame = rm ? 12 : (ios ? 2 : (saf ? 4 : (mob ? 4 : 8)));
    perf.steadySwapsPerFrame = rm ? 8 : (ios ? 4 : (saf ? 12 : (mob ? 12 : 30)));
    // iOS: draw every frame — skip 2 made wheel spin stutter at ~20fps
    perf.matrixFrameSkip = rm
        ? 0
        : (ios ? 0 : (saf ? 1 : (mob ? 1 : 0)));
    perf.panopticonFrameSkip = rm ? 0 : (saf && !ios ? 1 : 0);
    perf.maxCipherRings = ios ? 7 : null;
    perf.cellSpacing = mob ? 1.45 : 1.65;
}

export const perf = {
    isIOS,
    isSafari,
    isMobile,
    liteGfx: isIOS,
    prefersReducedMotion: reducedMotionQuery.matches,
    dprCap: 2,
    spawnPerFrame: 8,
    steadySwapsPerFrame: 30,
    matrixFrameSkip: 0,
    panopticonFrameSkip: 0,
    maxCipherRings: null,
    cellSpacing: 1.65,
};

applyPerfNumbers();

export function applyPerfClass() {
    document.body.classList.toggle('perf-lite', isMobile || perf.prefersReducedMotion || isIOS);
    document.body.classList.toggle('perf-safari', perf.isSafari);
}

applyPerfClass();
reducedMotionQuery.addEventListener('change', (e) => {
    perf.prefersReducedMotion = e.matches;
    applyPerfNumbers();
    applyPerfClass();
    import('./state.js').then((s) => s.setNeedsFullRedraw(true));
});
