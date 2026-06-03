// Lazy module loader with call-through stubs

import { setResizeCanvasHook } from './canvas-resize.js';
import { perf, sfx, playSound } from './shared.js';

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
            globalThis.gardenHooks = globalThis.gardenHooks || {};
            globalThis.gardenHooks.toggleTerminal = mod.toggleTerminal;
            globalThis.gardenHooks.openTerminal = () => {
                revealTerminalShell();
                return mod.openTerminal();
            };
            terminalQueue.splice(0).forEach((entry) => {
                if (entry && typeof entry === 'object' && 'msg' in entry) {
                    mod.pushTerminalLog(entry.msg, entry.options);
                } else {
                    mod.pushTerminalLog(entry);
                }
            });
            return mod;
        }).catch((err) => {
            terminalPromise = null;
            console.error('[Entropy Garden] terminal.js failed to import', err);
            throw err;
        });
    }
    return terminalPromise;
}

export function loadSingularity() {
    if (!singularityPromise) {
        singularityPromise = import('./modules/singularity.js')
            .then((mod) => {
                singularityMod = mod;
                return mod;
            })
            .catch((err) => {
                singularityPromise = null;
                console.error('[Entropy Garden] singularity.js failed to import', err);
                throw err;
            });
    }
    return singularityPromise;
}

export function loadMatrix() {
    if (!matrixPromise) {
        matrixPromise = import('./modules/matrix.js')
            .then((mod) => {
                matrixMod = mod;
                setResizeCanvasHook(() => mod.resizeCanvas());
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

export function pushTerminalLog(msg, options) {
    if (terminalMod) terminalMod.pushTerminalLog(msg, options);
    else {
        terminalQueue.push({ msg, options });
        loadTerminal();
    }
}

globalThis.pushTerminalLog = pushTerminalLog;

function isIosPoemMode() {
    return perf.isIOS || document.body.classList.contains('ios-ui');
}

export function triggerSingularity() {
    if (isIosPoemMode()) {
        return import('./ios-poems.js').then((m) => m.openIosPoemArchive(0));
    }

    const run = (mod) => {
        try {
            mod.triggerSingularity();
        } catch (err) {
            console.error('[Entropy Garden] triggerSingularity failed', err);
            revealSingularityShell();
        }
    };
    if (singularityMod) {
        run(singularityMod);
        return;
    }
    loadSingularity()
        .then(run)
        .catch((err) => {
            console.error('[Entropy Garden] singularity failed to load:', err);
            pushTerminalLog('> SINGULARITY MODULE FAILED TO LOAD (stale cache or deploy path).');
            pushTerminalLog('> Hard-refresh, clear site data, or check Cloudflare dist + Not found = 404 page.');
            revealSingularityShell();
        });
}

const FALLBACK_POEM = `descent

open your eyes
see through the veil
return earth to eden
the prime thread woven beneath our understanding`;

/** Last-resort overlay if the singularity module fails to import. */
function revealSingularityShell() {
    if (isIosPoemMode()) {
        import('./ios-poems.js').then((m) => m.openIosPoemArchive(0)).catch(() => {});
        return;
    }
    import('./state.js').then(({ setIsSingularityActive }) => {
        setIsSingularityActive(true);
        document.body.classList.add('singularity-active');
        const overlay = document.getElementById('singularity-overlay');
        const bg = document.getElementById('singularity-bg');
        const canvas = document.getElementById('singularity-canvas');
        const poem = document.getElementById('poem-container');
        const controls = document.getElementById('singularity-controls');
        const nextBtn = document.getElementById('next-poem-btn');
        const resetBtn = document.getElementById('reset-timeline-btn');
        const ios = document.body.classList.contains('ios-ui');
        if (!overlay) return;
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
        if (ios) {
            overlay.classList.add('singularity-ios-simple');
            if (bg) bg.style.display = 'none';
            if (canvas) canvas.style.display = 'none';
            if (nextBtn) {
                nextBtn.textContent = 'Next';
                nextBtn.style.display = 'inline-block';
            }
            if (resetBtn) resetBtn.textContent = 'Exit';
        } else {
            if (canvas) canvas.style.display = 'block';
            if (nextBtn) nextBtn.style.display = 'inline-block';
        }
        if (controls) controls.style.opacity = '1';
        import('./modules/singularity.js')
            .then((mod) => mod.bindSingularityControls?.())
            .catch(() => {});

        if (poem) {
            poem.style.display = 'block';
            poem.innerHTML = '';
            if (ios) {
                const body = document.createElement('div');
                body.className = 'ios-poem-text';
                body.textContent = FALLBACK_POEM.trim();
                poem.appendChild(body);
            } else {
                FALLBACK_POEM.split('\n').forEach((line, i) => {
                    const span = document.createElement('span');
                    span.className = 'poem-line';
                    span.textContent = line;
                    span.style.display = 'block';
                    span.style.textAlign = 'center';
                    span.style.margin = '16px 0';
                    span.style.opacity = i === 0 ? '1' : '0.35';
                    span.style.color = 'var(--neon-green)';
                    poem.appendChild(span);
                });
            }
        }
        stopGardenLoop();
        if (!ios) {
            import('./shared.js').then(({ sfx, playSound }) => playSound(sfx.missionCleared)).catch(() => {});
        }
    });
}

export function triggerOspreyEvent() {
    if (isIosPoemMode()) {
        return import('./ios-poems.js').then((m) => m.openIosOspreyPoem());
    }
    loadSingularity().then((mod) => mod.triggerOspreyEvent());
}

export function stopSingularity3D() {
    if (isIosPoemMode()) return;
    if (singularityMod?.stopSingularity3D) singularityMod.stopSingularity3D();
    else loadSingularity().then((mod) => mod.stopSingularity3D?.());
}

export function pauseSingularityPresentation() {
    if (isIosPoemMode()) return;
    if (singularityMod?.pauseSingularityPresentation) singularityMod.pauseSingularityPresentation();
}

export function resumeSingularityPresentation() {
    if (isIosPoemMode()) return;
    if (singularityMod?.resumeSingularityPresentation) {
        singularityMod.resumeSingularityPresentation();
        return;
    }
    loadSingularity().then((mod) => mod.resumeSingularityPresentation?.());
}

export function cyclePoem() {
    if (isIosPoemMode()) {
        return import('./ios-poems.js').then((m) => m.stepIosPoem(1));
    }
    if (singularityMod?.cyclePoem) {
        singularityMod.cyclePoem();
        return;
    }
    loadSingularity().then((mod) => mod.cyclePoem());
}

export function reconcileSingularityPoem() {
    if (isIosPoemMode()) {
        return import('./ios-poems.js').then((m) => m.refreshIosPoemArchive());
    }
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

export function restartGardenLoop() {
    if (matrixMod) {
        matrixMod.restartGardenLoop();
        return;
    }
    loadMatrix()
        .then((mod) => mod.restartGardenLoop())
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

/** Open terminal UI via DOM (works before terminal.js finishes loading). */
export function revealTerminalShell() {
    if (!document.body.classList.contains('garden-ready')) return false;
    const term = document.getElementById('terminal-container');
    const input = document.getElementById('term-input');
    if (!term) return false;

    const iosLayout = document.body.classList.contains('ios-ui');
    const wasOpen = term.classList.contains('active');
    term.removeAttribute('hidden');
    term.classList.add('reveal-in', 'active');
    if (!iosLayout) term.classList.add('is-sliver');
    if (iosLayout) document.getElementById('ios-terminal-toggle')?.removeAttribute('hidden');

    if (input) {
        input.tabIndex = 0;
        setTimeout(() => {
            try {
                input.focus({ preventScroll: true });
            } catch {
                input.focus();
            }
        }, 80);
    }
    if (!wasOpen && globalThis.EntropyTerminalSfx?.open) {
        globalThis.EntropyTerminalSfx.open();
    }
    return true;
}

export function openTerminal() {
    const shellOpen = revealTerminalShell();
    return loadTerminal()
        .then((mod) => {
            globalThis.gardenHooks = globalThis.gardenHooks || {};
            globalThis.gardenHooks.toggleTerminal = mod.toggleTerminal;
            globalThis.gardenHooks.openTerminal = () => openTerminal();
            if (!shellOpen) mod.focusTerminal?.();
            else mod.focusTerminal?.();
            return mod;
        })
        .catch((err) => {
            console.error('[Entropy Garden] terminal module failed to load', err);
            revealTerminalShell();
            throw err;
        });
}

globalThis.gardenHooks = globalThis.gardenHooks || {};
globalThis.gardenHooks.openTerminal = () => openTerminal();

// Preload matrix + terminal after first paint (matrix drives cipher rings + panopticon loop)
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
        import('./ios-poems.js').then((m) => m.initIosPoemArchive()).catch(() => {});
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
