/** Vault — software-rendered 3D checkered sphere with icon eyes. */

const LAT_STEPS = 22;
const LON_STEPS = 32;
const CHECKS = 8;
const TILT_X = 0.28;
const SPIN_SPEED = 0.55;

const EYE_LAT = 0.22;
const EYE_LON = 0.32;
const EYE_SPHERE_R = 0.17;

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

function shadeColor(base, intensity) {
    const v = Math.round(base * intensity);
    return `rgb(${v}, ${v}, ${v})`;
}

function drawEyeIcon(ctx, x, y, size, fill, bg) {
    const half = size * 0.5;
    ctx.fillStyle = bg;
    ctx.fillRect(x - half, y - half, size, size);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 24, size / 24);
    ctx.translate(-12, -12);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(12, 4.5);
    ctx.bezierCurveTo(7, 4.5, 2.7, 7.8, 1, 12);
    ctx.bezierCurveTo(2.7, 16.2, 7, 19.5, 12, 19.5);
    ctx.bezierCurveTo(17, 19.5, 21.3, 16.2, 23, 12);
    ctx.bezierCurveTo(21.3, 7.8, 17, 4.5, 12, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12, 12, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
        const base = face.shade ? 255 : 18;
        ctx.fillStyle = shadeColor(base, face.intensity);
        ctx.beginPath();
        ctx.moveTo(face.projected[0][0], face.projected[0][1]);
        for (let i = 1; i < face.projected.length; i++) {
            ctx.lineTo(face.projected[i][0], face.projected[i][1]);
        }
        ctx.closePath();
        ctx.fill();
    }

    const eyes = [
        { lon: -EYE_LON },
        { lon: EYE_LON },
    ];

    for (const eye of eyes) {
        const p = rotatePoint(spherePoint(EYE_LAT, eye.lon, radius * 1.01), TILT_X, rotY);
        if (p[2] <= 0) continue;
        const s = focal / (focal + p[2]);
        const sx = cx + p[0] * s;
        const sy = cy + p[1] * s;
        const eyeSize = radius * EYE_SPHERE_R * s * 2.2;
        const onWhite = checkerShade(EYE_LAT, eye.lon) === 1;
        const bg = onWhite ? '#fff' : '#000';
        const fill = onWhite ? '#000' : '#fff';
        drawEyeIcon(ctx, sx, sy, eyeSize, fill, bg);
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

function animate(canvas, state) {
    if (!activeCanvases.has(canvas)) return;
    const now = performance.now();
    const dt = state.lastFrame ? Math.min((now - state.lastFrame) / 1000, 0.05) : 0;
    state.lastFrame = now;
    resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    state.rotY += SPIN_SPEED * dt;
    drawSphereFrame(ctx, canvas.width, canvas.height, state.rotY);
    state.raf = requestAnimationFrame(() => animate(canvas, state));
}

function startLoop(canvas) {
    if (activeCanvases.has(canvas)) return;
    activeCanvases.add(canvas);
    const state = { rotY: 0, raf: 0, lastFrame: 0 };
    canvas._vaultSphereState = state;
    animate(canvas, state);
}

function stopLoop(canvas) {
    activeCanvases.delete(canvas);
    const state = canvas._vaultSphereState;
    if (state?.raf) cancelAnimationFrame(state.raf);
    canvas._vaultSphereState = null;
}

export function initVaultSphere(canvas) {
    if (!canvas || canvas.dataset.bound) return;
    canvas.dataset.bound = '1';

    const modal = document.getElementById('modal-vault');

    const maybeStart = () => {
        if (modal && getComputedStyle(modal).display === 'none') {
            stopLoop(canvas);
            return;
        }
        startLoop(canvas);
    };

    maybeStart();

    const ro = new ResizeObserver(() => {
        resizeCanvas(canvas);
    });
    ro.observe(canvas);

    if (modal) {
        const obs = new MutationObserver(maybeStart);
        obs.observe(modal, { attributes: true, attributeFilter: ['style'] });
    }
}

export function initVaultSpheres() {
    document.querySelectorAll('.vault-sphere-canvas').forEach(initVaultSphere);
}
