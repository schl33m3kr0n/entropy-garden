/**
 * Vigenère cipher core (a–z, spaces preserved). ES module + tested.
 */
export const CIPHER_PLAINTEXT = 'hun nuresk';
export const CIPHER_KEY = 'codex';

export function vigenere(text, key, decrypt = false) {
    const out = [];
    let ki = 0;
    const keyNorm = key.toLowerCase().replace(/[^a-z]/g, '');
    if (!keyNorm) return '';

    for (const ch of text.toLowerCase()) {
        if (ch === ' ') {
            out.push(' ');
            continue;
        }
        if (ch < 'a' || ch > 'z') {
            out.push(ch);
            continue;
        }
        const p = ch.charCodeAt(0) - 97;
        const k = keyNorm.charCodeAt(ki % keyNorm.length) - 97;
        ki += 1;
        const c = decrypt ? (p - k + 26) % 26 : (p + k) % 26;
        out.push(String.fromCharCode(c + 97));
    }
    return out.join('');
}

export const CIPHER_CIPHERTEXT = vigenere(CIPHER_PLAINTEXT, CIPHER_KEY, false);

/** @param {typeof globalThis} global */
export function attachEntropyCipher(global) {
    global.EntropyCipher = {
        plaintext: CIPHER_PLAINTEXT,
        key: CIPHER_KEY,
        ciphertext: CIPHER_CIPHERTEXT,
        decrypt: (text, key = CIPHER_KEY) => vigenere(text, key, true),
        encrypt: (text, key = CIPHER_KEY) => vigenere(text, key, false),
    };
}
