/**
 * TEMP — manual optical center tweaks for god-mode iris symbols.
 *
 * SVG eye viewBox is 0–100; pupil anchor is (50, 50).
 * dx / dy nudge each glyph (negative dy = up, positive dy = down).
 *
 * Edit values here, hard-refresh, toggle god mode, watch symbols cycle.
 * When happy, keep this file (or fold values into a non-TEMP module).
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
    // iOS fallbacks (when resolveIcoSymbol maps to these)
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
