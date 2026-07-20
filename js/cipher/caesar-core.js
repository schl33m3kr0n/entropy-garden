/**
 * Caesar cipher core (a–z, spaces preserved). ES module + tested.
 */
export const CIPHER_PLAINTEXT = 'hun nuresk';
export const CIPHER_SHIFT = 3;

export function caesar(text, shift, decrypt = false) {
    const n = ((Number(shift) % 26) + 26) % 26;
    if (!n && !decrypt) {
        /* shift 0 encrypt is identity; still valid */
    }
    const out = [];

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
        const c = decrypt ? (p - n + 26) % 26 : (p + n) % 26;
        out.push(String.fromCharCode(c + 97));
    }
    return out.join('');
}

export const CIPHER_CIPHERTEXT = caesar(CIPHER_PLAINTEXT, CIPHER_SHIFT, false);

/** @param {typeof globalThis} global */
export function attachEntropyCipher(global) {
    global.EntropyCipher = {
        plaintext: CIPHER_PLAINTEXT,
        shift: CIPHER_SHIFT,
        ciphertext: CIPHER_CIPHERTEXT,
        decrypt: (text, shift = CIPHER_SHIFT) => caesar(text, shift, true),
        encrypt: (text, shift = CIPHER_SHIFT) => caesar(text, shift, false),
        /** Legacy field — numeric shift as string */
        key: String(CIPHER_SHIFT),
    };
}
