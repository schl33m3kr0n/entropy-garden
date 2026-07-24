/** Singularity poems — source in content/poems/*.md; index built at deploy. */

const INDEX_PATH = 'content/poems/index.json';

/** @typedef {{ id: string, tone: 'safe' | 'gritty', title: string, text: string }} SingularityPoem */

/** @type {Promise<SingularityPoem[]> | null} */
let loadPromise = null;
/** @type {SingularityPoem[] | null} */
let cachedPoems = null;

/** @returns {Promise<SingularityPoem[]>} */
export function loadSingularityPoems() {
    if (!loadPromise) {
        loadPromise = fetch(INDEX_PATH)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`singularity poems index: ${res.status}`);
                }
                return res.json();
            })
            .then((poems) => {
                cachedPoems = poems;
                return poems;
            });
    }
    return loadPromise;
}

function poemTexts(tone) {
    if (!cachedPoems) return [];
    return cachedPoems.filter((poem) => poem.tone === tone).map((poem) => poem.text);
}

/** @param {boolean} isCorrupted */
export function buildSingularityPoemPool(isCorrupted) {
    const safe = poemTexts('safe');
    const gritty = poemTexts('gritty');
    return isCorrupted ? safe.concat(gritty) : safe.slice();
}

/** @param {string} text */
export function poemTitleFromText(text) {
    const line = text.split('\n').map((l) => l.trim()).find(Boolean);
    return line || 'Transmission';
}

/** @returns {{ safe: number, gritty: number }} */
export function getSingularityPoemCounts() {
    return {
        safe: poemTexts('safe').length,
        gritty: poemTexts('gritty').length,
    };
}
