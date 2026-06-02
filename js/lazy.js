// Lazy module loader with call-through stubs

let terminalMod;
let singularityMod;
let matrixMod;
let arcadeMod;

let terminalPromise;
let singularityPromise;
let matrixPromise;
let arcadePromise;

const terminalQueue = [];

export function loadTerminal() {
    if (!terminalPromise) {
        terminalPromise = import('./modules/terminal.js').then((mod) => {
            terminalMod = mod;
            mod.initTerminal();
            terminalQueue.splice(0).forEach((msg) => mod.pushTerminalLog(msg));
            return mod;
        });
    }
    return terminalPromise;
}

export function loadSingularity() {
    if (!singularityPromise) {
        singularityPromise = import('./modules/singularity.js').then((mod) => {
            singularityMod = mod;
            return mod;
        });
    }
    return singularityPromise;
}

export function loadMatrix() {
    if (!matrixPromise) {
        matrixPromise = import('./modules/matrix.js')
            .then((mod) => {
                matrixMod = mod;
                return mod;
            })
            .catch((err) => {
                matrixPromise = null;
                console.error('[Entropy Garden] matrix module failed to load:', err);
                throw err;
            });
    }
    return matrixPromise;
}

export function loadArcade() {
    if (!arcadePromise) {
        arcadePromise = import('./modules/arcade.js').then((mod) => {
            arcadeMod = mod;
            return mod;
        });
    }
    return arcadePromise;
}

export function rebuildTerminalLogPool() {
    if (terminalMod?.rebuildTerminalLogPool) terminalMod.rebuildTerminalLogPool();
}

export function pushTerminalLog(msg) {
    if (terminalMod) terminalMod.pushTerminalLog(msg);
    else {
        terminalQueue.push(msg);
        loadTerminal();
    }
}

export function triggerSingularity() {
    loadSingularity().then((mod) => mod.triggerSingularity());
}

export function triggerOspreyEvent() {
    loadSingularity().then((mod) => mod.triggerOspreyEvent());
}

export function stopSingularity3D() {
    if (singularityMod?.stopSingularity3D) singularityMod.stopSingularity3D();
    else loadSingularity().then((mod) => mod.stopSingularity3D?.());
}

export function cyclePoem() {
    loadSingularity().then((mod) => mod.cyclePoem());
}

export function reconcileSingularityPoem() {
    loadSingularity().then((mod) => mod.reconcileSingularityPoem());
}

export async function ensureMatrix() {
    return loadMatrix();
}

export function startGardenLoop() {
    if (matrixMod) {
        matrixMod.startGardenLoop();
        return;
    }
    loadMatrix()
        .then((mod) => mod.startGardenLoop())
        .catch((err) => console.error('[Entropy Garden] matrix failed to load', err));
}

export function resumeGardenLoop() {
    if (matrixMod) {
        matrixMod.resumeGardenLoop();
        return;
    }
    loadMatrix()
        .then((mod) => mod.resumeGardenLoop())
        .catch((err) => console.error('[Entropy Garden] matrix failed to load', err));
}

export function stopGardenLoop() {
    if (matrixMod) {
        matrixMod.stopGardenLoop();
        return;
    }
    import('./state.js').then((s) => {
        s.setGardenLoopActive(false);
        if (s.gardenAnimId !== null) {
            cancelAnimationFrame(s.gardenAnimId);
            s.setGardenAnimId(null);
        }
    });
}

export function resizeCanvas() {
    if (matrixMod) matrixMod.resizeCanvas();
    else loadMatrix().then((mod) => mod.resizeCanvas());
}

export function setMatrixNeedsRedraw() {
    import('./state.js').then((s) => s.setNeedsFullRedraw(true));
}

export async function loadArcadeLevel() {
    const mod = await loadArcade();
    mod.loadArcadeLevel();
}

export function getTerminalContainer() {
    return terminalMod?.terminalContainer ?? document.getElementById('terminal-container');
}

export function getTermInput() {
    return terminalMod?.termInput ?? document.getElementById('term-input');
}

// Preload matrix + terminal after first paint (matrix drives cipher rings + panopticon loop)
function preloadGardenModules() {
    loadMatrix().catch(() => {});
    loadTerminal().catch(() => {});
}

if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(preloadGardenModules);
} else {
    setTimeout(preloadGardenModules, 200);
}
