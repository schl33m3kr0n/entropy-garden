import {
    canvas,
    ctx,
    perf,
    animatePanopticon,
    pickCipherChar,
    usesIosCipherGlyphs,
    usesLiteCipherWheelPaint,
    panopticonEl,
} from '../core/shared.js';
import {
    ensureCipherRenderCache,
    isEmptyWheelGlyph,
    isRenderableCipherGlyph,
    pickRenderableCipherChar,
    populateEmptyWheelGlyphs,
    resetCipherRenderCache,
} from '../cipher/wheel-fill.js';
import {
    time,
    isCorrupted,
    fontSize,
    cellSize,
    canvasDpr,
    gardenLoopActive,
    gardenHasStarted,
    gardenAnimId,
    matrixFrameCount,
    isSingularityActive,
    setGardenLoopActive,
    setGardenAnimId,
    setMatrixFrameCount,
    incrementMatrixFrameCount,
    setNeedsFullRedraw,
    addTime,
    setCanvasMetrics,
} from '../core/state.js';

// --- CONCENTRIC CIPHER WHEEL MATRIX ---
let wheels = [];
let visibleRingCount = 0;
let matrixFilled = false;
let viewW = 0;
let viewH = 0;

let cipherRenderCacheReady = false;

function initCipherRenderCacheIfNeeded() {
    if (cipherRenderCacheReady) return;
    ensureCipherRenderCache(cipherWheelFont(), usesIosCipherGlyphs());
    cipherRenderCacheReady = true;
}

function randomChar() {
    if (!cipherRenderCacheReady) return pickCipherChar();
    return pickRenderableCipherChar(cipherWheelFont(), usesIosCipherGlyphs());
}

function repairWheelGlyph(wheel, index) {
    const font = cipherWheelFont();
    const glyph = wheel.glyphs[index];
    if (!isEmptyWheelGlyph(glyph) && isRenderableCipherGlyph(glyph, font)) return;
    wheel.glyphs[index] = pickRenderableCipherChar(font, usesIosCipherGlyphs());
}

function fillEmptyWheelGlyphs() {
    if (!wheels.length) return;
    initCipherRenderCacheIfNeeded();
    populateEmptyWheelGlyphs(wheels, randomChar, cipherWheelFont());
}

function cipherWheelFont() {
    const arabic = '"Geeza Pro", "Noto Sans Arabic", "Arial Unicode MS"';
    if (usesIosCipherGlyphs()) {
        return `${fontSize}px Avenir, ${arabic}, -apple-system, BlinkMacSystemFont, sans-serif`;
    }
    return `${fontSize}px ${arabic}, monospace, sans-serif`;
}

function buildWheels() {
    initCipherRenderCacheIfNeeded();
    wheels = [];
    const maxRadius = Math.hypot(viewW, viewH) / 2 + cellSize;
    const charBand = cellSize * (perf.isMobile ? 1.15 : 1.25);
    const channel = cellSize * (perf.isMobile ? 0.5 : 0.65);
    let charRadius = cellSize * (perf.isMobile ? 2 : 2.2);

    let ringIndex = 0;
    const maxRings = perf.maxCipherRings;
    while (charRadius < maxRadius) {
        if (maxRings != null && ringIndex >= maxRings) break;
        const circumference = 2 * Math.PI * charRadius;
        const charCount = Math.max(
            perf.isMobile ? 10 : 12,
            Math.floor(circumference / cellSize)
        );

        wheels.push({
            charRadius,
            charCount,
            glyphs: Array.from({ length: charCount }, () => randomChar()),
            angle: Math.random() * Math.PI * 2,
            cycleCounter: 0,
            cycleEvery: (perf.isMobile ? 14 : 8) + ringIndex * 2,
            spinSpeed: (ringIndex % 2 === 0 ? 1 : -1)
                * (0.00045 + ringIndex * 0.00008)
                * (perf.prefersReducedMotion ? 0 : 1),
            burstSpeed: 0,
            burstUntil: 0,
            direction: ringIndex % 2 === 0 ? 1 : -1,
            ringIndex,
        });

        charRadius += charBand + channel;
        ringIndex++;
    }

    if (globalThis.EntropyCipherHint?.shouldShowRingHint?.()) {
        globalThis.EntropyCipherHint.applyToWheels(wheels, perf, randomChar);
    }

    fillEmptyWheelGlyphs();
}

function cycleGlyphs(wheel) {
    if (wheel.isHintWheel) return;
    const swaps = perf.prefersReducedMotion
        ? 1
        : (perf.isMobile ? 1 : 2 + Math.floor(Math.random() * 2));
    for (let s = 0; s < swaps; s++) {
        const idx = Math.floor(Math.random() * wheel.charCount);
        wheel.glyphs[idx] = randomChar();
        repairWheelGlyph(wheel, idx);
    }
}

function maybeDecoderBurst(wheel) {
    if (wheel.isHintWheel) return;
    if (perf.prefersReducedMotion || Math.random() > 0.004) return;
    wheel.burstSpeed = wheel.direction * 0.012;
    wheel.burstUntil = matrixFrameCount + 10 + Math.floor(Math.random() * 14);
}

function updateWheels() {
    for (let r = 0; r < visibleRingCount; r++) {
        const wheel = wheels[r];
        if (!wheel) continue;

        let speed = wheel.spinSpeed;
        if (matrixFrameCount < wheel.burstUntil) {
            speed += wheel.burstSpeed;
        } else {
            wheel.burstSpeed = 0;
            maybeDecoderBurst(wheel);
        }

        wheel.angle += speed;

        wheel.cycleCounter++;
        if (wheel.cycleCounter >= wheel.cycleEvery) {
            wheel.cycleCounter = 0;
            cycleGlyphs(wheel);
        }
    }
}

let wheelGradientCache = { key: '', stroke: null, fill: null };

function wheelConicGradient(cx, cy, alpha) {
    const key = `${Math.round(cx)}|${Math.round(cy)}|${alpha}|${isCorrupted ? 1 : 0}`;
    const slot = alpha < 0.2 ? 'stroke' : 'fill';
    if (wheelGradientCache.key === key && wheelGradientCache[slot]) {
        return wheelGradientCache[slot];
    }

    const g = ctx.createConicGradient(-Math.PI * 0.5, cx, cy);
    if (isCorrupted) {
        g.addColorStop(0, `rgba(255, 0, 85, ${alpha})`);
        g.addColorStop(1, `rgba(255, 0, 85, ${alpha})`);
    } else {
        const hues = [0, 60, 120, 180, 240, 300, 360];
        for (let i = 0; i < hues.length; i++) {
            g.addColorStop(i / (hues.length - 1), `hsla(${hues[i]}, 100%, 55%, ${alpha})`);
        }
    }
    wheelGradientCache.key = key;
    wheelGradientCache[slot] = g;
    return g;
}

function drawChannelRings(cx, cy) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = usesLiteCipherWheelPaint()
        ? (isCorrupted ? 'rgba(255, 0, 85, 0.16)' : 'rgba(0, 255, 0, 0.16)')
        : wheelConicGradient(cx, cy, 0.16);
    ctx.lineWidth = perf.isMobile ? 1 : 1.25;

    for (let r = 0; r < visibleRingCount - 1; r++) {
        const inner = wheels[r];
        const outer = wheels[r + 1];
        if (!inner || !outer) continue;

        const midRadius = (inner.charRadius + outer.charRadius) * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, midRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawCipherWheels(cx, cy) {
    initCipherRenderCacheIfNeeded();
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.font = cipherWheelFont();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    drawChannelRings(cx, cy);

    ctx.fillStyle = usesLiteCipherWheelPaint()
        ? (isCorrupted ? 'rgba(255, 0, 85, 0.24)' : 'rgba(0, 255, 0, 0.24)')
        : wheelConicGradient(cx, cy, 0.24);

    const fastGlyphs = perf.liteGfx && !perf.prefersReducedMotion;

    for (let r = 0; r < visibleRingCount; r++) {
        const wheel = wheels[r];
        if (!wheel) continue;

        const slot = (Math.PI * 2) / wheel.charCount;
        for (let i = 0; i < wheel.charCount; i++) {
            const theta = wheel.angle + i * slot;
            const x = cx + Math.cos(theta) * wheel.charRadius;
            const y = cy + Math.sin(theta) * wheel.charRadius;

            if (x < -cellSize || x > viewW + cellSize || y < -cellSize || y > viewH + cellSize) {
                continue;
            }

            if (fastGlyphs) {
                ctx.setTransform(canvasDpr, 0, 0, canvasDpr, x * canvasDpr, y * canvasDpr);
                ctx.fillText(wheel.glyphs[i], 0, 0);
            } else {
                ctx.fillText(wheel.glyphs[i], x, y);
            }
        }
    }

    if (fastGlyphs) {
        ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
    }

    setNeedsFullRedraw(false);
}

let cachedCipherCenter = null;

export function invalidateCipherWheelCenter() {
    cachedCipherCenter = null;
}

function getCipherWheelCenter() {
    if (cachedCipherCenter) return cachedCipherCenter;

    const eyeRect = panopticonEl?.getBoundingClientRect();
    const canvasRect = canvas?.getBoundingClientRect();
    if (eyeRect?.width > 0 && eyeRect.height > 0 && canvasRect) {
        cachedCipherCenter = {
            cx: eyeRect.left + eyeRect.width * 0.5 - canvasRect.left,
            cy: eyeRect.top + eyeRect.height * 0.5 - canvasRect.top,
        };
        return cachedCipherCenter;
    }
    cachedCipherCenter = { cx: viewW * 0.5, cy: viewH * 0.5 };
    return cachedCipherCenter;
}

function animateMatrix() {
    if (!ctx) return;

    const { cx, cy } = getCipherWheelCenter();

    if (!matrixFilled) {
        const revealEvery = perf.liteGfx ? 6 : (perf.isMobile ? 4 : 2);
        if (matrixFrameCount % revealEvery === 0 && visibleRingCount < wheels.length) {
            visibleRingCount++;
        }
        if (visibleRingCount >= wheels.length) matrixFilled = true;
        drawCipherWheels(cx, cy);
        return;
    }

    updateWheels();
    drawCipherWheels(cx, cy);
}

let lastCanvasViewW = 0;
let lastCanvasViewH = 0;
let iosLockedViewW = 0;
let iosLockedViewH = 0;

function isIosKeyboardOpen() {
    if (!perf.isIOS || !iosLockedViewH) return false;
    const vv = window.visualViewport;
    if (!vv) return false;
    return vv.height < iosLockedViewH * 0.85;
}

function resetIosViewportLock() {
    iosLockedViewW = 0;
    iosLockedViewH = 0;
    lastCanvasViewW = 0;
    lastCanvasViewH = 0;
}

function updateIosViewportLock() {
    if (!perf.isIOS) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!iosLockedViewW || !isIosKeyboardOpen()) {
        iosLockedViewW = w;
        iosLockedViewH = h;
    }
}

function applyIosKeyboardCompensation() {
    if (!perf.isIOS) return;
    const vv = window.visualViewport;
    if (!vv) return;

    updateIosViewportLock();

    const ox = -Math.round(vv.offsetLeft);
    const oy = -Math.round(vv.offsetTop);
    document.documentElement.style.setProperty('--ios-vv-offset-x', `${ox}px`);
    document.documentElement.style.setProperty('--ios-vv-offset-y', `${oy}px`);
    document.body.classList.toggle('ios-keyboard-open', isIosKeyboardOpen());
}

function getViewportMetrics() {
    // iOS keyboard shrinks visualViewport — keep canvas on the full layout viewport
    // so cipher wheels stay centered with the panopticon eye.
    if (perf.isIOS) {
        updateIosViewportLock();
        return {
            width: iosLockedViewW || window.innerWidth,
            height: iosLockedViewH || window.innerHeight,
            offsetTop: 0,
            offsetLeft: 0,
        };
    }

    return {
        width: window.innerWidth,
        height: window.innerHeight,
        offsetTop: 0,
        offsetLeft: 0,
    };
}

function resizeCanvas() {
    if (!canvas || !ctx) return;

    cipherRenderCacheReady = false;
    resetCipherRenderCache();

    const dpr = Math.min(window.devicePixelRatio || 1, perf.dprCap);
    const fs = perf.isIOS
        ? Math.max(28, Math.min(38, window.innerWidth / 28))
        : (perf.isMobile
            ? Math.max(26, Math.min(36, window.innerWidth / 32))
            : Math.max(24, Math.min(40, window.innerWidth / 42)));
    const cs = Math.round(fs * perf.cellSpacing);

    const vp = getViewportMetrics();
    const sizeChanged = vp.width !== lastCanvasViewW || vp.height !== lastCanvasViewH;
    lastCanvasViewW = vp.width;
    lastCanvasViewH = vp.height;

    viewW = vp.width;
    viewH = vp.height;

    canvas.width = viewW * dpr;
    canvas.height = viewH * dpr;
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;
    canvas.style.top = '0';
    canvas.style.left = '0';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    setCanvasMetrics(dpr, fs, cs, Math.ceil(viewW / cs), Math.ceil(viewH / cs));

    wheelGradientCache.key = '';

    // DPR changes on browser zoom — resize backing store only; keep ring state/center.
    if (!sizeChanged && wheels.length > 0) {
        invalidateCipherWheelCenter();
        setNeedsFullRedraw(true);
        return;
    }

    buildWheels();
    visibleRingCount = 0;
    matrixFilled = false;
    ctx.clearRect(0, 0, viewW, viewH);
    invalidateCipherWheelCenter();
    setNeedsFullRedraw(false);
}

let resizeFrame = null;

function scheduleResizeCanvas() {
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        resizeCanvas();
        if (gardenLoopActive) setNeedsFullRedraw(true);
    });
}

function bindViewportListeners() {
    const vv = window.visualViewport;
    if (!vv || vv.__gardenBound) return;
    vv.__gardenBound = true;

    const onViewportChange = () => {
        if (perf.isIOS) {
            applyIosKeyboardCompensation();
            if (isIosKeyboardOpen()) {
                if (gardenLoopActive) setNeedsFullRedraw(true);
                return;
            }
        }
        scheduleResizeCanvas();
    };

    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', onViewportChange);
}

function onWindowResize() {
    if (perf.isIOS) {
        applyIosKeyboardCompensation();
        if (isIosKeyboardOpen()) {
            if (gardenLoopActive) setNeedsFullRedraw(true);
            return;
        }
    }
    scheduleResizeCanvas();
}

function scheduleGardenFrame() {
    if (gardenAnimId !== null) {
        cancelAnimationFrame(gardenAnimId);
    }
    setGardenAnimId(requestAnimationFrame(animate));
}

function startGardenLoop() {
    if (!gardenHasStarted) return;
    setGardenLoopActive(true);
    scheduleGardenFrame();
}

function stopGardenLoop() {
    setGardenLoopActive(false);
    if (gardenAnimId !== null) {
        cancelAnimationFrame(gardenAnimId);
        setGardenAnimId(null);
    }
}

function resumeGardenLoop() {
    if (!gardenHasStarted || document.hidden) return;
    setGardenLoopActive(true);
    setNeedsFullRedraw(true);
    scheduleGardenFrame();
}

/** After singularity (or other full-screen takeover), force a fresh rAF chain. */
function restartGardenLoop() {
    stopGardenLoop();
    resumeGardenLoop();
    requestAnimationFrame(() => {
        if (!gardenHasStarted || document.hidden) return;
        resumeGardenLoop();
    });
}

function isGardenMatrixSuspended() {
    return isSingularityActive
        || document.body.classList.contains('singularity-active')
        || document.body.classList.contains('pong-playing')
        || document.body.classList.contains('ios-pong-playing');
}

function animate() {
    if (!gardenLoopActive) return;

    if (isGardenMatrixSuspended()) {
        scheduleGardenFrame();
        return;
    }

    incrementMatrixFrameCount();
    const shouldDrawMatrix = !perf.matrixFrameSkip || (matrixFrameCount % (perf.matrixFrameSkip + 1) === 0);

    if (shouldDrawMatrix && wheels.length > 0) {
        animateMatrix();
    }

    const shouldAnimatePanopticon = !perf.panopticonFrameSkip
        || (matrixFrameCount % (perf.panopticonFrameSkip + 1) === 0);
    if (shouldAnimatePanopticon) {
        animatePanopticon();
    }

    const timeStep = isCorrupted ? 2 : (perf.isMobile ? 0.25 : 0.5);
    addTime(timeStep);
    if (!perf.liteGfx) {
        document.documentElement.style.setProperty('--rainbow-offset', `${(time * 0.5) % 200}%`);
        if (!perf.prefersReducedMotion && !isCorrupted) {
            document.documentElement.style.setProperty('--matrix-hue', `${time % 360}deg`);
        }
    }

    if (gardenLoopActive) {
        scheduleGardenFrame();
    }
}

window.addEventListener('resize', onWindowResize);

bindViewportListeners();
applyIosKeyboardCompensation();

document.addEventListener('focusin', (e) => {
    if (!perf.isIOS) return;
    if (!e.target.closest?.('#terminal-container input, #terminal-container textarea')) return;
    requestAnimationFrame(applyIosKeyboardCompensation);
    setTimeout(applyIosKeyboardCompensation, 280);
});

document.addEventListener('focusout', (e) => {
    if (!perf.isIOS) return;
    if (!e.target.closest?.('#terminal-container input, #terminal-container textarea')) return;
    setTimeout(() => {
        applyIosKeyboardCompensation();
        scheduleResizeCanvas();
    }, 120);
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopGardenLoop();
        return;
    }
    if (isSingularityActive) return;
    resumeGardenLoop();
});

window.addEventListener('pageshow', () => {
    if (isSingularityActive) return;
    resumeGardenLoop();
});

window.addEventListener('focus', () => {
    if (isSingularityActive) return;
    resumeGardenLoop();
});

window.addEventListener('orientationchange', () => {
    if (!perf.isIOS) return;
    resetIosViewportLock();
    setTimeout(() => {
        applyIosKeyboardCompensation();
        scheduleResizeCanvas();
    }, 260);
});

function refreshCipherEntropyRingHint() {
    const hint = globalThis.EntropyCipherHint;
    if (!hint) return;

    if (!wheels.length) {
        setNeedsFullRedraw(true);
        return;
    }

    if (hint.shouldShowRingHint()) {
        hint.applyToWheels(wheels, perf, randomChar);
    } else {
        hint.clearFromWheels(wheels, randomChar, perf);
    }
    fillEmptyWheelGlyphs();
    setNeedsFullRedraw(true);
}

globalThis.refreshCipherEntropyRingHint = refreshCipherEntropyRingHint;

export {
    resizeCanvas,
    startGardenLoop,
    stopGardenLoop,
    resumeGardenLoop,
    restartGardenLoop,
    resetIosViewportLock,
};
