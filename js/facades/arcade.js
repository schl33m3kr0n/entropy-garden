import { arcadeLoader } from '../loaders/arcade.js';

export function loadArcade() {
    return arcadeLoader.load();
}

export async function loadArcadeLevel() {
    const mod = await loadArcade();
    mod.loadArcadeLevel();
}
