import { sfx, playSound, perf, ICO_SYMBOLS } from '../core/shared.js';
import {
    isSingularityActive,
    currentPoemIndex,
    activeUtterances,
    isCorrupted,
    singularityAnimId,
    gardenAnimId,
    setIsSingularityActive,
    setSingularityAnimId,
    setCurrentPoemIndex,
    setGardenLoopActive,
    setGardenAnimId,
} from '../core/state.js';
import { buildSingularityPoemPool } from '../data/singularity-poems.data.js';

function pushTerminalLog(msg) {
    if (typeof globalThis.pushTerminalLog === 'function') globalThis.pushTerminalLog(msg);
}

function stopGardenLoop() {
    setGardenLoopActive(false);
    if (gardenAnimId !== null) {
        cancelAnimationFrame(gardenAnimId);
        setGardenAnimId(null);
    }
    import('../lazy.js').then((mod) => mod.stopGardenLoop()).catch(() => {});
}

let angleX = 0;
let angleY = 0;
let isDragging3D = false;
let lastMouseX;
let lastMouseY;
let draw3DFrame = 0;
let speechQueueToken = 0;
let visualPoemTimer = null;

function singularityCanvas() {
    return document.getElementById('singularity-canvas');
}

function isIosSingularity() {
    return perf.isIOS || document.body.classList.contains('ios-ui');
}

function usesSingularityVoiceover() {
    return !isIosSingularity();
}

function restoreSingularityButtonLabels() {
    const nextBtn = document.getElementById('next-poem-btn');
    const resetBtn = document.getElementById('reset-timeline-btn');
    if (nextBtn) nextBtn.textContent = '[NEXT TRANSMISSION]';
    if (resetBtn) resetBtn.textContent = '[RETURN TO GARDEN]';
}

function setIosSingularityButtonLabels(showNext) {
    const nextBtn = document.getElementById('next-poem-btn');
    const resetBtn = document.getElementById('reset-timeline-btn');
    if (nextBtn) {
        nextBtn.textContent = 'Next';
        nextBtn.style.display = showNext ? 'inline-block' : 'none';
    }
    if (resetBtn) resetBtn.textContent = 'Exit';
}

export function stopSingularity3D() {
    cancelSingularitySpeech();
    if (singularityAnimId) {
        cancelAnimationFrame(singularityAnimId);
        setSingularityAnimId(null);
    }
}

function cancelSingularitySpeech() {
    speechQueueToken += 1;
    if (visualPoemTimer) {
        clearInterval(visualPoemTimer);
        visualPoemTimer = null;
    }
    if (usesSingularityVoiceover()) {
        window.speechSynthesis?.cancel();
    }
    activeUtterances.length = 0;
}

function hideSingularityChrome() {
    document.body.classList.add('singularity-active');
    const hamburger = document.getElementById('hamburger-icon');
    if (hamburger) hamburger.style.display = 'none';
    document.getElementById('mode-btn')?.classList.remove('active');
    document.getElementById('terminal-container')?.classList.remove('active');
    document.getElementById('term-input')?.blur();
}

export function clearSingularityPresentation() {
    document.body.classList.remove('singularity-active');
    const overlay = document.getElementById('singularity-overlay');
    overlay?.classList.remove('singularity-ios-simple', 'singularity-ios-layout');
    const bg = document.getElementById('singularity-bg');
    const canvas = singularityCanvas();
    if (bg) bg.style.display = '';
    if (canvas) canvas.style.display = '';
    restoreSingularityButtonLabels();
    const hamburger = document.getElementById('hamburger-icon');
    if (hamburger) hamburger.style.display = '';
}

function resizeSingularityCanvas() {
    const canvas = singularityCanvas();
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, perf.dprCap);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
}

function bindSingularityCanvas() {
    const canvas = singularityCanvas();
    if (!canvas || canvas.dataset.bound) return;
    if (perf.isIOS || document.body.classList.contains('ios-ui')) return;
    canvas.dataset.bound = '1';
    canvas.addEventListener('mousedown', handle3DStart);
    canvas.addEventListener('touchstart', handle3DStart, { passive: false });
    canvas.addEventListener('mousemove', handle3DMove);
    canvas.addEventListener('touchmove', handle3DMove, { passive: false });
    canvas.addEventListener('mouseup', handle3DEnd);
    canvas.addEventListener('touchend', handle3DEnd);
}

function activeSingularityPoems() {
    return buildSingularityPoemPool(isCorrupted);
}

// --- INTERACTIVE 3D ENGINE (OPAQUE ICO-SPHERE WITH SYMBOLS) ---
function resetSingularity3DAnim() {
    if (singularityAnimId) {
        cancelAnimationFrame(singularityAnimId);
        setSingularityAnimId(null);
    }
}

function init3D() {
    const canvas = singularityCanvas();
    if (!canvas) return;
    bindSingularityCanvas();
    resetSingularity3DAnim();
    draw3DFrame = 0;
    resizeSingularityCanvas();
    const sCtx = canvas.getContext('2d');
    if (!sCtx) return;
    
    // Golden ratio for icosahedron vertices
    const t = (1.0 + Math.sqrt(5.0)) / 2.0;
    const verts = [ 
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], 
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], 
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1] 
    ];
    
    // Define the 20 triangular faces using the vertex indices
    const faces = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    
    const symbols = ICO_SYMBOLS;
    
    const iosSingularity = perf.isIOS || document.body.classList.contains('ios-ui');

    function draw3D() {
        draw3DFrame += 1;
        if (!iosSingularity && perf.isMobile && draw3DFrame % 2 === 1) {
            setSingularityAnimId(requestAnimationFrame(draw3D));
            return;
        }

        sCtx.clearRect(0, 0, canvas.width, canvas.height); 
        
        const cx = canvas.width / 2; 
        const cy = canvas.height / 2; 
        const scale = perf.isMobile ? 115 : 150;
        
        if(!isDragging3D) { angleY += 0.005; angleX += 0.002; } 
        
        const cosX = Math.cos(angleX); const sinX = Math.sin(angleX);
        const cosY = Math.cos(angleY); const sinY = Math.sin(angleY);

        // 1. Transform and project all vertices
        verts.forEach((v) => {
            let x1 = v[0] * cosY - v[2] * sinY; 
            let z1 = v[0] * sinY + v[2] * cosY; 
            let y1 = v[1];
            
            let y2 = y1 * cosX - z1 * sinX; 
            let z2 = y1 * sinX + z1 * cosX; 
            let x2 = x1;
            
            let f = 400 / (400 + z2); 
            
            // Store depth and 2D coordinates
            v.z_depth = z2; 
            v.px = x2 * scale * f + cx; 
            v.py = y2 * scale * f + cy;
        });
        
        // 2. Prepare the faces
        let projectedFaces = faces.map((faceIndices, index) => {
            const v0 = verts[faceIndices[0]];
            const v1 = verts[faceIndices[1]];
            const v2 = verts[faceIndices[2]];
            
            return {
                v0: v0, v1: v1, v2: v2,
                z: (v0.z_depth + v1.z_depth + v2.z_depth) / 3, // Average depth
                symbol: symbols[index]
            };
        });
        
        // Sort faces from furthest to closest (Painter's Algorithm)
        projectedFaces.sort((a, b) => b.z - a.z);
        
        // 3. Draw the faces
        sCtx.lineWidth = 1.5;
        sCtx.lineJoin = 'round';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        
        projectedFaces.forEach(face => {
            // BACKFACE CULLING
            const vec1x = face.v1.px - face.v0.px;
            const vec1y = face.v1.py - face.v0.py;
            const vec2x = face.v2.px - face.v0.px;
            const vec2y = face.v2.py - face.v0.py;
            const crossProduct = (vec1x * vec2y) - (vec1y * vec2x);
            
            if (crossProduct < 0) return;

            // 1. Trace the triangle path
            sCtx.beginPath();
            sCtx.moveTo(face.v0.px, face.v0.py);
            sCtx.lineTo(face.v1.px, face.v1.py);
            sCtx.lineTo(face.v2.px, face.v2.py);
            sCtx.closePath();
            
            // 2. Fill the face background normally
            sCtx.fillStyle = 'rgba(5, 5, 5, 0.95)'; 
            sCtx.fill();
            
           // ----------------------------------------------------
            // 3. THE 3D MASKING & PERSPECTIVE SKEW
            sCtx.save();
            
            // Turn the current triangle path into a strict boundary mask
            sCtx.clip(); 
            
            // Calculate the exact centroid of the face
            const Cx = (face.v0.px + face.v1.px + face.v2.px) / 3;
            const Cy = (face.v0.py + face.v1.py + face.v2.py) / 3;
            
            // --- THE AFFINE TRANSFORM MATH ---
            // We map a perfect 2D flat triangle (Radius 100) to the skewed 3D screen vertices
            const R = 100;
            const h = (Math.sqrt(3) / 2) * R; // ~86.6
            const halfR = R / 2;              // 50
            
            // Calculate the 2D matrix parameters based on how the 3D vertices stretched
            const c = -(face.v0.px - Cx) / R;
            const d = -(face.v0.py - Cy) / R;
            const a = ((face.v2.px - Cx) - c * halfR) / h;
            const b = ((face.v2.py - Cy) - d * halfR) / h;
            const e = Cx;
            const f = Cy;

            if (![a, b, c, d, e, f].every(Number.isFinite)) {
                sCtx.restore();
                return;
            }
            
            // Everything drawn after this line will be skewed into perfect 3D perspective.
            // Apply the matrix to the canvas!
            sCtx.transform(a, b, c, d, e, f);
            
            sCtx.font = `65px Avenir, sans-serif`; 
            sCtx.fillStyle = '#0f0';
            
            // 1. Force horizontal centering just to be absolutely safe
            sCtx.textAlign = 'center';
            sCtx.textBaseline = 'middle';
            
            // 2. Measure the exact painted pixel boundaries of the specific symbol
            const metrics = sCtx.measureText(face.symbol);
            
            // 3. Calculate the true optical center (fixes the heavy X drifting upward)
            const nudgeY = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
            
            // 4. Draw the symbol using our precise vertical nudge
            sCtx.fillText(face.symbol, 0, nudgeY);
            
            // Erase the matrix and mask so the next face isn't affected
            sCtx.restore();

            // ----------------------------------------------------
            // 4. Draw the glowing neon border LAST
            // (Drawing it after the restore ensures the border sits cleanly on top of the masked text)
            sCtx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            sCtx.stroke();
        });

        if (!iosSingularity) {
            setSingularityAnimId(requestAnimationFrame(draw3D));
        } else {
            setSingularityAnimId(null);
        }
    }
    draw3D();
}
// --- SINGULARITY EVENT LOGIC ---
function bindSingularityOverlayUi() {
    if (isIosSingularity()) return;
    const overlay = document.getElementById('singularity-overlay');
    if (!overlay || overlay.dataset.overlayUiBound) return;
    overlay.dataset.overlayUiBound = '1';
    const onTap = (e) => {
        if (!document.body.classList.contains('singularity-active')) return;
        const next = e.target.closest('#next-poem-btn');
        const reset = e.target.closest('#reset-timeline-btn');
        if (!next && !reset) return;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        if (next) cyclePoem();
        else {
            const resetFn = globalThis.gardenHooks?.resetTimeline ?? globalThis.resetTimeline;
            if (typeof resetFn === 'function') resetFn();
        }
    };
    overlay.addEventListener('click', onTap, true);
    overlay.addEventListener('touchend', onTap, { capture: true, passive: false });
}

function revealIosSingularityOverlay(showNextBtn) {
    const overlay = document.getElementById('singularity-overlay');
    const bg = document.getElementById('singularity-bg');
    const canvas = singularityCanvas();
    const poem = document.getElementById('poem-container');
    const controls = document.getElementById('singularity-controls');
    if (!overlay) return;

    overlay.classList.add('singularity-ios-simple');
    overlay.classList.remove('singularity-ios-layout');
    overlay.style.display = 'flex';
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';

    if (bg) bg.style.display = 'none';
    if (canvas) canvas.style.display = 'none';
    if (poem) {
        poem.style.display = 'block';
        poem.style.visibility = 'visible';
        poem.innerHTML = '';
    }

    setIosSingularityButtonLabels(showNextBtn);
    stopGardenLoop();

    if (controls) {
        controls.style.opacity = '1';
        controls.style.pointerEvents = 'auto';
        controls.style.animation = 'none';
    }
    bindSingularityControls();
}

function revealSingularityOverlay(showNextBtn = true) {
    if (isIosSingularity()) {
        revealIosSingularityOverlay(showNextBtn);
        return;
    }

    const overlay = document.getElementById('singularity-overlay');
    const canvas = singularityCanvas();
    const poem = document.getElementById('poem-container');
    const nextBtn = document.getElementById('next-poem-btn');
    const controls = document.getElementById('singularity-controls');
    if (!overlay) return;

    overlay.classList.remove('singularity-ios-simple', 'singularity-ios-layout');

    overlay.style.display = 'flex';
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
    if (poem) {
        poem.style.display = 'block';
        poem.style.visibility = 'visible';
    }
    if (canvas) {
        canvas.style.display = 'block';
        canvas.style.visibility = 'visible';
    }
    if (nextBtn) nextBtn.style.display = showNextBtn ? 'inline-block' : 'none';

    stopGardenLoop();
    if (canvas) {
        try {
            init3D();
        } catch (err) {
            console.error('[Entropy Garden] singularity 3D init failed', err);
        }
    }

    if (controls) {
        controls.style.animation = 'none';
        void controls.offsetWidth;
        controls.style.pointerEvents = 'auto';
        controls.style.zIndex = '100050';
        controls.style.touchAction = 'manipulation';
        controls.style.animation = 'btnFadeIn 1.5s ease-in forwards 2.5s';
    }
    bindSingularityOverlayUi();
    bindSingularityControls();
}

function openSingularityRitual(showNextBtn = true, poemText) {
    if (!isSingularityActive && !document.body.classList.contains('singularity-active')) return;

    if (!isIosSingularity()) {
        playSound(sfx.missionCleared);
        pushTerminalLog('!!! RITUAL COMPLETE !!!');
    }
    setCurrentPoemIndex(0);
    revealSingularityOverlay(showNextBtn);

    const pool = activeSingularityPoems();
    const poem = poemText ?? pool[currentPoemIndex] ?? pool[0];
    speakSingularity(poem);
}

function triggerSingularity() {
    if (isIosSingularity()) return;

    setIsSingularityActive(true);
    globalThis.gardenHooks?.firePanopticonComment?.('singularity', { force: true });
    globalThis.gardenHooks?.recordBehavior?.('singularity');
    hideSingularityChrome();
    globalThis.unlockTrophy?.('singularity_ritual');
    setTimeout(() => openSingularityRitual(true), 500);
}

function highlightPoemLine(lineElements, index) {
    lineElements.forEach((el, i) => {
        if (i < index) {
            el.style.opacity = '0.3';
            el.style.textShadow = 'none';
            el.style.color = 'var(--neon-green)';
            el.style.animation = 'none';
        } else if (i > index) {
            el.style.opacity = '0.1';
            el.style.textShadow = 'none';
            el.style.animation = 'none';
        }
    });

    const currentEl = lineElements[index];
    if (!currentEl) return;
    currentEl.style.opacity = '1';
    currentEl.style.color = '#ffffff';
    currentEl.style.textShadow = '0 0 15px var(--neon-green)';
    currentEl.style.animation = 'crtFlicker 0.15s infinite';
    try {
        currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {
        currentEl.scrollIntoView(false);
    }
}

function buildSpeechItems(lines) {
    const useLineSpeech = perf.isMobile || document.body.classList.contains('ios-ui');
    if (useLineSpeech) {
        return lines.map((text, lineIndex) => ({ text, lineIndex }));
    }

    const items = [];
    lines.forEach((line, lineIndex) => {
        const phrases = line.split(/([.,!?;])+/);
        phrases.forEach((phrase) => {
            if (!phrase.trim()) return;
            const isPunctuation = /[.,!?;]/.test(phrase);
            items.push({
                text: phrase,
                lineIndex,
                silent: isPunctuation,
                rate: /[,;]/.test(phrase) ? 4.5 : 3,
            });
        });
    });
    return items;
}

function runVisualPoemScroll(lineElements, token) {
    if (perf.isIOS || document.body.classList.contains('ios-ui')) return;
    if (!lineElements.length) return;
    let index = 0;
    highlightPoemLine(lineElements, index);
    visualPoemTimer = setInterval(() => {
        if (token !== speechQueueToken) {
            clearInterval(visualPoemTimer);
            visualPoemTimer = null;
            return;
        }
        index += 1;
        if (index >= lineElements.length) {
            clearInterval(visualPoemTimer);
            visualPoemTimer = null;
            return;
        }
        highlightPoemLine(lineElements, index);
    }, perf.isIOS ? 2400 : (perf.isMobile ? 3200 : 2600));
}

function runSpeechQueue(items, lineElements, token) {
    const synth = window.speechSynthesis;
    if (!synth || !items.length) {
        runVisualPoemScroll(lineElements, token);
        return;
    }

    let index = 0;
    const speakNext = () => {
        if (token !== speechQueueToken || index >= items.length) return;

        const item = items[index++];
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.volume = item.silent ? 0 : 1;
        if (item.silent) utterance.rate = item.rate || 3;
        else utterance.rate = perf.isMobile ? 0.92 : 1;

        utterance.onstart = () => {
            if (!item.silent && item.lineIndex != null) {
                highlightPoemLine(lineElements, item.lineIndex);
            }
        };
        utterance.onend = speakNext;
        utterance.onerror = speakNext;

        activeUtterances.push(utterance);
        synth.speak(utterance);
    };

    speakNext();
}

function renderIosSingularityPoem(container, poemText) {
    container.innerHTML = '';
    const body = document.createElement('div');
    body.className = 'ios-poem-text';
    body.textContent = poemText.trim();
    container.appendChild(body);
    container.scrollTop = 0;
}

function speakSingularity(poemText) {
    cancelSingularitySpeech();
    const token = speechQueueToken;

    const container = document.getElementById('poem-container');
    if (!container) return;

    if (isIosSingularity()) {
        renderIosSingularityPoem(container, poemText);
        return;
    }

    container.innerHTML = '';
    container.style.display = 'block';
    container.style.color = 'var(--neon-green)';

    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.right = '0';
    container.style.margin = '0 auto';
    container.style.transform = 'none';
    container.style.width = 'min(88vw, 800px)';
    container.style.zIndex = '100040';
    container.style.top = '15%';
    container.style.height = '70vh';
    container.style.overflowY = 'hidden';
    container.style.pointerEvents = 'none';

    const lines = poemText.split('\n').filter(line => line.trim() !== '');
    const lineElements = [];

    const topSpacer = document.createElement('div');
    topSpacer.style.height = '35vh';
    topSpacer.style.pointerEvents = 'none';
    container.appendChild(topSpacer);

    lines.forEach((line) => {
        const span = document.createElement('span'); 
        span.className = 'poem-line'; 
        span.innerText = line;
        span.style.display = 'block'; 
        span.style.opacity = '0.1'; 
        span.style.transition = 'opacity 0.4s ease, text-shadow 0.4s ease, color 0.4s ease';
        span.style.margin = '20px 0'; 
        span.style.textAlign = 'center';
        container.appendChild(span);
        lineElements.push(span);
    });

    const bottomSpacer = document.createElement('div');
    bottomSpacer.style.height = '35vh';
    bottomSpacer.style.pointerEvents = 'none';
    container.appendChild(bottomSpacer);

    if (lineElements[0]) {
        highlightPoemLine(lineElements, 0);
    }

    const items = buildSpeechItems(lines);
    if (!usesSingularityVoiceover()) {
        runVisualPoemScroll(lineElements, token);
        return;
    }

    setTimeout(() => runSpeechQueue(items, lineElements, token), 50);
}

let cyclePoemBusy = false;

function cyclePoem() {
    const nextBtn = document.getElementById('next-poem-btn');
    if (!nextBtn || !document.body.classList.contains('singularity-active')) return;
    if (cyclePoemBusy || nextBtn.disabled) return;
    cyclePoemBusy = true;

    cancelSingularitySpeech();

    const finishCycle = () => {
        const pool = activeSingularityPoems();
        const nextIndex = (currentPoemIndex + 1) % pool.length;
        setCurrentPoemIndex(nextIndex);
        const poem = pool[nextIndex];
        speakSingularity(poem);
        if (!isIosSingularity()) pushTerminalLog('> NEXT TRANSMISSION DECODED.');
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.innerText = isIosSingularity() ? 'Next' : '[NEXT TRANSMISSION]';
        cyclePoemBusy = false;
        const container = document.getElementById('poem-container');
        if (container) container.scrollTop = 0;
    };

    if (isIosSingularity()) {
        finishCycle();
        return;
    }

    nextBtn.disabled = true;
    nextBtn.style.opacity = '0.5';
    nextBtn.innerText = '[ DECODING... ]';

    if (!usesSingularityVoiceover()) {
        playSound(sfx.transition);
        finishCycle();
        return;
    }

    const wasInterrupted = window.speechSynthesis?.speaking || window.speechSynthesis?.pending;
    const activeSound = wasInterrupted ? sfx.clearThroat : sfx.transition;
    playSound(activeSound);

    let decoded = false;
    const unlock = () => {
        if (decoded) return;
        decoded = true;
        activeSound.onended = null;
        finishCycle();
    };
    activeSound.onended = unlock;
    setTimeout(unlock, 2200);
}

export function pauseSingularityPresentation() {
    cancelSingularitySpeech();
    if (singularityAnimId) {
        cancelAnimationFrame(singularityAnimId);
        setSingularityAnimId(null);
    }
}

export function resumeSingularityPresentation() {
    if (isIosSingularity()) return;
    if (!isSingularityActive || document.hidden) return;
    const overlay = document.getElementById('singularity-overlay');
    if (!overlay || overlay.style.display === 'none') return;
    pauseSingularityPresentation();
    const canvas = singularityCanvas();
    if (canvas) {
        try {
            init3D();
        } catch (err) {
            console.error('[Entropy Garden] singularity resume failed', err);
        }
    }
    const pool = activeSingularityPoems();
    if (pool.length) speakSingularity(pool[currentPoemIndex] ?? pool[0]);
}

export function reconcileSingularityPoem() {
    if (isIosSingularity()) return;
    if (!isSingularityActive && !document.body.classList.contains('singularity-active')) return;
    const pool = activeSingularityPoems();
    if (!pool.length) return;
    const idx = Math.min(currentPoemIndex, pool.length - 1);
    setCurrentPoemIndex(idx);
    speakSingularity(pool[idx] ?? pool[0]);
}

let singularityControlsTapAt = 0;

function bindSingularityControls() {
    const controls = document.getElementById('singularity-controls');
    const nextBtn = document.getElementById('next-poem-btn');
    const resetBtn = document.getElementById('reset-timeline-btn');
    if (!controls) return;

    const runOnce = (handler) => {
        const now = Date.now();
        if (now - singularityControlsTapAt < 400) return;
        singularityControlsTapAt = now;
        handler();
    };

    const exitGarden = () => {
        const reset = globalThis.gardenHooks?.resetTimeline ?? globalThis.resetTimeline;
        if (typeof reset === 'function') reset();
    };

    if (nextBtn) {
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            runOnce(() => cyclePoem());
        };
    }

    if (resetBtn) {
        resetBtn.onclick = (e) => {
            e.stopPropagation();
            runOnce(exitGarden);
        };
    }

    if (isIosSingularity()) return;

    if (controls.dataset.delegationBound) return;
    controls.dataset.delegationBound = '1';
    controls.addEventListener('touchend', (e) => {
        const btn = e.target.closest('.singularity-btn');
        if (!btn) return;
        e.stopPropagation();
        if (btn.id === 'next-poem-btn') runOnce(() => cyclePoem());
        if (btn.id === 'reset-timeline-btn') runOnce(exitGarden);
    }, { passive: true });
}



function handle3DStart(e) {
    isDragging3D = true;
    lastMouseX = e.clientX || e.touches[0].clientX;
    lastMouseY = e.clientY || e.touches[0].clientY;
}
function handle3DMove(e) {
    if (isDragging3D) {
        let cx = e.clientX || e.touches[0].clientX;
        let cy = e.clientY || e.touches[0].clientY;
        angleY += (cx - lastMouseX) * 0.01;
        angleX += (cy - lastMouseY) * 0.01;
        lastMouseX = cx;
        lastMouseY = cy;
    }
}
function handle3DEnd() { isDragging3D = false; }

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        bindSingularityCanvas();
        bindSingularityOverlayUi();
        bindSingularityControls();
    }, { once: true });
} else {
    bindSingularityCanvas();
    bindSingularityOverlayUi();
    bindSingularityControls();
}

export {
    triggerSingularity,
    cyclePoem,
    init3D,
    bindSingularityControls,
};
