/** Disco ball — pupil tracking clamped to sclera edge (cartoon peering). */

const boundRoots = new WeakSet();
const controllers = new WeakMap();
const SVG_NS = 'http://www.w3.org/2000/svg';

function sleepyLidFillPath(cx, cy, r, lidY) {
    const dy = lidY - cy;
    if (dy <= -r) return '';
    const xEdge = dy >= r ? 0 : Math.sqrt(r * r - dy * dy);
    if (xEdge <= 0) return '';
    return `M ${cx - xEdge} ${lidY} A ${r} ${r} 0 0 1 ${cx + xEdge} ${lidY} Z`;
}

function blinkLowerLidFillPath(cx, cy, r, lidY) {
    const dy = lidY - cy;
    if (dy >= r) return '';
    const xEdge = dy <= -r ? 0 : Math.sqrt(r * r - dy * dy);
    if (xEdge <= 0) return '';
    return `M ${cx - xEdge} ${lidY} A ${r} ${r} 0 0 0 ${cx + xEdge} ${lidY} Z`;
}

function blinkLidPositions(cy, r, progress) {
    const t = Math.max(0, Math.min(1, progress * 2));
    return {
        upperY: cy - r + t * r,
        lowerY: cy + r - t * r,
    };
}

function easeBlink(t) {
    return t * t * (3 - 2 * t);
}

function orderSleepyEyeLayers(group) {
    const sclera = group.querySelector(':scope > circle');
    const pupilGroup = group.querySelector('.disco-ball-pupil')?.parentElement;
    const lidFront = group.querySelector('.disco-ball-lid-front');
    if (!sclera || !pupilGroup || !lidFront) return;

    group.insertBefore(pupilGroup, sclera.nextSibling);
    group.appendChild(lidFront);
}

function readScleraStrokeWidth(group, fallback = 2) {
    const sclera = group?.querySelector(':scope > circle');
    return parseFloat(sclera?.getAttribute('stroke-width') ?? String(fallback));
}

function ensureEyeLids(svg, group, index) {
    group.querySelectorAll('.disco-ball-lid-bottom, .disco-ball-lid-top, .disco-ball-lid-line').forEach((el) => el.remove());

    const pupilGroup = group.querySelector('.disco-ball-pupil')?.parentElement ?? null;
    let lidFront = group.querySelector('.disco-ball-lid-front');

    if (!lidFront) {
        lidFront = document.createElementNS(SVG_NS, 'g');
        lidFront.setAttribute('class', 'disco-ball-lid-front');
        lidFront.setAttribute('pointer-events', 'none');
        group.appendChild(lidFront);
    }

    let lidFill = lidFront.querySelector('.disco-ball-lid-fill');
    let lidFillLower = lidFront.querySelector('.disco-ball-lid-fill-lower');

    if (!lidFill) {
        lidFill = document.createElementNS(SVG_NS, 'path');
        lidFill.setAttribute('class', 'disco-ball-lid-fill');
        lidFill.setAttribute('fill', '#d6d6d6');
        lidFill.setAttribute('stroke', '#000000');
        lidFill.setAttribute('stroke-linejoin', 'round');
        lidFill.setAttribute('stroke-linecap', 'round');
        lidFill.setAttribute('opacity', '0');
        lidFront.appendChild(lidFill);
    }

    if (!lidFillLower) {
        lidFillLower = document.createElementNS(SVG_NS, 'path');
        lidFillLower.setAttribute('class', 'disco-ball-lid-fill-lower');
        lidFillLower.setAttribute('fill', '#ffffff');
        lidFillLower.setAttribute('stroke', '#000000');
        lidFillLower.setAttribute('stroke-linejoin', 'round');
        lidFillLower.setAttribute('stroke-linecap', 'round');
        lidFillLower.setAttribute('opacity', '0');
        lidFront.appendChild(lidFillLower);
    }

    orderSleepyEyeLayers(group);

    return {
        lidFront,
        lidFill,
        lidFillLower,
        pupilClipGroup: pupilGroup,
        lidStrokeWidth: readScleraStrokeWidth(group),
    };
}

function applyLidPath(eye, pathEl, d, strokeWidth, visible) {
    if (!pathEl) return;
    pathEl.setAttribute('d', d);
    pathEl.setAttribute('stroke-width', String(strokeWidth));
    pathEl.setAttribute('opacity', d && visible ? '1' : '0');
}

function setSleepyLids(eye, lidY) {
    if (!eye.lidFill) return;

    if (eye.lidFront) {
        eye.lidFront.setAttribute('opacity', '1');
    }

    const group = eye.pupil?.closest('.disco-ball-eye');
    if (group) orderSleepyEyeLayers(group);

    const { ox: cx, oy: cy, eyeR: r } = eye;
    const fillPath = sleepyLidFillPath(cx, cy, r, lidY);
    const strokeWidth = readScleraStrokeWidth(group, eye.lidStrokeWidth ?? 2);
    eye.lidStrokeWidth = strokeWidth;

    eye.lidFill.setAttribute('fill', '#d6d6d6');
    applyLidPath(eye, eye.lidFill, fillPath, strokeWidth, Boolean(fillPath));
    applyLidPath(eye, eye.lidFillLower, '', strokeWidth, false);
}

function setBlinkLids(eye, progress) {
    if (!eye.lidFill) return;

    if (eye.lidFront) {
        eye.lidFront.setAttribute('opacity', '1');
    }

    const group = eye.pupil?.closest('.disco-ball-eye');
    if (group) orderSleepyEyeLayers(group);

    const { ox: cx, oy: cy, eyeR: r } = eye;
    const { upperY, lowerY } = blinkLidPositions(cy, r, progress);
    const upperPath = sleepyLidFillPath(cx, cy, r, upperY);
    const lowerPath = blinkLowerLidFillPath(cx, cy, r, lowerY);
    const strokeWidth = readScleraStrokeWidth(group, eye.lidStrokeWidth ?? 2);
    eye.lidStrokeWidth = strokeWidth;

    eye.lidFill.setAttribute('fill', '#ffffff');
    if (eye.lidFillLower) {
        eye.lidFillLower.setAttribute('fill', '#ffffff');
    }

    const visible = progress > 0.001;
    applyLidPath(eye, eye.lidFill, upperPath, strokeWidth, visible);
    applyLidPath(eye, eye.lidFillLower, lowerPath, strokeWidth, visible);
}

function hideEyeLids(eye) {
    if (!eye.lidFill) return;

    eye.lidFill.setAttribute('opacity', '0');
    eye.lidFillLower?.setAttribute('opacity', '0');
    eye.lidFront?.setAttribute('opacity', '0');
}

const BLINK = {
    minIntervalMs: 2800,
    maxIntervalMs: 6800,
    closeMs: 95,
    holdMs: 45,
    openMs: 115,
};

function createBlinkController() {
    let phase = 'idle';
    let phaseStart = 0;
    let progress = 0;
    let nextBlinkAt = performance.now() + BLINK.minIntervalMs
        + Math.random() * (BLINK.maxIntervalMs - BLINK.minIntervalMs);

    const scheduleNext = () => {
        nextBlinkAt = performance.now() + BLINK.minIntervalMs
            + Math.random() * (BLINK.maxIntervalMs - BLINK.minIntervalMs);
    };

    return {
        reset() {
            phase = 'idle';
            progress = 0;
            scheduleNext();
        },
        update(now, disabled) {
            if (disabled) {
                phase = 'idle';
                progress = 0;
                return 0;
            }

            if (phase === 'idle') {
                progress = 0;
                if (now >= nextBlinkAt) {
                    phase = 'closing';
                    phaseStart = now;
                }
                return 0;
            }

            const elapsed = now - phaseStart;
            if (phase === 'closing') {
                const t = Math.min(elapsed / BLINK.closeMs, 1);
                progress = easeBlink(t) * 0.5;
                if (t >= 1) {
                    phase = 'hold';
                    phaseStart = now;
                }
                return progress;
            }

            if (phase === 'hold') {
                progress = 0.5;
                if (elapsed >= BLINK.holdMs) {
                    phase = 'opening';
                    phaseStart = now;
                }
                return progress;
            }

            if (phase === 'opening') {
                const t = Math.min(elapsed / BLINK.openMs, 1);
                progress = 0.5 * (1 - easeBlink(t));
                if (t >= 1) {
                    phase = 'idle';
                    progress = 0;
                    scheduleNext();
                }
                return progress;
            }

            return 0;
        },
    };
}

function readEyeMetrics(pupil) {
    return {
        ox: parseFloat(pupil.dataset.eyeCx ?? pupil.getAttribute('cx') ?? '0'),
        oy: parseFloat(pupil.dataset.eyeCy ?? pupil.getAttribute('cy') ?? '0'),
        eyeR: parseFloat(pupil.dataset.eyeR ?? '12.3'),
        pupilR: parseFloat(pupil.dataset.pupilR ?? '9.1'),
    };
}

function pupilTravel(eye) {
    return Math.max(0, eye.eyeR - eye.pupilR);
}

function clientToSvg(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const matrix = svg.getScreenCTM()?.inverse();
    if (!matrix) return { x: clientX, y: clientY };
    const mapped = pt.matrixTransform(matrix);
    return { x: mapped.x, y: mapped.y };
}

export function svgPointFromClient(svg, clientX, clientY) {
    return clientToSvg(svg, clientX, clientY);
}

export const DISCO_BALL_SILLY_EYES = {
    cross: (t, eye, index) => {
        const max = pupilTravel(eye) * 0.92;
        const wiggle = Math.sin(t * 6) * max * 0.08;
        return index === 0
            ? { x: max + wiggle, y: wiggle * 0.4 }
            : { x: -max - wiggle, y: -wiggle * 0.4 };
    },
    spin: (t, eye, index) => {
        const max = pupilTravel(eye) * 0.88;
        const angle = t * 5 + index * Math.PI;
        return { x: Math.cos(angle) * max, y: Math.sin(angle) * max * 0.72 };
    },
    shifty: (t, eye, index) => {
        const max = pupilTravel(eye) * 0.9;
        const beat = Math.floor(t * 3.5);
        const dirs = [
            [1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1], [0.6, 0.5], [-0.7, 0.4],
        ];
        const [dx, dy] = dirs[(beat + index * 2) % dirs.length];
        return { x: dx * max, y: dy * max };
    },
    dizzy: (t, eye, index) => {
        const max = pupilTravel(eye) * 0.95;
        const angle = t * 11 + index * Math.PI * 0.85;
        return {
            x: Math.cos(angle) * max,
            y: Math.sin(angle * 1.7) * max * 0.8,
        };
    },
    heaven: (t, eye) => {
        const max = pupilTravel(eye) * 0.94;
        return {
            x: Math.sin(t * 2.4) * max * 0.18,
            y: -max + Math.sin(t * 5) * max * 0.05,
        };
    },
    googly: (t, eye, index) => {
        const max = pupilTravel(eye) * 0.98;
        const bounce = Math.abs(Math.sin(t * 7 + index));
        const angle = t * 9 + index * 1.4;
        return {
            x: Math.cos(angle) * max * bounce,
            y: Math.sin(angle * 1.2) * max * bounce,
        };
    },
    /** Forehead → chest → left shoulder → right shoulder (Catholic sign of the cross). */
    crossSign: (t, eye) => {
        const max = pupilTravel(eye);
        const cycle = 3.2;
        const phase = (t % cycle) / cycle;
        const keyframes = [
            { at: 0.0, x: 0, y: -1 },
            { at: 0.16, x: 0, y: -1 },
            { at: 0.34, x: 0, y: 1 },
            { at: 0.5, x: 0, y: 1 },
            { at: 0.66, x: -0.92, y: 0.08 },
            { at: 0.78, x: -0.92, y: 0.08 },
            { at: 0.92, x: 0.92, y: 0.08 },
            { at: 1.0, x: 0, y: 0 },
        ];

        let start = keyframes[0];
        let end = keyframes[keyframes.length - 1];
        for (let i = 0; i < keyframes.length - 1; i++) {
            if (phase >= keyframes[i].at && phase <= keyframes[i + 1].at) {
                start = keyframes[i];
                end = keyframes[i + 1];
                break;
            }
        }

        const span = end.at - start.at || 1;
        const local = (phase - start.at) / span;
        const ease = local * local * (3 - 2 * local);
        const x = start.x + (end.x - start.x) * ease;
        const y = start.y + (end.y - start.y) * ease;
        return { x: x * max, y: y * max };
    },
    sideEye: (t, eye, index) => {
        const max = pupilTravel(eye) * 0.9;
        const flutter = Math.sin(t * 4.2) * max * 0.05;
        return index === 0
            ? { x: -max * 0.96 + flutter, y: max * 0.14 }
            : { x: max * 0.96 - flutter, y: max * 0.14 };
    },
    sleepy: (t, eye, index) => {
        const max = pupilTravel(eye) * 0.95;
        const sway = Math.sin(t * 0.75 + index * 0.35) * max * 0.44;
        const droop = Math.sin(t * 1.05) * max * 0.02;
        return {
            x: sway,
            y: max * 0.88 + droop,
        };
    },
};

export function applyDiscoBallEyeLayout(svg, layout = {}) {
    if (!svg) return;

    const scleraR = layout.scleraR ?? 12.3;
    const pupilR = layout.pupilR ?? 9.1;
    const eyeY = layout.eyeY ?? 50;
    const eyeLeftX = layout.eyeLeftX ?? 36.5;
    const eyeRightX = layout.eyeRightX ?? 63.5;

    const pairs = [
        ['disco-ball-eye-clip-left', eyeLeftX],
        ['disco-ball-eye-clip-right', eyeRightX],
    ];

    pairs.forEach(([clipId, cx]) => {
        const clip = svg.querySelector(`#${clipId} circle`);
        if (!clip) return;
        clip.setAttribute('cx', String(cx));
        clip.setAttribute('cy', String(eyeY));
        clip.setAttribute('r', String(scleraR));
    });

    svg.querySelectorAll('.disco-ball-eye').forEach((group, index) => {
        const cx = index === 0 ? eyeLeftX : eyeRightX;
        const sclera = group.querySelector(':scope > circle');
        const pupil = group.querySelector('.disco-ball-pupil');
        if (sclera) {
            sclera.setAttribute('cx', String(cx));
            sclera.setAttribute('cy', String(eyeY));
            sclera.setAttribute('r', String(scleraR));
            if (layout.strokeWidth != null) {
                sclera.setAttribute('stroke-width', String(layout.strokeWidth));
            }
        }
        if (pupil) {
            pupil.setAttribute('cx', String(cx));
            pupil.setAttribute('cy', String(eyeY));
            pupil.setAttribute('r', String(pupilR));
            pupil.dataset.eyeCx = String(cx);
            pupil.dataset.eyeCy = String(eyeY);
            pupil.dataset.eyeR = String(scleraR);
            pupil.dataset.pupilR = String(pupilR);
        }
    });
}

function syncEyeState(state) {
    state.forEach((eye) => {
        const metrics = readEyeMetrics(eye.pupil);
        eye.ox = metrics.ox;
        eye.oy = metrics.oy;
        eye.eyeR = metrics.eyeR;
        eye.pupilR = metrics.pupilR;
    });
}

function pupilTarget(eyeX, eyeY, eyeR, pupilR, targetX, targetY, reach = 52) {
    const dx = targetX - eyeX;
    const dy = targetY - eyeY;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return { x: 0, y: 0 };

    const max = Math.max(0, eyeR - pupilR);
    const influence = Math.min(len / reach, 1);
    return {
        x: (dx / len) * max * influence,
        y: (dy / len) * max * influence,
    };
}

/**
 * @param {SVGElement | DocumentFragment | Element} root — inline SVG or container with `.disco-ball-pupil`
 * @param {{ ease?: number, reach?: number, target?: { x: number, y: number } | (() => ({ x: number, y: number } | null)) }} [options]
 */
export function initDiscoBallEyes(root, options = {}) {
    if (controllers.has(root)) return controllers.get(root);

    const svg = root instanceof SVGSVGElement ? root : root.closest('svg') ?? root.querySelector('svg');
    const pupils = [...root.querySelectorAll('.disco-ball-pupil')];
    if (!svg || !pupils.length) return { stop() {}, trackCursor() {}, playSilly() {} };

    boundRoots.add(root);

    let ease = options.ease ?? 0.2;
    let reach = options.reach ?? 52;
    let sillyMode = null;
    let sillyStart = 0;
    const blink = createBlinkController();
    const state = pupils.map((pupil, index) => {
        const metrics = readEyeMetrics(pupil);
        const group = pupil.closest('.disco-ball-eye');
        const lids = group ? ensureEyeLids(svg, group, index) : {};
        return {
            pupil,
            ...lids,
            ...metrics,
            x: 0,
            y: 0,
            tx: 0,
            ty: 0,
        };
    });

    let targetX = state[0].ox;
    let targetY = state[0].oy;
    let raf = 0;
    let disposed = false;

    const resolveTarget = () => {
        if (typeof options.target === 'function') {
            const value = options.target();
            if (value) return value;
        } else if (options.target) {
            return options.target;
        }
        return { x: targetX, y: targetY };
    };

    const updateTargets = () => {
        if (sillyMode && DISCO_BALL_SILLY_EYES[sillyMode]) {
            const t = (performance.now() - sillyStart) / 1000;
            const animate = DISCO_BALL_SILLY_EYES[sillyMode];
            state.forEach((eye, index) => {
                const offset = animate(t, eye, index, state);
                eye.tx = offset.x;
                eye.ty = offset.y;
            });
            return;
        }

        const point = resolveTarget();
        state.forEach((eye) => {
            const offset = pupilTarget(eye.ox, eye.oy, eye.eyeR, eye.pupilR, point.x, point.y, reach);
            eye.tx = offset.x;
            eye.ty = offset.y;
        });
    };

    const tick = () => {
        if (disposed) return;
        updateTargets();
        const isSleepy = sillyMode === 'sleepy';
        const now = performance.now();
        const blinkProgress = blink.update(now, isSleepy);

        state.forEach((eye) => {
            eye.x += (eye.tx - eye.x) * ease;
            eye.y += (eye.ty - eye.y) * ease;
            eye.pupil.setAttribute('cx', String(eye.ox + eye.x));
            eye.pupil.setAttribute('cy', String(eye.oy + eye.y));

            if (isSleepy) {
                setSleepyLids(eye, eye.oy);
            } else if (blinkProgress > 0) {
                setBlinkLids(eye, blinkProgress);
            } else {
                hideEyeLids(eye);
            }
        });
        raf = requestAnimationFrame(tick);
    };

    const onPointer = (clientX, clientY) => {
        const mapped = clientToSvg(svg, clientX, clientY);
        targetX = mapped.x;
        targetY = mapped.y;
    };

    const onMouseMove = (event) => onPointer(event.clientX, event.clientY);
    const onTouch = (event) => {
        const touch = event.touches?.[0];
        if (touch) onPointer(touch.clientX, touch.clientY);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });

    raf = requestAnimationFrame(tick);

    const api = {
        stop() {
            disposed = true;
            cancelAnimationFrame(raf);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('touchstart', onTouch);
            window.removeEventListener('touchmove', onTouch);
            boundRoots.delete(root);
            controllers.delete(root);
        },
        setLayout(layout) {
            applyDiscoBallEyeLayout(svg, layout);
            syncEyeState(state);
        },
        setReach(value) {
            reach = value;
        },
        setEase(value) {
            ease = value;
        },
        playSilly(name) {
            if (!DISCO_BALL_SILLY_EYES[name]) return;
            sillyMode = name;
            sillyStart = performance.now();
            if (name !== 'sleepy') {
                state.forEach(hideEyeLids);
            }
        },
        trackCursor() {
            sillyMode = null;
            state.forEach(hideEyeLids);
        },
        getSillyMode() {
            return sillyMode;
        },
    };

    controllers.set(root, api);
    return api;
}

export function initDiscoBallEyesInDocument(root = document) {
    const cleanups = [];
    root.querySelectorAll('[data-disco-ball-eyes]').forEach((el) => {
        cleanups.push(initDiscoBallEyes(el).stop);
    });
    return () => cleanups.forEach((stop) => stop());
}
