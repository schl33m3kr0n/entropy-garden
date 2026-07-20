import { describe, expect, it } from 'vitest';
import {
    CIPHER_CIPHERTEXT,
    CIPHER_PLAINTEXT,
    CIPHER_SHIFT,
    attachEntropyCipher,
    caesar,
} from '../../js/cipher/caesar-core.js';

describe('caesar', () => {
    it('encrypts the garden plaintext with the default shift', () => {
        expect(caesar(CIPHER_PLAINTEXT, CIPHER_SHIFT)).toBe(CIPHER_CIPHERTEXT);
    });

    it('round-trips encrypt/decrypt', () => {
        const plain = 'entropy garden';
        const encrypted = caesar(plain, CIPHER_SHIFT, false);
        expect(caesar(encrypted, CIPHER_SHIFT, true)).toBe(plain);
    });

    it('preserves spaces', () => {
        expect(caesar('ab cd', 1)).toBe('bc de');
    });

    it('wraps shifts modulo 26', () => {
        expect(caesar('a', 27)).toBe(caesar('a', 1));
    });

    it('attachEntropyCipher exposes EntropyCipher API', () => {
        const g = {};
        attachEntropyCipher(g);
        expect(g.EntropyCipher.plaintext).toBe(CIPHER_PLAINTEXT);
        expect(g.EntropyCipher.shift).toBe(CIPHER_SHIFT);
        expect(g.EntropyCipher.decrypt(CIPHER_CIPHERTEXT)).toBe(CIPHER_PLAINTEXT);
    });
});
