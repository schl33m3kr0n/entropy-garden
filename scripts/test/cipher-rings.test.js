import { describe, expect, it } from 'vitest';
import {
    LATIN_26,
    pickCaesarRingPairIndices,
    applyCaesarDecoderRings,
    clearCaesarDecoderRings,
    resetCaesarPairCache,
    rotateCaesarCipherRing,
} from '../../js/cipher/cipher-rings.js';

describe('cipher-rings', () => {
    it('picks the two wheels closest to 26 slots', () => {
        const wheels = [
            { charCount: 12, ringIndex: 0 },
            { charCount: 18, ringIndex: 1 },
            { charCount: 24, ringIndex: 2 },
            { charCount: 30, ringIndex: 3 },
        ];
        expect(pickCaesarRingPairIndices(wheels)).toEqual([2, 3]);
    });

    it('does not alter wheels until the cipher is active', () => {
        resetCaesarPairCache();
        const wheels = [
            {
                charCount: 25,
                ringIndex: 1,
                glyphs: Array(25).fill('?'),
                angle: 0.2,
                spinSpeed: -0.001,
                cycleEvery: 12,
            },
        ];
        applyCaesarDecoderRings(wheels, { active: false, shift: 3 });
        expect(wheels[0].charCount).toBe(25);
        expect(wheels[0].isCipherRing).toBeFalsy();
    });

    it('forces alphabet glyphs when active and restores on clear', () => {
        resetCaesarPairCache();
        const wheels = [
            {
                charCount: 14,
                ringIndex: 0,
                glyphs: Array(14).fill('?'),
                angle: 0,
                spinSpeed: 0.001,
                cycleEvery: 10,
            },
            {
                charCount: 25,
                ringIndex: 1,
                glyphs: Array(25).fill('?'),
                angle: 0.2,
                spinSpeed: -0.001,
                cycleEvery: 12,
            },
            {
                charCount: 27,
                ringIndex: 2,
                glyphs: Array(27).fill('?'),
                angle: 0.4,
                spinSpeed: 0.001,
                cycleEvery: 14,
            },
        ];

        applyCaesarDecoderRings(wheels, { active: true, shift: 3 });

        expect(wheels[1].isCipherRing).toBe(true);
        expect(wheels[2].isCipherRing).toBe(true);
        expect(wheels[1].charCount).toBe(26);
        expect(wheels[2].charCount).toBe(26);
        expect(wheels[1].glyphs.join('')).toBe(LATIN_26);
        expect(wheels[2].glyphs.join('')).toBe(LATIN_26);
        expect(wheels[1].spinSpeed).toBe(0);
        expect(wheels[2].spinSpeed).toBe(0);

        clearCaesarDecoderRings(wheels);
        expect(wheels[1].charCount).toBe(25);
        expect(wheels[2].charCount).toBe(27);
        expect(wheels[1].isCipherRing).toBeFalsy();
        expect(wheels[2].isCipherRing).toBeFalsy();
    });

    it('rotates the inner decoder ring by letter slots', () => {
        resetCaesarPairCache();
        const wheels = [
            { charCount: 25, ringIndex: 1, glyphs: Array(25).fill('?'), angle: 0, spinSpeed: 0, cycleEvery: 12 },
            { charCount: 27, ringIndex: 2, glyphs: Array(27).fill('?'), angle: 0.4, spinSpeed: 0, cycleEvery: 14 },
        ];
        applyCaesarDecoderRings(wheels, { active: true, shift: 3 });
        const before = wheels[1].angle;
        expect(rotateCaesarCipherRing(wheels, 1)).toBe(true);
        const slot = (Math.PI * 2) / 26;
        expect(wheels[1].angle).toBeCloseTo(before + slot, 8);
    });
});
