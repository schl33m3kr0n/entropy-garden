import { describe, expect, it } from 'vitest';
import {
    CIPHER_CIPHERTEXT,
    CIPHER_KEY,
    CIPHER_PLAINTEXT,
    attachEntropyCipher,
    vigenere,
} from '../../js/cipher/vigenere-core.js';

describe('vigenere', () => {
    it('encrypts the garden plaintext with codex key', () => {
        expect(vigenere(CIPHER_PLAINTEXT, CIPHER_KEY)).toBe(CIPHER_CIPHERTEXT);
    });

    it('round-trips encrypt/decrypt', () => {
        const plain = 'entropy garden';
        const encrypted = vigenere(plain, CIPHER_KEY, false);
        expect(vigenere(encrypted, CIPHER_KEY, true)).toBe(plain);
    });

    it('preserves spaces and ignores non-alpha in key', () => {
        expect(vigenere('ab cd', 'x y')).toBe('xb yd');
    });

    it('returns empty string when key has no letters', () => {
        expect(vigenere('hello', '123')).toBe('');
    });

    it('attachEntropyCipher exposes EntropyCipher API', () => {
        const g = {};
        attachEntropyCipher(g);
        expect(g.EntropyCipher.plaintext).toBe(CIPHER_PLAINTEXT);
        expect(g.EntropyCipher.decrypt(CIPHER_CIPHERTEXT)).toBe(CIPHER_PLAINTEXT);
    });
});
