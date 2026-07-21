/** Vault — raycast checkered sphere; starburst + eyes are HTML overlays. */

const CHECKS = 12;
const TILT_X = 0.33;
const SPIN_SPEED = 0.50;
const SPHERE_SCALE = 0.23;
const MAX_RENDER_PX = 720;
const DARK_SHADE_MIN = 0.10;
const DARK_SHADE_MAX = 1.0;
const CHROMA_HUES = [0, 60, 120, 180, 240, 300, 360];
const CHROMA_SAT = 100;
const CHROMA_LIGHT_MIN = 28;
const CHROMA_LIGHT_MAX = 55;

const activeCanvases = new Set();
const colorProbe = document.createElement('canvas');
colorProbe.width = 1;
colorProbe.height = 1;
const cssRgbCache = new Map();

function readCssRgb(varName, fallback) {
    const cached = cssRgbCache.get(varName);
    if (cached && performance.now() - cached.at < 500) return cached.rgb;

    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '';
    const ctx = colorProbe.getContext('2d');
    if (!ctx) return fallback;

    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = raw || `rgb(${fallback.join(',')})`;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    const rgb = [r, g, b];
    cssRgbCache.set(varName, { rgb, at: performance.now() });
    return rgb;
}

function isCorrupted() {
    return document.body.classList.contains('corrupted');
}

function chromaHueFromSurface(lat, lon) {
    const u = ((lon / Math.PI) + 1) * 0.5;
    const v = (lat / Math.PI) + 0.5;
    return ((u + v * 0.35) * 360) % 360;
}

function sampleChromaHue(hue) {
    const h = ((hue % 360) + 360) % 360;
    const scaled = (h / 360) * (CHROMA_HUES.length - 1);
    const i = Math.floor(scaled);
    const f = scaled - i;
    const a = CHROMA_HUES[i];
    const b = CHROMA_HUES[Math.min(i + 1, CHROMA_HUES.length - 1)];
    return a + (b - a) * f;
}

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) {
        r = c; g = x;
    } else if (h < 120) {
        r = x; g = c;
    } else if (h < 180) {
        g = c; b = x;
    } else if (h < 240) {
        g = x; b = c;
    } else if (h < 300) {
        r = x; b = c;
    } else {
        r = c; b = x;
    }

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255),
    ];
}

function rotatePoint([x, y, z], rotX, rotY) {
    let nx = x;
    let ny = y;
    let nz = z;

    const cy = Math.cos(rotY);
    const sy = Math.sin(rotY);
    const tx = nx * cy - nz * sy;
    const tz = nx * sy + nz * cy;
    nx = tx;
    nz = tz;

    const cx = Math.cos(rotX);
    const sx = Math.sin(rotX);
    const ty = ny * cx - nz * sx;
    const tz2 = ny * sx + nz * cx;
    ny = ty;
    nz = tz2;

    return [nx, ny, nz];
}

function rotatePointInverse([x, y, z], rotX, rotY) {
    let nx = x;
    let ny = y;
    let nz = z;

    const cx = Math.cos(-rotX);
    const sx = Math.sin(-rotX);
    let ty = ny * cx - nz * sx;
    let tz = ny * sx + nz * cx;
    ny = ty;
    nz = tz;

    const cy = Math.cos(-rotY);
    const sy = Math.sin(-rotY);
    const tx = nx * cy - nz * sy;
    tz = nx * sy + nz * cy;

    return [tx, ny, tz];
}

function normalize([x, y, z]) {
    const len = Math.hypot(x, y, z) || 1;
    return [x / len, y / len, z / len];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function checkerShade(lat, lon) {
    const u = ((lon / Math.PI) + 1) * 0.5;
    const v = (lat / Math.PI) + 0.5;
    return (Math.floor(u * CHECKS) + Math.floor(v * CHECKS)) % 2 === 0 ? 0 : 1;
}

function castSpherePixel(dx, dy, radius, focal, rotY) {
    const rd = normalize([dx, dy, focal]);
    const ro = [0, 0, -focal];
    const roL = rotatePointInverse(ro, TILT_X, rotY);
    const rdL = rotatePointInverse(rd, TILT_X, rotY);

    const b = 2 * dot(roL, rdL);
    const c = dot(roL, roL) - radius * radius;
    const disc = b * b - 4 * c;
    if (disc < 0) return null;

    const sqrtDisc = Math.sqrt(disc);
    const tNear = (-b - sqrtDisc) * 0.5;
    const tFar = (-b + sqrtDisc) * 0.5;

    let t = null;
    for (const cand of [tNear, tFar]) {
        if (cand >= 0) {
            t = cand;
            break;
        }
    }
    if (t == null) return null;

    const px = roL[0] + rdL[0] * t;
    const py = roL[1] + rdL[1] * t;
    const pz = roL[2] + rdL[2] * t;
    const nLocal = normalize([px, py, pz]);
    const nWorld = rotatePoint(nLocal, TILT_X, rotY);

    const lat = Math.asin(Math.max(-1, Math.min(1, nLocal[1])));
    const lon = Math.atan2(nLocal[0], nLocal[2]);
    return { lat, lon, normal: nWorld };
}

function shadePixel(hit, light) {
    if (checkerShade(hit.lat, hit.lon)) return [255, 255, 255];
    const lit = Math.max(0, dot(hit.normal, light));
    const shade = DARK_SHADE_MIN + (DARK_SHADE_MAX - DARK_SHADE_MIN) * lit;

    if (isCorrupted()) {
        const [r, g, b] = readCssRgb('--alert-red', [255, 0, 85]);
        return [Math.round(r * shade), Math.round(g * shade), Math.round(b * shade)];
    }

    const hue = sampleChromaHue(chromaHueFromSurface(hit.lat, hit.lon));
    const lightness = CHROMA_LIGHT_MIN + (CHROMA_LIGHT_MAX - CHROMA_LIGHT_MIN) * lit;
    const [r, g, b] = hslToRgb(hue, CHROMA_SAT, lightness);
    const depth = 0.35 + 0.65 * shade;
    return [Math.round(r * depth), Math.round(g * depth), Math.round(b * depth)];
}

function drawSphereFrame(ctx, w, h, rotY) {
    const cx = w * 0.5;
    const cy = h * 0.50;
    const radius = Math.min(w, h) * SPHERE_SCALE;
    const focal = Math.max(w, h) * 1.5;
    const light = normalize([0.35, 0.55, 0.75]);

    ctx.clearRect(0, 0, w, h);

    const yMin = Math.max(0, Math.floor(cy - radius - 1));
    const yMax = Math.min(h - 1, Math.ceil(cy + radius + 1));
    const xMin = Math.max(0, Math.floor(cx - radius - 1));
    const xMax = Math.min(w - 1, Math.ceil(cx + radius + 1));
    const iw = xMax - xMin + 1;
    const ih = yMax - yMin + 1;
    if (iw < 1 || ih < 1) return;

    const img = ctx.createImageData(iw, ih);
    const data = img.data;

    for (let py = yMin; py <= yMax; py++) {
        const dy = py - cy;
        for (let px = xMin; px <= xMax; px++) {
            const dx = px - cx;
            const hit = castSpherePixel(dx, dy, radius, focal, rotY);
            if (!hit) continue;

            const rgb = shadePixel(hit, light);
            const idx = ((py - yMin) * iw + (px - xMin)) * 4;
            data[idx] = rgb[0];
            data[idx + 1] = rgb[1];
            data[idx + 2] = rgb[2];
            data[idx + 3] = 255;
        }
    }

    ctx.putImageData(img, xMin, yMin);
}

function renderScale(w, h) {
    const maxDim = Math.max(w, h);
    if (maxDim <= MAX_RENDER_PX) return 1;
    return MAX_RENDER_PX / maxDim;
}

function paintCanvas(canvas, rotY) {
    const { w, h } = resizeCanvas(canvas);
    if (w < 4 || h < 4) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const scale = renderScale(w, h);
    if (scale >= 0.999) {
        drawSphereFrame(ctx, w, h, rotY);
    } else {
        const rw = Math.max(4, Math.floor(w * scale));
        const rh = Math.max(4, Math.floor(h * scale));
        if (!paintCanvas._buffer || paintCanvas._buffer.width !== rw || paintCanvas._buffer.height !== rh) {
            paintCanvas._buffer = document.createElement('canvas');
            paintCanvas._buffer.width = rw;
            paintCanvas._buffer.height = rh;
        }
        const bctx = paintCanvas._buffer.getContext('2d');
        drawSphereFrame(bctx, rw, rh, rotY);
        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(paintCanvas._buffer, 0, 0, w, h);
    }

    canvas.classList.add('vault-sphere-canvas--ready');
    return true;
}

function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    return { w, h };
}

function animate(canvas, state) {
    if (!activeCanvases.has(canvas)) return;
    const now = performance.now();
    const dt = state.lastFrame ? Math.min((now - state.lastFrame) / 1000, 0.05) : 0;
    state.lastFrame = now;
    state.rotY += SPIN_SPEED * dt;
    paintCanvas(canvas, state.rotY);
    state.raf = requestAnimationFrame(() => animate(canvas, state));
}

function shouldAnimate(canvas) {
    const lightbox = canvas.closest('#lightbox-overlay');
    if (lightbox) return lightbox.classList.contains('active');
    const modal = document.getElementById('modal-vault');
    return Boolean(modal && getComputedStyle(modal).display !== 'none');
}

function startLoop(canvas) {
    if (activeCanvases.has(canvas)) return;
    if (!canvas._vaultSphereState) {
        canvas._vaultSphereState = { rotY: 0, raf: 0, lastFrame: 0 };
    }
    const state = canvas._vaultSphereState;
    if (!paintCanvas(canvas, state.rotY)) {
        requestAnimationFrame(() => startLoop(canvas));
        return;
    }
    activeCanvases.add(canvas);
    state.lastFrame = performance.now();
    state.raf = requestAnimationFrame(() => animate(canvas, state));
}

function stopLoop(canvas) {
    activeCanvases.delete(canvas);
    const state = canvas._vaultSphereState;
    if (state?.raf) cancelAnimationFrame(state.raf);
    if (state) {
        state.raf = 0;
        state.lastFrame = 0;
    }
}

export function stopVaultSpheresIn(root) {
    if (!root) return;
    root.querySelectorAll('.vault-sphere-canvas').forEach(stopLoop);
}

export function initVaultSphere(canvas, initialRotY = 0) {
    if (!canvas || canvas.dataset.bound) return;
    canvas.dataset.bound = '1';

    const state = { rotY: initialRotY, raf: 0, lastFrame: 0 };
    canvas._vaultSphereState = state;

    const maybeStart = () => {
        if (shouldAnimate(canvas)) startLoop(canvas);
        else stopLoop(canvas);
    };

    requestAnimationFrame(() => {
        paintCanvas(canvas, state.rotY);
        maybeStart();
    });

    const ro = new ResizeObserver(() => {
        if (canvas._vaultSphereState) {
            paintCanvas(canvas, canvas._vaultSphereState.rotY);
        }
    });
    ro.observe(canvas);

    const visibilityRoot = canvas.closest('#lightbox-overlay') || document.getElementById('modal-vault');
    if (visibilityRoot) {
        const obs = new MutationObserver(maybeStart);
        const attrFilter = visibilityRoot.id === 'lightbox-overlay' ? ['class'] : ['style'];
        obs.observe(visibilityRoot, { attributes: true, attributeFilter: attrFilter });
    }
}

export function initVaultSpheres() {
    document.querySelectorAll('.vault-sphere-canvas').forEach(initVaultSphere);
}
