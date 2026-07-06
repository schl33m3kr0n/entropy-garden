/**
 * Terminal Korzamuron cipher — global EntropyCipher (classic script tag).
 */
import { attachEntropyCipher } from './vigenere-core.js';

attachEntropyCipher(typeof globalThis !== 'undefined' ? globalThis : window);
