/**
 * Lazy module facade — re-exports loaders + call-through stubs.
 * Import from here (not from loaders/ directly) so paths stay stable.
 */
export { bootGameAddons } from './loaders/game-addons.js';

export {
    loadTerminal,
    pushTerminalLog,
    rebuildTerminalLogPool,
    revealTerminalShell,
    openTerminal,
    getTerminalContainer,
    getTermInput,
} from './facades/terminal.js';

export {
    loadSingularity,
    triggerSingularity,
    stopSingularity3D,
    pauseSingularityPresentation,
    resumeSingularityPresentation,
    cyclePoem,
    reconcileSingularityPoem,
} from './facades/singularity.js';

export {
    loadMatrix,
    ensureMatrix,
    startGardenLoop,
    resumeGardenLoop,
    restartGardenLoop,
    stopGardenLoop,
    resizeCanvas,
    setMatrixNeedsRedraw,
} from './facades/matrix.js?v=cipher-clock-3';

export { loadArcade, loadArcadeLevel } from './facades/arcade.js';

export { loadCards, initCardsOfChaos } from './facades/cards.js';

import { perf } from './core/shared.js';
import { loadMatrix } from './facades/matrix.js?v=cipher-clock-3';
import { loadTerminal } from './facades/terminal.js';
import { loadSingularity } from './facades/singularity.js';

function isIosPoemMode() {
    return perf.isIOS || document.body.classList.contains('ios-ui');
}

function preloadGardenModules() {
    loadMatrix().catch(() => {});
    loadTerminal()
        .then(() => {
            if (!isIosPoemMode()) loadSingularity().catch(() => {});
        })
        .catch(() => {});
}

if (perf.isIOS) {
    const preloadIosModules = () => {
        loadTerminal().catch(() => {});
        import('./ios/ios-poems.js').then((m) => m.initIosPoemArchive()).catch(() => {});
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', preloadIosModules, { once: true });
    } else {
        preloadIosModules();
    }
}

if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(preloadGardenModules);
} else {
    setTimeout(preloadGardenModules, 200);
}
