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
    let bag = [];
    return function draw(count = 1) {
        const results = [];
        for (let i = 0; i < count; i++) {
            if (bag.length === 0) bag = shuffle([...arr]);
            results.push(bag.pop());
        }
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
    return getLoreDrawer(safe, gritty)();
}

export function pickMany(safe, gritty, count) {
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
