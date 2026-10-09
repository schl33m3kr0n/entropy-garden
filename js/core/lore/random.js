/** Lore bag shuffle + panopticon comment timing helpers. */
import { isCorrupted } from '../state.js';

export function shuffle(array) {
    let currentIndex = array.length;
    let randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

export function createBag(arr) {
    const source = Array.isArray(arr) ? arr : [];
    let bag = [];
    let lastDrawn;
    return function draw(count = 1) {
        if (!source.length) return count === 1 ? undefined : [];
        const results = [];
        for (let i = 0; i < count; i++) {
            if (bag.length === 0) {
                bag = shuffle([...source]);
                const avoid = results.length ? results[results.length - 1] : lastDrawn;
                if (source.length > 1 && avoid !== undefined && bag[bag.length - 1] === avoid) {
                    const swapAt = Math.floor(Math.random() * (bag.length - 1));
                    [bag[swapAt], bag[bag.length - 1]] = [bag[bag.length - 1], bag[swapAt]];
                }
            }
            results.push(bag.pop());
        }
        lastDrawn = results[results.length - 1];
        return count === 1 ? results[0] : results;
    };
}

const loreBagRegistry = new WeakMap();

function getLoreDrawer(safe, gritty = []) {
    let entry = loreBagRegistry.get(safe);
    if (!entry) {
        entry = {};
        loreBagRegistry.set(safe, entry);
    }
    const useGritty = isCorrupted && gritty.length;
    const key = useGritty ? 'gritty' : 'safe';
    if (!entry[key]) {
        const pool = useGritty ? safe.concat(gritty) : safe.slice();
        entry[key] = createBag(pool);
    }
    return entry[key];
}

export function pickOne(safe, gritty = []) {
    if (!Array.isArray(safe)) return undefined;
    return getLoreDrawer(safe, gritty)();
}

export function pickMany(safe, gritty, count) {
    if (!Array.isArray(safe)) return [];
    return getLoreDrawer(safe, gritty)(count);
}

/** Display time scaled to comment length (~12 chars/sec at default rate). */
export function commentTtlMs(text, {
    minMs = 2400,
    maxMs = 14000,
    baseMs = 1600,
    msPerChar = 48,
    reducedMotion = false,
} = {}) {
    const len = String(text ?? '').trim().length;
    let ms = baseMs + len * msPerChar;
    if (reducedMotion) ms *= 1.12;
    return Math.round(Math.min(maxMs, Math.max(minMs, ms)));
}
