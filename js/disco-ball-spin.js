/** Disco ball — spinning checkered sphere grid (SVG polygons, vault-sphere math). */

export const DISCO_BALL_SPIN_DEFAULTS = {
    checks: 12,
    tiltX: 0.14,
    speed: 0.75,
    cx: 50,
    cy: 52,
    r: 42,
    strokeWidth: 1.5,
    fillLight: '#ffffff',
    fillDark: '#e6e6e6',
    stroke: '#000000',
    chromaAmount: 4,
    chromaVariable: true,
    chromaFalloff: 0.7,
    chromaAngle: 127,
    chromaOpacity: 0.1,
    chromaRed: '#ff0055',
    chromaCyan: '#00ffff',
    bgSpeed: 0.5,
    reflectStrength: 0.42,
    specularStrength: 0.3,
    trailLength: 0,
    trailOpacity: 0.42,
    trailFade: 0.78,
    trailStep: 0.035,
};

const FRONT_EPS = 0.001;
const CHROMA_HUES = [0, 60, 120, 180, 240, 300, 360];
const LIGHT = normalizeVec([0.35, 0.55, 0.75]);
const VIEW = [0, 0, 1];
const SVG_NS = 'http://www.w3.org/2000/svg';

const activeRoots = new WeakSet();
const controllers = new WeakMap();

function normalizeVec([x, y, z]) {
    const len = Math.hypot(x, y, z) || 1;
    return [x / len, y / len, z / len];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
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

function rgbToHex([r, g, b]) {
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function mixRgb(a, b, t) {
    return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
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

function spherePoint(lat, lon) {
    const cl = Math.cos(lat);
    return [cl * Math.sin(lon), Math.sin(lat), cl * Math.cos(lon)];
}

function checkerShade(lat, lon, checks) {
    const u = ((lon / Math.PI) + 1) * 0.5;
    const v = (lat / Math.PI) + 0.5;
    return (Math.floor(u * checks) + Math.floor(v * checks)) % 2;
}

function project([x, y, z], config) {
    return [config.cx + x * config.r, config.cy + y * config.r];
}

function reflectVector(view, normal) {
    const d = 2 * dot(view, normal);
    return normalizeVec([
        view[0] - d * normal[0],
        view[1] - d * normal[1],
        view[2] - d * normal[2],
    ]);
}

function envHueFromReflect(reflectDir, bgPhase) {
    return ((Math.atan2(reflectDir[0], reflectDir[2]) / Math.PI + 1) * 0.5 * 360 + bgPhase) % 360;
}

function faceNormal(rotated) {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (const p of rotated) {
        sx += p[0];
        sy += p[1];
        sz += p[2];
    }
    return normalizeVec([sx / rotated.length, sy / rotated.length, sz / rotated.length]);
}

function tileFill(normal, shade, config, bgPhase) {
    const reflect = config.reflectStrength ?? 0.62;
    const specular = config.specularStrength ?? 0.78;
    const reflectDir = reflectVector(VIEW, normal);
    const envHue = envHueFromReflect(reflectDir, bgPhase);
    const facing = Math.max(normal[2], 0);
    const lit = Math.max(dot(normal, LIGHT), 0);
    const spec = Math.pow(lit, 8) * specular;

    const baseGrey = shade ? 78 : 88;
    let rgb = hslToRgb(0, 0, baseGrey);

    const envMix = reflect * (0.4 + 0.6 * Math.pow(facing, 0.4));
    const envRgb = hslToRgb(envHue, 100, 38 + lit * 32);
    rgb = mixRgb(rgb, envRgb, envMix);

    if (spec > 0.015) {
        rgb = mixRgb(rgb, [255, 255, 255], Math.min(spec * 0.95, 0.95));
    }

    return rgbToHex(rgb);
}

function buildFaces(rotY, config) {
    const faces = [];
    const { checks, tiltX } = config;

    for (let i = 0; i < checks; i++) {
        const lat0 = -Math.PI / 2 + (i / checks) * Math.PI;
        const lat1 = -Math.PI / 2 + ((i + 1) / checks) * Math.PI;

        for (let j = 0; j < checks * 2; j++) {
            const lon0 = -Math.PI + (j / (checks * 2)) * Math.PI * 2;
            const lon1 = -Math.PI + ((j + 1) / (checks * 2)) * Math.PI * 2;

            const corners3d = [
                spherePoint(lat0, lon0),
                spherePoint(lat0, lon1),
                spherePoint(lat1, lon1),
                spherePoint(lat1, lon0),
            ];

            const rotated = corners3d.map((p) => rotatePoint(p, tiltX, rotY));
            if (rotated.every((p) => p[2] <= FRONT_EPS)) continue;

            const projected = rotated.map((p) => project(p, config));
            const depth = rotated.reduce((sum, p) => sum + Math.max(p[2], 0), 0) / rotated.length;
            const centerLat = (lat0 + lat1) * 0.5;
            const centerLon = (lon0 + lon1) * 0.5;

            faces.push({
                depth,
                shade: checkerShade(centerLat, centerLon, checks),
                points: projected,
                normal: faceNormal(rotated),
            });
        }
    }

    faces.sort((a, b) => a.depth - b.depth);
    return faces;
}

function faceCenter(points) {
    let sx = 0;
    let sy = 0;
    for (const [x, y] of points) {
        sx += x;
        sy += y;
    }
    return [sx / points.length, sy / points.length];
}

function faceOffset(points, config, { amountKey, falloffKey, angleKey, variableKey }) {
    const amount = config[amountKey] ?? 0;
    if (amount <= 0) return null;

    const [fx, fy] = faceCenter(points);
    const dist = Math.hypot(fx - config.cx, fy - config.cy) / config.r;

    let strength = amount;
    if (config[variableKey] !== false) {
        const falloff = config[falloffKey] ?? 1.5;
        strength *= Math.pow(Math.min(Math.max(dist, 0), 1), falloff);
    }

    if (strength < 0.01) return null;

    const rad = ((config[angleKey] ?? 0) * Math.PI) / 180;
    return {
        rx: Math.cos(rad) * strength,
        ry: Math.sin(rad) * strength,
    };
}

function chromaOffsetForFace(points, config) {
    return faceOffset(points, config, {
        amountKey: 'chromaAmount',
        falloffKey: 'chromaFalloff',
        angleKey: 'chromaAngle',
        variableKey: 'chromaVariable',
    });
}

function shiftPoints(points, dx, dy) {
    return points.map(([x, y]) => [x + dx, y + dy]);
}

function buildFaceStack(faces, config, bgPhase, { layerOpacity = 1, includeSpecular = true, includeChroma = true } = {}) {
    const stack = document.createDocumentFragment();

    const faceLayer = document.createElementNS(SVG_NS, 'g');
    faceLayer.setAttribute('class', 'disco-ball-faces');
    if (layerOpacity < 1) faceLayer.setAttribute('opacity', String(layerOpacity));

    faces.forEach((face) => {
        appendPolygon(faceLayer, face.points, {
            fill: tileFill(face.normal, face.shade, config, bgPhase),
            stroke: config.stroke,
            'stroke-width': config.strokeWidth,
            'stroke-linejoin': 'round',
        });

        if (includeSpecular) {
            const specular = config.specularStrength ?? 0.78;
            const spec = Math.pow(Math.max(dot(face.normal, LIGHT), 0), 10);
            if (specular > 0.01 && spec > 0.22) {
                const [cx, cy] = faceCenter(face.points);
                const glint = face.points.map(([x, y]) => [
                    cx + (x - cx) * 0.5,
                    cy + (y - cy) * 0.5,
                ]);
                appendPolygon(faceLayer, glint, {
                    fill: '#ffffff',
                    'fill-opacity': Math.min(0.7, spec * specular),
                    stroke: 'none',
                });
            }
        }
    });

    stack.appendChild(faceLayer);

    if (includeChroma && (config.chromaAmount ?? 0) > 0) {
        const chromaLayer = document.createElementNS(SVG_NS, 'g');
        chromaLayer.setAttribute('class', 'disco-ball-chroma-fringe');
        chromaLayer.setAttribute('style', 'mix-blend-mode: screen');
        if (layerOpacity < 1) chromaLayer.setAttribute('opacity', String(layerOpacity));

        faces.forEach((face) => {
            const offset = chromaOffsetForFace(face.points, config);
            if (!offset) return;

            appendPolygon(chromaLayer, shiftPoints(face.points, offset.rx, offset.ry), {
                fill: config.chromaRed ?? '#ff0055',
                'fill-opacity': config.chromaOpacity ?? 0.65,
                stroke: 'none',
            });
            appendPolygon(chromaLayer, shiftPoints(face.points, -offset.rx, -offset.ry), {
                fill: config.chromaCyan ?? '#00ffff',
                'fill-opacity': config.chromaOpacity ?? 0.65,
                stroke: 'none',
            });
        });

        stack.appendChild(chromaLayer);
    }

    return stack;
}

function renderGrid(grid, rotY, config, bgPhase, trailHistory = []) {
    grid.replaceChildren();

    const trailLen = Math.max(0, Math.round(config.trailLength ?? 0));
    if (trailLen > 0 && trailHistory.length) {
        const trailOpacity = config.trailOpacity ?? 0.42;
        const trailFade = config.trailFade ?? 0.78;

        for (let i = trailHistory.length - 1; i >= 0; i -= 1) {
            const sample = trailHistory[i];
            const age = i + 1;
            const opacity = trailOpacity * (trailFade ** (age - 1));
            if (opacity < 0.015) continue;

            const faces = buildFaces(sample.rotY, config);
            const trailGroup = document.createElementNS(SVG_NS, 'g');
            trailGroup.setAttribute('class', 'disco-ball-trail');
            trailGroup.appendChild(buildFaceStack(faces, config, sample.bgPhase, {
                layerOpacity: opacity,
                includeSpecular: false,
                includeChroma: false,
            }));
            grid.appendChild(trailGroup);
        }
    }

    const faces = buildFaces(rotY, config);
    const currentGroup = document.createElementNS(SVG_NS, 'g');
    currentGroup.setAttribute('class', 'disco-ball-current');
    currentGroup.appendChild(buildFaceStack(faces, config, bgPhase));
    grid.appendChild(currentGroup);
}

function appendPolygon(parent, points, attrs) {
    const poly = document.createElementNS(SVG_NS, 'polygon');
    poly.setAttribute(
        'points',
        points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
    );
    Object.entries(attrs).forEach(([key, value]) => {
        poly.setAttribute(key, String(value));
    });
    parent.appendChild(poly);
}

function ensureChromaGradient(svg, bgPhase) {
    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        svg.prepend(defs);
    }

    let grad = defs.querySelector('#disco-ball-chroma-bg');
    if (!grad) {
        grad = document.createElementNS(SVG_NS, 'linearGradient');
        grad.id = 'disco-ball-chroma-bg';
        grad.setAttribute('x1', '0');
        grad.setAttribute('y1', '0');
        grad.setAttribute('x2', '100');
        grad.setAttribute('y2', '0');
        grad.setAttribute('gradientUnits', 'userSpaceOnUse');
        grad.setAttribute('spreadMethod', 'repeat');

        CHROMA_HUES.forEach((hue, index) => {
            const stop = document.createElementNS(SVG_NS, 'stop');
            stop.setAttribute('offset', `${(index / (CHROMA_HUES.length - 1)) * 100}%`);
            stop.setAttribute('stop-color', rgbToHex(hslToRgb(hue, 100, 52)));
            grad.appendChild(stop);
        });

        defs.appendChild(grad);
    }

    const cycle = (bgPhase / 360) * 100;
    grad.setAttribute('gradientTransform', `translate(${-cycle}, 0)`);
}

function resolveBackground(svg, config, bgPhase) {
    ensureChromaGradient(svg, bgPhase);

    let bg = svg.querySelector('.disco-ball-bg');
    if (!bg) {
        bg = document.createElementNS(SVG_NS, 'circle');
        bg.setAttribute('class', 'disco-ball-bg');
        bg.setAttribute('clip-path', 'url(#disco-ball-clip)');

        const grid = svg.querySelector('.disco-ball-grid');
        if (grid) {
            svg.insertBefore(bg, grid);
        } else {
            svg.appendChild(bg);
        }
    }

    bg.setAttribute('cx', String(config.cx));
    bg.setAttribute('cy', String(config.cy));
    bg.setAttribute('r', String(config.r));
    bg.setAttribute('fill', 'url(#disco-ball-chroma-bg)');
}

function applyBallGeometry(svg, config) {
    if (!svg) return;

    const clip = svg.querySelector('#disco-ball-clip circle');
    if (clip) {
        clip.setAttribute('cx', String(config.cx));
        clip.setAttribute('cy', String(config.cy));
        clip.setAttribute('r', String(config.r));
    }

    svg.querySelector('.disco-ball-outline')?.remove();
}

function resolveGrid(svg) {
    let grid = svg.querySelector('.disco-ball-grid');
    if (grid) return grid;

    grid = document.createElementNS(SVG_NS, 'g');
    grid.setAttribute('class', 'disco-ball-grid');
    grid.setAttribute('clip-path', 'url(#disco-ball-clip)');

    const bg = svg.querySelector('.disco-ball-bg');
    if (bg?.nextSibling) {
        svg.insertBefore(grid, bg.nextSibling);
    } else {
        svg.appendChild(grid);
    }

    return grid;
}

/**
 * @param {Element | SVGSVGElement} root
 * @param {{ rotY?: number, speed?: number, paused?: boolean, bgPhase?: number } & Partial<typeof DISCO_BALL_SPIN_DEFAULTS>} [options]
 */
export function initDiscoBallSpin(root, options = {}) {
    if (controllers.has(root)) return controllers.get(root);

    const svg = root instanceof SVGSVGElement ? root : root.querySelector('svg');
    if (!svg) return { stop() {}, setConfig() {}, setSpeed() {}, setPaused() {} };

    const grid = resolveGrid(svg);
    activeRoots.add(root);

    const config = { ...DISCO_BALL_SPIN_DEFAULTS, ...options };
    let rotY = options.rotY ?? 0;
    let bgPhase = options.bgPhase ?? 0;
    let paused = options.paused ?? false;
    let raf = 0;
    let lastFrame = 0;
    let disposed = false;
    /** @type {{ rotY: number, bgPhase: number }[]} */
    const trailHistory = [];

    const pushTrailSample = () => {
        const trailLen = Math.max(0, Math.round(config.trailLength ?? 0));
        if (trailLen <= 0 || paused) return;

        const step = config.trailStep ?? 0.035;
        const head = trailHistory[0];
        if (head && Math.abs(rotY - head.rotY) < step) return;

        trailHistory.unshift({ rotY, bgPhase });
        while (trailHistory.length > trailLen) trailHistory.pop();
    };

    const paint = () => {
        applyBallGeometry(svg, config);
        resolveBackground(svg, config, bgPhase);
        renderGrid(grid, rotY, config, bgPhase, trailHistory);
    };

    const tick = (now) => {
        if (disposed) return;
        const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
        lastFrame = now;
        if (!paused) {
            rotY += config.speed * dt;
            bgPhase = (bgPhase + (config.bgSpeed ?? 0.12) * dt * 360) % 360;
            pushTrailSample();
        }
        resolveBackground(svg, config, bgPhase);
        renderGrid(grid, rotY, config, bgPhase, trailHistory);
        raf = requestAnimationFrame(tick);
    };

    paint();
    lastFrame = performance.now();
    raf = requestAnimationFrame(tick);

    const api = {
        stop() {
            disposed = true;
            cancelAnimationFrame(raf);
            activeRoots.delete(root);
            controllers.delete(root);
        },
        setConfig(partial) {
            Object.assign(config, partial);
            if ((config.trailLength ?? 0) <= 0) trailHistory.length = 0;
            paint();
        },
        setSpeed(value) {
            config.speed = value;
        },
        setPaused(value) {
            paused = value;
        },
        setBgPhase(value) {
            bgPhase = value % 360;
            paint();
        },
        getConfig() {
            return { ...config, bgPhase };
        },
    };

    controllers.set(root, api);
    return api;
}

export function initDiscoBallSpinInDocument(root = document) {
    const cleanups = [];
    root.querySelectorAll('[data-disco-ball-spin]').forEach((el) => {
        cleanups.push(initDiscoBallSpin(el).stop);
    });
    return () => cleanups.forEach((stop) => stop());
}
