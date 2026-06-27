/** Vault — software-rendered 3D checkered sphere; starburst + eyes are HTML overlays. */

const LAT_STEPS = 22;
const LON_STEPS = 32;
const CHECKS = 8;
const TILT_X = 0.28;
const SPIN_SPEED = 0.55;

const activeCanvases = new Set();

function spherePoint(lat, lon, r) {
    const cl = Math.cos(lat);
    return [
        r * cl * Math.sin(lon),
        r * Math.sin(lat),
        r * cl * Math.cos(lon),
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

function checkerShade(lat, lon) {
    const u = ((lon / Math.PI) + 1) * 0.5;
    const v = (lat / Math.PI) + 0.5;
    const dark = (Math.floor(u * CHECKS) + Math.floor(v * CHECKS)) % 2 === 0;
    return dark ? 0 : 1;
}

function faceFill(shade, intensity) {
    if (shade) {
        const v = Math.round(255 * (0.92 + 0.08 * intensity));
        return `rgb(${v}, ${v}, ${v})`;
    }
    return '#000000';
}

function buildMesh(radius) {
    const quads = [];
    for (let i = 0; i < LAT_STEPS; i++) {
        const lat0 = -Math.PI / 2 + (i / LAT_STEPS) * Math.PI;
        const lat1 = -Math.PI / 2 + ((i + 1) / LAT_STEPS) * Math.PI;
        for (let j = 0; j < LON_STEPS; j++) {
            const lon0 = (j / LON_STEPS) * Math.PI * 2;
            const lon1 = ((j + 1) / LON_STEPS) * Math.PI * 2;
            const midLat = (lat0 + lat1) * 0.5;
            const midLon = (lon0 + lon1) * 0.5;
            quads.push({
                corners: [
                    spherePoint(lat0, lon0, radius),
                    spherePoint(lat0, lon1, radius),
                    spherePoint(lat1, lon1, radius),
                    spherePoint(lat1, lon0, radius),
                ],
                midLat,
                midLon,
            });
        }
    }
    return quads;
}

function getMesh(radius) {
    const key = Math.round(radius);
    if (getMesh.cacheKey !== key) {
        getMesh.cacheKey = key;
        getMesh.cache = buildMesh(radius);
    }
    return getMesh.cache;
}

function drawSphereFrame(ctx, w, h, rotY) {
    const cx = w * 0.5;
    const cy = h * 0.52;
    const radius = Math.min(w, h) * 0.34;
    const focal = Math.max(w, h) * 2.2;
    const light = normalize([0.35, 0.55, 0.75]);
    const mesh = getMesh(radius);

    ctx.clearRect(0, 0, w, h);

    const faces = [];
    for (const quad of mesh) {
        const rotated = quad.corners.map((p) => rotatePoint(p, TILT_X, rotY));
        const avgZ = rotated.reduce((sum, p) => sum + p[2], 0) / 4;
        const nx = Math.cos(quad.midLat) * Math.sin(quad.midLon);
        const ny = Math.sin(quad.midLat);
        const nz = Math.cos(quad.midLat) * Math.cos(quad.midLon);
        const rn = rotatePoint([nx, ny, nz], TILT_X, rotY);
        const facing = rn[2] > 0.02;
        if (!facing) continue;

        const projected = rotated.map(([x, y, z]) => {
            const s = focal / (focal + z);
            return [cx + x * s, cy + y * s, z];
        });

        faces.push({
            avgZ,
            projected,
            shade: checkerShade(quad.midLat, quad.midLon),
            intensity: 0.32 + 0.68 * Math.max(0, dot(rn, light)),
        });
    }

    faces.sort((a, b) => a.avgZ - b.avgZ);

    for (const face of faces) {
        ctx.fillStyle = faceFill(face.shade, face.intensity);
        ctx.beginPath();
        ctx.moveTo(face.projected[0][0], face.projected[0][1]);
        for (let i = 1; i < face.projected.length; i++) {
            ctx.lineTo(face.projected[i][0], face.projected[i][1]);
        }
        ctx.closePath();
        ctx.fill();
    }
}

function normalize([x, y, z]) {
    const len = Math.hypot(x, y, z) || 1;
    return [x / len, y / len, z / len];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
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

function paintCanvas(canvas, rotY) {
    const { w, h } = resizeCanvas(canvas);
    if (w < 4 || h < 4) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    drawSphereFrame(ctx, w, h, rotY);
    canvas.classList.add('vault-sphere-canvas--ready');
    return true;
}

function warmMeshForCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const radius = Math.round(Math.min(rect.width, rect.height) * dpr * 0.34);
    if (radius > 0) getMesh(radius);
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
    warmMeshForCanvas(canvas);
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

    warmMeshForCanvas(canvas);

    requestAnimationFrame(() => {
        warmMeshForCanvas(canvas);
        paintCanvas(canvas, state.rotY);
        maybeStart();
    });

    const ro = new ResizeObserver(() => {
        warmMeshForCanvas(canvas);
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
    document.querySelectorAll('.vault-sphere-canvas').forEach((canvas) => {
        warmMeshForCanvas(canvas);
        initVaultSphere(canvas);
    });
}
