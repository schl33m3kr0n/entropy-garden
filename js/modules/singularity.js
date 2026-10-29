import { sfx, playSound, perf, ICO_SYMBOLS } from '../core/shared.js';
import { callHook, getHook } from '../core/hooks.js';
import { applyWebSpeechPausePreferences } from '../core/tts-pause.js';
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
import {
    buildSingularityPoemPool,
    findSingularityPoemByText,
    loadSingularityPoems,
    poemTitleFromText,
} from '../data/singularity-poems.data.js';

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

/** @type {AudioContext | null} */
let poemAudioCtx = null;
/** @type {AudioBufferSourceNode | null} */
let activePoemSource = null;
/** @type {GainNode | null} */
let activePoemGain = null;
let isPoemAudioPlaying = false;
/** @type {Map<string, Promise<{ buffer: AudioBuffer, timings: number[][] }>>} */
const poemAudioCache = new Map();

function getPoemAudioCtx() {
    if (!poemAudioCtx) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (AC) poemAudioCtx = new AC();
    }
    if (poemAudioCtx && poemAudioCtx.state === 'suspended') {
        poemAudioCtx.resume().catch(() => {});
    }
    return poemAudioCtx;
}

function singularityCanvas() {
    return document.getElementById('singularity-canvas');
}

function isIosSingularity() {
    return perf.isIOS || document.body.classList.contains('ios-ui');
}

function usesSingularityVoiceover() {
    return !isIosSingularity();
}

/** Prefer compact Samantha — Enhanced/Premium neural voices click hard on teardown. */
let singularityVoice = null;
let singularityVoicesBound = false;

/** Firefox re-opens the output device per utterance → loud click between lines. */
function isFirefoxSynth() {
    return /firefox\/\d/i.test(navigator.userAgent || '');
}

function isNeuralVoice(voice) {
    return /enhanced|premium|neural|superstar|novelty|eddy|flo|reed|shelley|sandy/i.test(voice?.name || '');
}

function pickSingularityVoice(voices) {
    if (!voices?.length) return null;
    const english = voices.filter((v) => /^en(-|_)/i.test(v.lang));
    const pool = english.length ? english : voices;
    const compact = pool.filter((v) => !isNeuralVoice(v));
    let prefer = compact.length ? compact : pool;
    // Firefox: stick to local OS voices — remote ones reconnect and click harder.
    if (isFirefoxSynth()) {
        const local = prefer.filter((v) => v.localService);
        if (local.length) prefer = local;
    }
    const byName = prefer.find((v) => /^samantha$/i.test(v.name) || /\bsamantha\b/i.test(v.name));
    if (byName) return byName;
    const byUri = prefer.find((v) => /samantha/i.test(v.voiceURI || ''));
    if (byUri) return byUri;
    if (!isFirefoxSynth()) {
        const byGoogle = prefer.find((v) => /google/i.test(v.name) && /^en(-|_)US$/i.test(v.lang));
        if (byGoogle) return byGoogle;
    }
    return prefer.find((v) => /^en(-|_)US$/i.test(v.lang)) || prefer[0] || null;
}

function refreshSingularityVoice() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    singularityVoice = pickSingularityVoice(synth.getVoices());
}

function ensureSingularityVoice() {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    if (!singularityVoicesBound) {
        singularityVoicesBound = true;
        refreshSingularityVoice();
        if (typeof synth.addEventListener === 'function') {
            synth.addEventListener('voiceschanged', refreshSingularityVoice);
        } else {
            synth.onvoiceschanged = refreshSingularityVoice;
        }
    }
    if (!singularityVoice) refreshSingularityVoice();
    return singularityVoice;
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

function stopPoemWebAudio() {
    isPoemAudioPlaying = false;
    const src = activePoemSource;
    const gain = activePoemGain;
    activePoemSource = null;
    activePoemGain = null;
    if (gain && poemAudioCtx) {
        try {
            const t = poemAudioCtx.currentTime;
            gain.gain.cancelScheduledValues(t);
            gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.035);
        } catch {
            /* ignore */
        }
    }
    if (src) {
        try {
            src.onended = null;
            src.stop(poemAudioCtx ? poemAudioCtx.currentTime + 0.04 : undefined);
        } catch {
            /* ignore */
        }
        setTimeout(() => {
            try { src.disconnect(); } catch { /* ignore */ }
            try { gain?.disconnect(); } catch { /* ignore */ }
        }, 60);
    } else if (gain) {
        try { gain.disconnect(); } catch { /* ignore */ }
    }
}

function cancelSingularitySpeech() {
    speechQueueToken += 1;
    if (visualPoemTimer) {
        clearInterval(visualPoemTimer);
        visualPoemTimer = null;
    }
    stopPoemWebAudio();
    const synth = window.speechSynthesis;
    // Hard cancel mid-stream is the loud end-pop — only do it when something is actually playing.
    if (usesSingularityVoiceover() && synth && (synth.speaking || synth.pending)) {
        try {
            synth.cancel();
        } catch {
            /* ignore */
        }
    }
    activeUtterances.length = 0;
}

function hideSingularityChrome() {
    document.body.classList.add('singularity-active');
    const hamburger = document.getElementById('hamburger-icon');
    if (hamburger) hamburger.style.display = 'none';
    document.getElementById('settings-menu')?.classList.remove('active', 'is-open');
    document.getElementById('settings-toggle')?.setAttribute('aria-expanded', 'false');
    const dropdown = document.getElementById('settings-dropdown');
    if (dropdown) dropdown.hidden = true;
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
            const resetFn = getHook('resetTimeline') ?? globalThis.resetTimeline;
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

    void (async () => {
        await loadSingularityPoems();

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
    })();
}

function triggerSingularity() {
    if (isIosSingularity()) return;

    setIsSingularityActive(true);
    callHook('firePanopticonComment', 'singularity', { force: true });
    callHook('recordBehavior', 'singularity');
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
    const container = currentEl.parentElement;
    if (container) {
        const top = currentEl.offsetTop - (container.clientHeight / 2) + (currentEl.offsetHeight / 2);
        try {
            container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        } catch (_) {
            container.scrollTop = Math.max(0, top);
        }
    }
}

function buildSpeechItems(lines) {
    // One utterance per line. Splitting on punctuation into silent fillers
    // starts/stops the audio unit between every clause and causes end pops.
    return lines.map((text, lineIndex) => ({ text, lineIndex }));
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

function attachSingularityUtterance(utterance) {
    const voice = ensureSingularityVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.volume = 1;
    utterance.rate = perf.isMobile ? 0.92 : 1;
    utterance.pitch = 1;
    activeUtterances.push(utterance);
    return utterance;
}

/**
 * Firefox: one utterance (one audio stream) with per-line chops.
 * Each line is truncated to its last full word and ends with `.`;
 * blank newlines separate lines so the engine pauses without reading markers
 * ( [[slnc]] / ellipses get spoken aloud through moz-tts ).
 * onboundary charIndex drives the poem scroll; elapsed-time is the fallback.
 */
function buildFirefoxPoemScript(items) {
    // Newlines are silent; avoid any pronounceable pause tokens.
    const pause = '\n\n';
    const ranges = [];
    const parts = [];
    let cursor = 0;

    items.forEach((item, i) => {
        let clean = String(item.text || '').replace(/\s+/g, ' ').trim();
        if (!clean) return;
        // Truncate at the last complete word — drop trailing punct/fragments.
        clean = clean.replace(/[\s.…,;:!?\u2014\u2013-]+$/u, '');
        const words = clean.split(/\s+/).filter(Boolean);
        if (!words.length) return;
        // Same period/comma pause prefs as eye voice (newlines ≈ long period pause).
        let lineText = applyWebSpeechPausePreferences(words.join(' '));
        if (!/[.!?]$/.test(lineText)) lineText += '.';

        if (parts.length) {
            parts.push(pause);
            cursor += pause.length;
        }
        const start = cursor;
        parts.push(lineText);
        cursor += lineText.length;
        ranges.push({
            start,
            end: cursor,
            lineIndex: item.lineIndex != null ? item.lineIndex : i,
        });
    });

    return { spoken: parts.join(''), ranges };
}

function runFirefoxSpeech(items, lineElements, token) {
    const synth = window.speechSynthesis;
    if (!synth) {
        runVisualPoemScroll(lineElements, token);
        return;
    }

    const { spoken, ranges } = buildFirefoxPoemScript(items);
    if (!spoken || !ranges.length) {
        runVisualPoemScroll(lineElements, token);
        return;
    }

    let rangePos = 0;
    let currentLine = ranges[0].lineIndex;
    let sawBoundary = false;
    highlightPoemLine(lineElements, currentLine);

    const utterance = attachSingularityUtterance(new SpeechSynthesisUtterance(spoken));

    const clearSync = () => {
        if (!visualPoemTimer) return;
        clearInterval(visualPoemTimer);
        visualPoemTimer = null;
    };

    // Only move forward through ranges — never jump back when charIndex jitters.
    const syncTo = (charIndex) => {
        if (token !== speechQueueToken) return;
        const idx = Math.max(0, charIndex | 0);
        let advanced = false;
        while (rangePos < ranges.length - 1 && idx >= ranges[rangePos + 1].start) {
            rangePos += 1;
            advanced = true;
        }
        if (!advanced && ranges[rangePos].lineIndex === currentLine) return;
        const next = ranges[rangePos].lineIndex;
        if (next === currentLine) return;
        currentLine = next;
        highlightPoemLine(lineElements, currentLine);
    };

    utterance.onboundary = (event) => {
        if (typeof event.charIndex !== 'number') return;
        if (!sawBoundary) {
            sawBoundary = true;
            clearSync(); // boundary wins — stop the timing estimate so they don't fight
        }
        syncTo(event.charIndex);
    };

    utterance.onstart = () => {
        if (token !== speechQueueToken) return;
        const startedAt = performance.now();
        const rate = utterance.rate || 1;
        const cps = 13.5 * rate;
        clearSync();
        // Timing fallback only until the first real boundary event.
        visualPoemTimer = setInterval(() => {
            if (token !== speechQueueToken || sawBoundary) {
                clearSync();
                return;
            }
            const elapsedSec = (performance.now() - startedAt) / 1000;
            syncTo(Math.min(spoken.length - 1, Math.floor(elapsedSec * cps)));
        }, 220);
    };

    utterance.onend = clearSync;
    utterance.onerror = clearSync;

    try {
        if (synth.paused) synth.resume();
        synth.speak(utterance);
    } catch {
        clearSync();
        runVisualPoemScroll(lineElements, token);
    }
}

/**
 * Decode pre-rendered Samantha poem audio and apply sample-level raised-cosine
 * fade-in / fade-out envelopes around every line's audio packet while zeroing
 * out inter-line gaps so codec frame boundaries or OS TTS teardown can never pop.
 */
function shapePoemAudioBuffer(ctx, decodedBuffer, rawTimings) {
    const sampleRate = decodedBuffer.sampleRate;
    const totalFrames = decodedBuffer.length;
    const numChannels = decodedBuffer.numberOfChannels;
    const outBuffer = ctx.createBuffer(numChannels, totalFrames, sampleRate);

    const ch0 = decodedBuffer.getChannelData(0);
    let shiftSec = 0;
    if (Array.isArray(rawTimings) && rawTimings.length > 0 && Array.isArray(rawTimings[0])) {
        const expectedFirstSec = Number(rawTimings[0][0]) || 0.06;
        let firstActive = -1;
        const maxScan = Math.min(totalFrames, Math.floor((expectedFirstSec + 0.35) * sampleRate));
        for (let i = 0; i < maxScan; i += 1) {
            if (Math.abs(ch0[i]) > 0.008) {
                firstActive = i;
                break;
            }
        }
        if (firstActive >= 0) {
            const detectedSec = (firstActive / sampleRate) - 0.012;
            const delta = detectedSec - expectedFirstSec;
            if (delta > -0.05 && delta < 0.16) {
                shiftSec = delta;
            }
        }
    }

    const alignedTimings = (rawTimings || []).map((pair) => {
        const s = Math.max(0, (Number(pair[0]) || 0) + shiftSec);
        const e = Math.min(decodedBuffer.duration, Math.max(s + 0.05, (Number(pair[1]) || 0) + shiftSec));
        return [s, e];
    });

    const fadeInSamples = Math.floor(0.022 * sampleRate);
    const fadeOutSamples = Math.floor(0.080 * sampleRate);

    for (let ch = 0; ch < numChannels; ch += 1) {
        const src = decodedBuffer.getChannelData(ch);
        const dst = outBuffer.getChannelData(ch);
        dst.fill(0);

        if (!alignedTimings.length) {
            dst.set(src);
            const fi = Math.min(fadeInSamples, Math.floor(totalFrames / 4));
            for (let j = 0; j < fi; j += 1) {
                dst[j] *= 0.5 * (1 - Math.cos((Math.PI * j) / fi));
            }
            const fo = Math.min(fadeOutSamples, Math.floor(totalFrames / 3));
            for (let j = 0; j < fo; j += 1) {
                dst[totalFrames - fo + j] *= 0.5 * (1 + Math.cos((Math.PI * j) / fo));
            }
            continue;
        }

        for (let k = 0; k < alignedTimings.length; k += 1) {
            const [sSec, eSec] = alignedTimings[k];
            const startIdx = Math.max(0, Math.floor(sSec * sampleRate));
            const endIdx = Math.min(totalFrames, Math.ceil(eSec * sampleRate));
            const len = endIdx - startIdx;
            if (len <= 4) continue;

            for (let i = startIdx; i < endIdx; i += 1) {
                dst[i] = src[i];
            }

            const fi = Math.min(fadeInSamples, Math.floor(len / 3));
            for (let j = 0; j < fi; j += 1) {
                const w = 0.5 * (1 - Math.cos((Math.PI * j) / fi));
                dst[startIdx + j] *= w;
            }

            const fo = Math.min(fadeOutSamples, Math.floor(len / 2));
            for (let j = 0; j < fo; j += 1) {
                const w = 0.5 * (1 + Math.cos((Math.PI * j) / fo));
                dst[endIdx - fo + j] *= w;
            }

            dst[startIdx] = 0;
            dst[endIdx - 1] = 0;
        }
    }

    return { buffer: outBuffer, timings: alignedTimings };
}

function fetchAndDecodePoemAudio(poemEntry) {
    if (!poemEntry?.audio) return Promise.reject(new Error('No poem audio path'));
    const cacheKey = poemEntry.id || poemEntry.audio;
    if (poemAudioCache.has(cacheKey)) {
        return poemAudioCache.get(cacheKey);
    }
    const promise = (async () => {
        const ctx = getPoemAudioCtx();
        if (!ctx) throw new Error('Web Audio unavailable');
        const res = await fetch(poemEntry.audio);
        if (!res.ok) throw new Error(`Poem audio HTTP ${res.status}`);
        const arrayBuf = await res.arrayBuffer();
        const rawDecoded = await ctx.decodeAudioData(arrayBuf.slice(0));
        return shapePoemAudioBuffer(ctx, rawDecoded, poemEntry.lineTimings || []);
    })().catch((err) => {
        poemAudioCache.delete(cacheKey);
        throw err;
    });
    poemAudioCache.set(cacheKey, promise);
    return promise;
}

function prefetchNextPoemAudio() {
    try {
        const pool = activeSingularityPoems();
        if (!pool.length) return;
        const nextIdx = (currentPoemIndex + 1) % pool.length;
        const nextEntry = findSingularityPoemByText(pool[nextIdx]);
        if (nextEntry?.audio) {
            fetchAndDecodePoemAudio(nextEntry).catch(() => {});
        }
    } catch {
        /* ignore */
    }
}

async function runWebAudioPoemSpeech(poemEntry, items, lineElements, token) {
    try {
        const ctx = getPoemAudioCtx();
        if (!ctx) throw new Error('No AudioContext');
        const { buffer, timings } = await fetchAndDecodePoemAudio(poemEntry);
        if (token !== speechQueueToken) return;

        if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => {});
        }
        if (token !== speechQueueToken) return;

        stopPoemWebAudio();

        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime + 0.02;
        const dur = buffer.duration;

        // Schedule a per-packet GainNode envelope matching each line's audio packet.
        if (timings.length) {
            gain.gain.setValueAtTime(0.0001, now);
            for (let k = 0; k < timings.length; k += 1) {
                const [sSec, eSec] = timings[k];
                const pktDur = eSec - sSec;
                if (pktDur <= 0.04) continue;
                const fi = Math.min(0.020, pktDur * 0.2);
                const fo = Math.min(0.075, pktDur * 0.35);
                const tStart = now + sSec;
                const tEnd = now + eSec;
                gain.gain.setValueAtTime(0.0001, Math.max(now, tStart - 0.002));
                gain.gain.linearRampToValueAtTime(1.0, tStart + fi);
                if (tEnd - fo > tStart + fi) {
                    gain.gain.setValueAtTime(1.0, tEnd - fo);
                }
                gain.gain.linearRampToValueAtTime(0.0001, tEnd);
            }
        } else {
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(1.0, now + 0.025);
            if (dur > 0.12) {
                gain.gain.setValueAtTime(1.0, now + dur - 0.08);
            }
            gain.gain.linearRampToValueAtTime(0.0001, now + dur);
        }

        activePoemSource = source;
        activePoemGain = gain;
        isPoemAudioPlaying = true;

        let currentLine = 0;
        highlightPoemLine(lineElements, 0);

        if (visualPoemTimer) {
            clearInterval(visualPoemTimer);
            visualPoemTimer = null;
        }

        visualPoemTimer = setInterval(() => {
            if (token !== speechQueueToken) {
                clearInterval(visualPoemTimer);
                visualPoemTimer = null;
                return;
            }
            const elapsed = ctx.currentTime - now;
            if (elapsed < 0) return;
            let nextLine = currentLine;
            for (let k = currentLine + 1; k < timings.length && k < lineElements.length; k += 1) {
                if (elapsed >= timings[k][0] - 0.03) {
                    nextLine = k;
                } else {
                    break;
                }
            }
            if (nextLine !== currentLine) {
                currentLine = nextLine;
                highlightPoemLine(lineElements, currentLine);
            }
        }, 55);

        source.onended = () => {
            if (activePoemSource === source) {
                activePoemSource = null;
                activePoemGain = null;
                isPoemAudioPlaying = false;
            }
            if (token === speechQueueToken && visualPoemTimer) {
                clearInterval(visualPoemTimer);
                visualPoemTimer = null;
            }
            try { source.disconnect(); } catch { /* ignore */ }
            try { gain.disconnect(); } catch { /* ignore */ }
        };

        source.start(now);
        prefetchNextPoemAudio();
    } catch {
        if (token !== speechQueueToken) return;
        runFallbackSpeechQueue(items, lineElements, token);
    }
}

function runFallbackSpeechQueue(items, lineElements, token) {
    const synth = window.speechSynthesis;
    if (!synth || !items.length) {
        runVisualPoemScroll(lineElements, token);
        return;
    }

    // Per-line speak() on Firefox clicks between every line; Safari does not.
    if (isFirefoxSynth()) {
        runFirefoxSpeech(items, lineElements, token);
        return;
    }

    let index = 0;
    const speakNext = () => {
        if (token !== speechQueueToken || index >= items.length) return;

        const item = items[index++];
        const clean = (item.text || '').replace(/\s+/g, ' ').trim();
        if (!clean) {
            speakNext();
            return;
        }
        // Advance the poem view with the queue — don't wait for onstart
        // (Chrome sometimes skips it after a prior cancel).
        if (item.lineIndex != null) {
            highlightPoemLine(lineElements, item.lineIndex);
        }
        let spoken = applyWebSpeechPausePreferences(clean);
        if (!/[.!?]$/.test(spoken)) spoken += '.';
        const utterance = attachSingularityUtterance(new SpeechSynthesisUtterance(spoken));

        utterance.onend = () => {
            if (token !== speechQueueToken) return;
            speakNext();
        };
        // Always continue — canceled/interrupted after poem switch must not stall the queue.
        utterance.onerror = () => {
            if (token !== speechQueueToken) return;
            speakNext();
        };

        try {
            if (synth.paused) synth.resume();
            synth.speak(utterance);
        } catch {
            speakNext();
        }
    };

    speakNext();
}

function runSpeechQueue(items, lineElements, token, poemText) {
    const poemEntry = findSingularityPoemByText(poemText);
    if (poemEntry?.audio) {
        void runWebAudioPoemSpeech(poemEntry, items, lineElements, token);
        return;
    }
    runFallbackSpeechQueue(items, lineElements, token);
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
    container.style.overflowY = 'auto';
    container.style.scrollbarWidth = 'none';
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

    setTimeout(() => runSpeechQueue(items, lineElements, token, poemText), 50);
}

let cyclePoemBusy = false;

function cyclePoem() {
    const nextBtn = document.getElementById('next-poem-btn');
    if (!nextBtn || !document.body.classList.contains('singularity-active')) return;
    if (cyclePoemBusy || nextBtn.disabled) return;
    cyclePoemBusy = true;

    const wasInterrupted = isPoemAudioPlaying
        || Boolean(window.speechSynthesis?.speaking || window.speechSynthesis?.pending);
    cancelSingularitySpeech();

    const finishCycle = () => {
        const pool = activeSingularityPoems();
        const nextIndex = (currentPoemIndex + 1) % pool.length;
        setCurrentPoemIndex(nextIndex);
        const poem = pool[nextIndex];
        speakSingularity(poem);
        if (!isIosSingularity()) {
            const title = poemTitleFromText(poem);
            pushTerminalLog(`> TRANSMISSION ${nextIndex + 1}/${pool.length}: ${title.toUpperCase()}`);
        }
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
    void loadSingularityPoems().then(() => {
        const pool = activeSingularityPoems();
        if (pool.length) speakSingularity(pool[currentPoemIndex] ?? pool[0]);
    });
}

export function reconcileSingularityPoem() {
    if (isIosSingularity()) return;
    if (!isSingularityActive && !document.body.classList.contains('singularity-active')) return;
    void loadSingularityPoems().then(() => {
        const pool = activeSingularityPoems();
        if (!pool.length) return;
        const idx = Math.min(currentPoemIndex, pool.length - 1);
        setCurrentPoemIndex(idx);
        speakSingularity(pool[idx] ?? pool[0]);
    });
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
        const reset = getHook('resetTimeline') ?? globalThis.resetTimeline;
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
