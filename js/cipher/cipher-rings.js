/**
 * Caesar decoder rings — only applied while the terminal cipher is active.
 */
export const LATIN_26 = 'abcdefghijklmnopqrstuvwxyz';
const ALPHA = LATIN_26.split('');

/** @type {[number, number] | null} */
let caesarPairIndices = null;

/**
 * Pick the two ring indices whose natural charCount is nearest 26.
 * @param {Array<{ charCount: number, ringIndex: number }>} wheels
 * @returns {[number, number] | null}
 */
export function pickCaesarRingPairIndices(wheels) {
    if (!wheels?.length) return null;
    if (wheels.length === 1) return [0, 0];

    const ranked = wheels
        .map((w, i) => ({ i, delta: Math.abs(w.charCount - 26) }))
        .sort((a, b) => a.delta - b.delta || wheels[a.i].ringIndex - wheels[b.i].ringIndex);

    const first = ranked[0].i;
    const second = ranked.find((r) => r.i !== first)?.i ?? ranked[1].i;
    const a = Math.min(first, second);
    const b = Math.max(first, second);
    return wheels[a].ringIndex <= wheels[b].ringIndex ? [a, b] : [b, a];
}

function normalizeShift(shift) {
    return ((Number(shift) % 26) + 26) % 26;
}

function snapshotWheel(wheel) {
    return {
        charCount: wheel.charCount,
        glyphs: wheel.glyphs.slice(),
        glyphColors: wheel.glyphColors?.slice() ?? null,
        spinSpeed: wheel.spinSpeed,
        cycleEvery: wheel.cycleEvery,
        angle: wheel.angle,
        burstSpeed: wheel.burstSpeed,
        burstUntil: wheel.burstUntil,
    };
}

function restoreWheel(wheel) {
    const saved = wheel._caesarRestore;
    if (!saved) return false;

    wheel.charCount = saved.charCount;
    wheel.glyphs = saved.glyphs;
    wheel.glyphColors = saved.glyphColors;
    wheel.spinSpeed = saved.spinSpeed;
    wheel.cycleEvery = saved.cycleEvery;
    wheel.angle = saved.angle;
    wheel.burstSpeed = saved.burstSpeed;
    wheel.burstUntil = saved.burstUntil;
    wheel.isCipherRing = false;
    wheel.cipherRole = null;
    wheel.caesarShift = undefined;
    delete wheel._caesarRestore;
    return true;
}

/** Restore any wheels previously converted into alphabet decoder rings. */
export function clearCaesarDecoderRings(wheels) {
    if (!wheels?.length) return;

    let cleared = false;
    for (const wheel of wheels) {
        if (restoreWheel(wheel)) cleared = true;
    }
    if (cleared) {
        caesarPairIndices = null;
    }
}

/**
 * @param {Array} wheels
 * @param {{ active?: boolean, shift?: number }} [options]
 */
export function applyCaesarDecoderRings(wheels, options = {}) {
    if (!wheels?.length) return;

    const { active = false, shift = 3 } = options;
    if (!active) return;

    const shiftNorm = normalizeShift(shift);
    const slot = (Math.PI * 2) / 26;

    if (!caesarPairIndices || wheels.length < 2) {
        caesarPairIndices = pickCaesarRingPairIndices(wheels);
    }
    if (!caesarPairIndices) return;

    const [innerIdx, outerIdx] = caesarPairIndices;
    if (!wheels[innerIdx] || !wheels[outerIdx]) return;

    for (const idx of [innerIdx, outerIdx]) {
        const wheel = wheels[idx];
        if (!wheel._caesarRestore) {
            wheel._caesarRestore = snapshotWheel(wheel);
        }
        wheel.charCount = 26;
        wheel.glyphs = [...ALPHA];
        wheel.glyphColors = null;
        wheel.isCipherRing = true;
        wheel.cipherRole = idx === innerIdx ? 'cipher' : 'plain';
    }

    const inner = wheels[innerIdx];
    const outer = wheels[outerIdx];

    inner.spinSpeed = 0;
    outer.spinSpeed = 0;
    inner.cycleEvery = 1e9;
    outer.cycleEvery = 1e9;
    inner.burstSpeed = 0;
    outer.burstSpeed = 0;
    inner.burstUntil = 0;
    outer.burstUntil = 0;
    inner.angle = outer.angle + shiftNorm * slot;
    inner.caesarShift = shiftNorm;
    outer.caesarShift = 0;
}

export function getCaesarDecoderWheels(wheels) {
    if (!wheels?.length) return null;
    const inner = wheels.find((w) => w.isCipherRing && w.cipherRole === 'cipher');
    const outer = wheels.find((w) => w.isCipherRing && w.cipherRole === 'plain');
    if (!inner || !outer) return null;
    return { inner, outer };
}

/** Rotate the inner decoder ring by whole letter slots (positive = scroll down). */
export function rotateCaesarCipherRing(wheels, slotDelta) {
    const pair = getCaesarDecoderWheels(wheels);
    if (!pair || !slotDelta) return false;
    const slot = (Math.PI * 2) / 26;
    pair.inner.angle += slotDelta * slot;
    return true;
}

export function resetCaesarPairCache() {
    caesarPairIndices = null;
}

export function getCaesarPairIndices() {
    return caesarPairIndices;
}
