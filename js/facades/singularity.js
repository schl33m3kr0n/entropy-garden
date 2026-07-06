import { perf } from '../core/shared.js';
import { singularityLoader } from '../loaders/singularity.js';
import { pushTerminalLog } from './terminal.js';

function isIosPoemMode() {
    return perf.isIOS || document.body.classList.contains('ios-ui');
}

export function loadSingularity() {
    return singularityLoader.load();
}

const FALLBACK_POEM = `descent

open your eyes
see through the veil
return earth to eden
the prime thread woven beneath our understanding`;

/** Last-resort overlay if the singularity module fails to import. */
function revealSingularityShell() {
    if (isIosPoemMode()) {
        import('../ios/ios-poems.js').then((m) => m.openIosPoemArchive(0)).catch(() => {});
        return;
    }
    import('../core/state.js').then(({ setIsSingularityActive }) => {
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
        import('../modules/singularity.js')
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
        import('./matrix.js').then(({ stopGardenLoop }) => stopGardenLoop());
        if (!ios) {
            import('../core/shared.js').then(({ sfx, playSound }) => playSound(sfx.missionCleared)).catch(() => {});
        }
    });
}

export function triggerSingularity() {
    if (isIosPoemMode()) {
        return import('../ios/ios-poems.js').then((m) => m.openIosPoemArchive(0));
    }

    const run = (mod) => {
        try {
            mod.triggerSingularity();
        } catch (err) {
            console.error('[Entropy Garden] triggerSingularity failed', err);
            revealSingularityShell();
        }
    };
    if (singularityLoader.loaded) {
        run(singularityLoader.loaded);
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

export function stopSingularity3D() {
    if (isIosPoemMode()) return;
    if (singularityLoader.loaded?.stopSingularity3D) singularityLoader.loaded.stopSingularity3D();
    else loadSingularity().then((mod) => mod.stopSingularity3D?.());
}

export function pauseSingularityPresentation() {
    if (isIosPoemMode()) return;
    if (singularityLoader.loaded?.pauseSingularityPresentation) {
        singularityLoader.loaded.pauseSingularityPresentation();
    }
}

export function resumeSingularityPresentation() {
    if (isIosPoemMode()) return;
    if (singularityLoader.loaded?.resumeSingularityPresentation) {
        singularityLoader.loaded.resumeSingularityPresentation();
        return;
    }
    loadSingularity().then((mod) => mod.resumeSingularityPresentation?.());
}

export function cyclePoem() {
    if (isIosPoemMode()) {
        return import('../ios/ios-poems.js').then((m) => m.stepIosPoem(1));
    }
    if (singularityLoader.loaded?.cyclePoem) {
        singularityLoader.loaded.cyclePoem();
        return;
    }
    loadSingularity().then((mod) => mod.cyclePoem());
}

export function reconcileSingularityPoem() {
    if (isIosPoemMode()) {
        return import('../ios/ios-poems.js').then((m) => m.refreshIosPoemArchive());
    }
    loadSingularity().then((mod) => mod.reconcileSingularityPoem());
}
