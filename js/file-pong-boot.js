/**
 * file:// bundle entry — pong + konami (no full ES module graph).
 * Built to js/file-pong.bundle.js; not loaded on http(s) Cloudflare deploys.
 */
import './file-lazy-shim.js';
import {
    initPanopticonPingPong,
    notifyGardenReady,
    pongBlocksArrowNav,
    isPongSessionActive,
    cancelPongArmingSequence,
} from './pong.js';
import {
    initKonami,
    isKonamiInProgress,
    konamiClaimsKey,
    cancelKonamiArmingSequence,
    resetKonamiSequence,
} from './konami.js';

export function bootAddons() {
    initPanopticonPingPong();
    initKonami({
        isPongActive: isPongSessionActive,
        onComplete: () => globalThis.activateGodMode?.(),
    });
    globalThis.gardenHooks = {
        ...globalThis.gardenHooks,
        konamiBlocksPongArming: isKonamiInProgress,
        konamiClaimsKey: (e) => konamiClaimsKey(e, isPongSessionActive),
        cancelPongArming: cancelPongArmingSequence,
        cancelKonamiArming: cancelKonamiArmingSequence,
        resetKonamiSequence,
    };
}

/** @deprecated use bootAddons */
export function bootPong() {
    bootAddons();
}

export function onGardenReady() {
    notifyGardenReady();
}

export { pongBlocksArrowNav, isPongSessionActive, konamiClaimsKey };
