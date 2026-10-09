/** Search + random picker for alternate history articles. */

import { createBag } from './core/lore/random.js';

/** @type {WeakMap<object, Map<string, () => any>>} */
const historyBags = new WeakMap();

function drawFromHistoryBag(root, pool, key) {
    let byKey = historyBags.get(root);
    if (!byKey) {
        byKey = new Map();
        historyBags.set(root, byKey);
    }
    if (!byKey.has(key)) byKey.set(key, createBag(pool));
    return byKey.get(key);
}

/**
 * @param {import('./data/alternate-history.data.js').AlternateHistoryArticle[]} articles
 * @param {string} [query]
 */
export function searchAlternateHistory(articles, query = '') {
    const q = query.trim().toLowerCase();
    if (!q) return [...articles];

    return articles.filter((article) => {
        const haystack = [
            article.title,
            article.year,
            article.excerpt,
            ...(article.tags ?? []),
        ].join(' ').toLowerCase();
        return haystack.includes(q);
    });
}

/**
 * @param {Array<{ id: string }>} pool
 * @param {{ excludeId?: string }} [options]
 */
export function pickRandomAlternateHistory(pool, options = {}) {
    const [article] = pickAlternateHistorySample(pool, 1, {
        excludeIds: options.excludeId ? [options.excludeId] : [],
    });
    return article ?? null;
}

/**
 * @param {Array<{ id: string }>} pool
 * @param {number} [count]
 * @param {{ excludeIds?: string[] }} [options]
 */
export function pickAlternateHistorySample(pool, count = 3, options = {}) {
    if (!pool.length || count < 1) return [];

    const exclude = new Set(options.excludeIds ?? []);
    const root = options.rootPool ?? pool;
    const draw = drawFromHistoryBag(root, pool, options.bagKey ?? 'all');
    const picked = [];
    const seen = new Set();
    const maxAttempts = Math.max(pool.length * 2, count * 4);

    for (let attempt = 0; attempt < maxAttempts && picked.length < count; attempt += 1) {
        const article = draw();
        if (!article || seen.has(article.id)) continue;
        if (exclude.has(article.id) && pool.length > exclude.size) continue;
        seen.add(article.id);
        picked.push(article);
    }

    if (picked.length < count) {
        const pickedIds = new Set(picked.map((article) => article.id));
        for (const article of pool) {
            if (picked.length >= count) break;
            if (pickedIds.has(article.id)) continue;
            pickedIds.add(article.id);
            picked.push(article);
        }
    }

    return picked;
}

/**
 * @param {import('./data/alternate-history.data.js').AlternateHistoryArticle[]} articles
 * @param {{ query?: string, excludeIds?: string[], count?: number }} [options]
 */
export function resolveAlternateHistoryArticles(articles, options = {}) {
    const count = options.count ?? 3;
    const query = options.query?.trim() ?? '';
    const matches = searchAlternateHistory(articles, query);
    const matchedBySearch = Boolean(query);
    const pool = matches.length ? matches : articles;
    const pickerOptions = {
        excludeIds: options.excludeIds ?? [],
        rootPool: articles,
        bagKey: matchedBySearch ? `q:${query.toLowerCase()}` : 'random',
    };

    return {
        articles: pickAlternateHistorySample(pool, count, pickerOptions),
        matchedBySearch: matchedBySearch && matches.length > 0,
        matchCount: matches.length,
    };
}

/**
 * @param {import('./data/alternate-history.data.js').AlternateHistoryArticle[]} articles
 * @param {{ query?: string, excludeId?: string }} [options]
 */
export function resolveAlternateHistoryArticle(articles, options = {}) {
    const resolved = resolveAlternateHistoryArticles(articles, {
        query: options.query,
        excludeIds: options.excludeId ? [options.excludeId] : [],
        count: 1,
    });

    return {
        article: resolved.articles[0] ?? null,
        matchedBySearch: resolved.matchedBySearch,
        matchCount: resolved.matchCount,
    };
}
