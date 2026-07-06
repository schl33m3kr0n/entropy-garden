/**
 * Per-glyph optical center nudges for panopticon god-mode pupil symbols (viewBox 0–100).
 * SVG text-anchor/middle + dominant-baseline/middle use metric box centers, not visual mass.
 */
export const GOD_SYMBOL_VISUAL_OFFSETS = {
    '⛦': { dx: 0, dy: -0.55 },
    '⚛︎': { dx: 0, dy: 0.75 },
    '⚛': { dx: 0, dy: 0.75 },
    '☯︎': { dx: 0, dy: 0.15 },
    '☯': { dx: 0, dy: 0.15 },
    '❖': { dx: 0, dy: -0.15 },
    '◉': { dx: 0, dy: 0 },
    '⧊': { dx: 0, dy: 0.1 },
    '☉': { dx: 0, dy: -0.35 },
    '⛬': { dx: 0, dy: 1.05 },
    '⛢': { dx: 0, dy: -0.25 },
    '☧': { dx: 0, dy: 0.65 },
    '☥': { dx: 0, dy: 0.85 },
    '♁': { dx: 0, dy: 0.9 },
    '∴': { dx: 0, dy: -0.95 },
    '△': { dx: 0, dy: 1.15 },
    '⊕': { dx: 0, dy: 0.05 },
    'ψ': { dx: 0.05, dy: -0.55 },
    '✖': { dx: 0, dy: 0.05 },
    '☸': { dx: 0, dy: 0.35 },
    '⚖': { dx: 0, dy: 0.95 },
    '∞': { dx: 0, dy: -0.45 },
    '𖣂': { dx: 0, dy: 0.55 },
    '🜲': { dx: 0, dy: 0.45 },
    '🜁': { dx: 0, dy: -0.35 },
    '𖤓': { dx: 0, dy: 0.5 },
    // iOS fallbacks
    '◆': { dx: 0, dy: -0.2 },
    '◎': { dx: 0, dy: 0.75 },
    '●': { dx: 0, dy: 0 },
    '◇': { dx: 0, dy: 0.1 },
    '○': { dx: 0, dy: -0.35 },
    '▲': { dx: 0, dy: 1.05 },
    '◈': { dx: 0, dy: -0.25 },
    '✚': { dx: 0, dy: 0.65 },
    '✕': { dx: 0, dy: 0.05 },
    '✦': { dx: 0, dy: 0.35 },
};

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
