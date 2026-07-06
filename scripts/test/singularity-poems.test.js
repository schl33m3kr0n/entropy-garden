import { describe, expect, it } from 'vitest';
import {
    buildSingularityPoemPool,
    singularityPoemsGritty,
    singularityPoemsSafe,
} from '../../js/data/singularity-poems.data.js';

describe('buildSingularityPoemPool', () => {
    it('returns only safe poems when not corrupted', () => {
        const pool = buildSingularityPoemPool(false);
        expect(pool).toHaveLength(singularityPoemsSafe.length);
        expect(pool).toEqual(singularityPoemsSafe);
        for (const gritty of singularityPoemsGritty) {
            expect(pool).not.toContain(gritty);
        }
    });

    it('includes gritty poems when corrupted', () => {
        const pool = buildSingularityPoemPool(true);
        expect(pool).toHaveLength(singularityPoemsSafe.length + singularityPoemsGritty.length);
        expect(pool.slice(0, singularityPoemsSafe.length)).toEqual(singularityPoemsSafe);
        expect(pool.slice(singularityPoemsSafe.length)).toEqual(singularityPoemsGritty);
    });

    it('does not mutate the safe source array', () => {
        const before = singularityPoemsSafe.length;
        buildSingularityPoemPool(true);
        expect(singularityPoemsSafe).toHaveLength(before);
    });
});
