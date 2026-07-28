/** Live Feed modal — scrolling social non-activity ticker. */

import { perf } from '../core/shared.js';
import { isCorrupted } from '../core/state.js';

const ITEM_DURATION_MS = 3800;
const SPAWN_MIN_MS = 1400;
const SPAWN_MAX_MS = 2800;
const MAX_TRACK_ITEMS = 8;

let trackEl = null;
let spawnTimer = 0;
let running = false;
let recentLines = [];

function pickOne(safe = [], gritty = []) {
    const useGritty = isCorrupted && gritty.length;
    const pool = useGritty && Math.random() < 0.35 ? gritty : safe;
    const fallback = useGritty ? safe : gritty;
    const source = pool.length ? pool : fallback;
    if (!source.length) return '';
    return source[Math.floor(Math.random() * source.length)];
}

function pickHandle(handles = []) {
    if (!handles.length) return 'Someone';
    return handles[Math.floor(Math.random() * handles.length)];
}

function buildLine() {
    const pools = globalThis.lorePools ?? {};
    const handles = pools.liveFeedFollowHandles ?? [];
    const unfollowHandles = pools.liveFeedUnfollowHandles ?? [];
    const activities = pools.liveFeedActivitiesSafe ?? [];
    const gritty = pools.liveFeedActivitiesGritty ?? [];

    const roll = Math.random();
    if (roll < 0.34) {
        return `followed @${pickHandle(handles)}`;
    }
    if (roll < 0.48 && unfollowHandles.length) {
        return `unfollowed @${pickHandle(unfollowHandles)}`;
    }
    return pickOne(activities, gritty);
}

function pickUniqueLine() {
    for (let attempt = 0; attempt < 6; attempt += 1) {
        const line = buildLine();
        if (!recentLines.includes(line)) return line;
    }
    return buildLine();
}

function rememberLine(line) {
    recentLines = [...recentLines.slice(-11), line];
}

function spawnItem() {
    if (!trackEl || !running) return;

    const text = pickUniqueLine();
    rememberLine(text);

    const item = document.createElement('p');
    item.className = 'live-feed-item';
    item.textContent = text;

    if (perf.prefersReducedMotion) {
        item.classList.add('live-feed-item--static');
    }

    trackEl.appendChild(item);

    while (trackEl.children.length > MAX_TRACK_ITEMS) {
        trackEl.removeChild(trackEl.firstChild);
    }

    if (!perf.prefersReducedMotion) {
        item.addEventListener('animationend', () => {
            item.remove();
        }, { once: true });
        return;
    }

    setTimeout(() => {
        item.remove();
    }, ITEM_DURATION_MS);
}

function scheduleSpawn() {
    clearTimeout(spawnTimer);
    if (!running) return;

    const delay = perf.prefersReducedMotion
        ? ITEM_DURATION_MS + 400
        : SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);

    spawnTimer = window.setTimeout(() => {
        spawnItem();
        scheduleSpawn();
    }, delay);
}

export function startLiveFeed() {
    trackEl = document.getElementById('live-feed-track');
    if (!trackEl || running) return;

    running = true;
    recentLines = [];
    trackEl.replaceChildren();
    spawnItem();
    scheduleSpawn();
}

export function stopLiveFeed() {
    running = false;
    clearTimeout(spawnTimer);
    spawnTimer = 0;
    trackEl?.replaceChildren();
    trackEl = null;
}
