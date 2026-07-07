/**
 * Apply per-glyph iris offsets from god-symbol-offsets.data.js (TEMP tuning file).
 */
import { GOD_SYMBOL_VISUAL_OFFSETS } from './god-symbol-offsets.data.js';

export { GOD_SYMBOL_VISUAL_OFFSETS } from './god-symbol-offsets.data.js';

const GOD_PUPIL_CENTER = 50;

function stripVariationSelectors(symbol) {
    return symbol.replace(/[\uFE0E\uFE0F]/g, '');
}

/** @returns {{ dx: number, dy: number }} */
export function getGodSymbolVisualOffset(symbol) {
    const stripped = stripVariationSelectors(symbol);
    return GOD_SYMBOL_VISUAL_OFFSETS[symbol]
        ?? GOD_SYMBOL_VISUAL_OFFSETS[stripped]
        ?? { dx: 0, dy: 0 };
}

/** @param {SVGTextElement | null | undefined} el */
export function applyGodPupilSymbol(el, symbol) {
    if (!el) return;
    el.textContent = symbol;
    const { dx, dy } = getGodSymbolVisualOffset(symbol);
    el.setAttribute('x', String(GOD_PUPIL_CENTER + dx));
    el.setAttribute('y', String(GOD_PUPIL_CENTER + dy));
}

/** @param {SVGTextElement | null | undefined} el */
export function resetGodPupilPosition(el) {
    if (!el) return;
    el.setAttribute('x', String(GOD_PUPIL_CENTER));
    el.setAttribute('y', String(GOD_PUPIL_CENTER));
}
