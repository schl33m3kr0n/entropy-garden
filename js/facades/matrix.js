import { matrixLoader } from '../loaders/matrix.js';

export function loadMatrix() {
    return matrixLoader.load();
}

export async function ensureMatrix() {
    return loadMatrix();
}

export function startGardenLoop() {
    if (matrixLoader.loaded) {
        matrixLoader.loaded.startGardenLoop();
        return;
    }
    loadMatrix()
        .then((mod) => mod.startGardenLoop())
        .catch((err) => console.error('[Entropy Garden] matrix failed to load', err));
}

export function resumeGardenLoop() {
    if (matrixLoader.loaded) {
        matrixLoader.loaded.resumeGardenLoop();
        return;
    }
    loadMatrix()
        .then((mod) => mod.resumeGardenLoop())
        .catch((err) => console.error('[Entropy Garden] matrix failed to load', err));
}

export function restartGardenLoop() {
    if (matrixLoader.loaded) {
        matrixLoader.loaded.restartGardenLoop();
        return;
    }
    loadMatrix()
        .then((mod) => mod.restartGardenLoop())
        .catch((err) => console.error('[Entropy Garden] matrix failed to load', err));
}

export function stopGardenLoop() {
    if (matrixLoader.loaded) {
        matrixLoader.loaded.stopGardenLoop();
        return;
    }
    import('../core/state.js').then((s) => {
        s.setGardenLoopActive(false);
        if (s.gardenAnimId !== null) {
            cancelAnimationFrame(s.gardenAnimId);
            s.setGardenAnimId(null);
        }
    });
}

export function resizeCanvas() {
    if (matrixLoader.loaded) matrixLoader.loaded.resizeCanvas();
    else loadMatrix().then((mod) => mod.resizeCanvas());
}

export function setMatrixNeedsRedraw() {
    import('../core/state.js').then((s) => s.setNeedsFullRedraw(true));
}
