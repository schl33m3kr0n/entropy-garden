/**
 * Terminal Caesar cipher — global EntropyCipher (classic script tag).
 */
import { attachEntropyCipher } from './caesar-core.js';

attachEntropyCipher(typeof globalThis !== 'undefined' ? globalThis : window);
