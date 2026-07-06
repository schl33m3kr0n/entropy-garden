import { registerHooks } from '../core/hooks.js';
import { perf } from '../core/shared.js';

/** @type {Promise<{ pong: object, konami: object }> | null} */
let gameAddonsPromise = null;
/** @type {(() => void) | null} */
let konamiOnComplete = null;

function installGameGardenHooks(pong, konami) {
    registerHooks({
        konamiBlocksPongArming: konami.isKonamiInProgress,
        isKonamiInProgress: konami.isKonamiInProgress,
        isKonamiActivelyEntering: konami.isKonamiActivelyEntering,
        isPongArmingActive: pong.isPongArmingActive,
        isPongSessionActive: pong.isPongSessionActive,
        pongBlocksArrowNav: pong.pongBlocksArrowNav,
        konamiClaimsKey: (e) => konami.konamiClaimsKey(e, pong.isPongSessionActive),
        cancelPongArming: pong.cancelPongArmingSequence,
        cancelKonamiArming: konami.cancelKonamiArmingSequence,
        resetKonamiSequence: konami.resetKonamiSequence,
    });
}

/** Lazy-load pong + konami after garden-ready. */
export function bootGameAddons(onKonamiComplete) {
    if (typeof onKonamiComplete === 'function') {
        konamiOnComplete = onKonamiComplete;
    }

    if (gameAddonsPromise) return gameAddonsPromise;

    gameAddonsPromise = (async () => {
        const pong = await import('../game/pong/index.js');
        const konami = await import('../game/konami.js');
        pong.initPanopticonPingPong();
        konami.initKonami({
            isPongActive: pong.isPongSessionActive,
            onComplete: () => konamiOnComplete?.(),
        });
        installGameGardenHooks(pong, konami);
        if (perf.isIOS) {
            import('../ios/ios-konami-pad.js').then((m) => {
                m.initIosKonamiPad({
                    isPongActive: pong.isPongSessionActive,
                    onComplete: () => konamiOnComplete?.(),
                    konami,
                });
            }).catch(() => {});
        }
        return { pong, konami };
    })().catch(async (err) => {
        gameAddonsPromise = null;
        try {
            const pong = await import('../game/pong/index.js');
            pong.resetPanopticonPongBoot?.();
        } catch {
            /* ignore */
        }
        console.error('[Entropy Garden] pong/konami failed to load', err);
        throw err;
    });

    return gameAddonsPromise;
}
