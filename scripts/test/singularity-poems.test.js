import { beforeAll, describe, expect, it, vi } from 'vitest';
import poemsIndex from '../../content/poems/index.json';
import {
    buildSingularityPoemPool,
    findSingularityPoemByText,
    getSingularityPoemCounts,
    loadSingularityPoems,
} from '../../js/data/singularity-poems.data.js';

describe('buildSingularityPoemPool', () => {
    beforeAll(async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            json: async () => poemsIndex,
        })));
        await loadSingularityPoems();
    });

    it('returns only safe poems when not corrupted', () => {
        const { safe, gritty } = getSingularityPoemCounts();
        const pool = buildSingularityPoemPool(false);
        expect(pool).toHaveLength(safe);
        const grittyPool = buildSingularityPoemPool(true).slice(safe);
        for (const poem of grittyPool) {
            expect(pool).not.toContain(poem);
        }
        expect(grittyPool).toHaveLength(gritty);
    });

    it('includes gritty poems when corrupted', () => {
        const { safe, gritty } = getSingularityPoemCounts();
        const pool = buildSingularityPoemPool(true);
        expect(pool).toHaveLength(safe + gritty);
        expect(pool.slice(0, safe)).toEqual(buildSingularityPoemPool(false));
        expect(pool.slice(safe)).toHaveLength(gritty);
    });

    it('does not mutate the safe source array', () => {
        const before = buildSingularityPoemPool(false);
        buildSingularityPoemPool(true);
        expect(buildSingularityPoemPool(false)).toEqual(before);
    });

    it('provides pre-rendered audio and per-line timings for every poem', () => {
        const pool = buildSingularityPoemPool(true);
        for (const text of pool) {
            const entry = findSingularityPoemByText(text);
            expect(entry).toBeTruthy();
            expect(entry.audio).toMatch(/^content\/poems\/audio\/[a-z0-9-]+\.m4a$/);
            const lines = text.split('\n').filter((l) => l.trim() !== '');
            expect(Array.isArray(entry.lineTimings)).toBe(true);
            expect(entry.lineTimings).toHaveLength(lines.length);
        }
    });
});
