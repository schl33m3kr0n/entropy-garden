/** Live Feed modal — scrolling social non-activity ticker. */

import { perf } from '../core/shared.js';
import { isCorrupted } from '../core/state.js';

const ITEM_DURATION_MS = 4200;
const GAP_MS = 280;

let statusEl = null;
let cycleTimer = 0;
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

function restartAnimation() {
    if (!statusEl) return;
    statusEl.classList.remove('is-animating');
    void statusEl.offsetWidth;
    statusEl.classList.add('is-animating');
}

function showNextLine() {
    if (!statusEl || !running) return;

    const text = pickUniqueLine();
    rememberLine(text);
    statusEl.textContent = text;

    if (perf.prefersReducedMotion) {
        cycleTimer = window.setTimeout(showNextLine, ITEM_DURATION_MS + GAP_MS);
        return;
    }

    restartAnimation();
    statusEl.addEventListener('animationend', onLineFinished, { once: true });
}

function onLineFinished() {
    if (!running) return;
    cycleTimer = window.setTimeout(showNextLine, GAP_MS);
}

export function startLiveFeed() {
    statusEl = document.getElementById('live-feed-status');
    if (!statusEl || running) return;

    running = true;
    recentLines = [];
    statusEl.textContent = '';
    statusEl.classList.remove('is-animating');
    showNextLine();
}

export function stopLiveFeed() {
    running = false;
    clearTimeout(cycleTimer);
    cycleTimer = 0;
    if (statusEl) {
        statusEl.classList.remove('is-animating');
        statusEl.textContent = '';
    }
    statusEl = null;
}
