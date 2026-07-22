/** Search + random picker for alternate history articles. */

/**
 * @param {typeof import('./data/alternate-history.data.js').alternateHistoryArticles} articles
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
    let candidates = pool;
    if (exclude.size && pool.length > exclude.size) {
        candidates = pool.filter((article) => !exclude.has(article.id));
    }

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);

    if (picked.length < count) {
        const pickedIds = new Set(picked.map((article) => article.id));
        const rest = pool.filter((article) => !pickedIds.has(article.id));
        const extra = [...rest].sort(() => Math.random() - 0.5).slice(0, count - picked.length);
        picked.push(...extra);
    }

    return picked;
}

/**
 * @param {typeof import('./data/alternate-history.data.js').alternateHistoryArticles} articles
 * @param {{ query?: string, excludeIds?: string[], count?: number }} [options]
 */
export function resolveAlternateHistoryArticles(articles, options = {}) {
    const count = options.count ?? 3;
    const matches = searchAlternateHistory(articles, options.query);
    const pickerOptions = { excludeIds: options.excludeIds ?? [] };

    if (matches.length) {
        return {
            articles: pickAlternateHistorySample(matches, count, pickerOptions),
            matchedBySearch: Boolean(options.query?.trim()),
            matchCount: matches.length,
        };
    }

    return {
        articles: pickAlternateHistorySample(articles, count, pickerOptions),
        matchedBySearch: false,
        matchCount: 0,
    };
}

/**
 * @param {typeof import('./data/alternate-history.data.js').alternateHistoryArticles} articles
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
