/** Alternate history — source files live in content/*.md; index built at deploy. */

const INDEX_PATH = 'content/index.json';

/** @typedef {{ id: string, title: string, year: string, tags: string[], excerpt: string }} AlternateHistoryArticle */

/** @type {Promise<AlternateHistoryArticle[]> | null} */
let cache = null;

/** @returns {Promise<AlternateHistoryArticle[]>} */
export function loadAlternateHistoryArticles() {
    if (!cache) {
        cache = fetch(INDEX_PATH).then((res) => {
            if (!res.ok) {
                throw new Error(`alternate history index: ${res.status}`);
            }
            return res.json();
        });
    }
    return cache;
}
