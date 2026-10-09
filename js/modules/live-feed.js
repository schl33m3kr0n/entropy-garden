/** Live Feed modal — scrolling social non-activity ticker. */

import { createBag, pickOne, perf } from '../core/shared.js';

const ITEM_DURATION_MS = 4200;
const GAP_MS = 280;

let statusEl = null;
let cycleTimer = 0;
let running = false;
const drawLineKind = createBag(['follow', 'follow', 'activity', 'activity', 'activity', 'unfollow']);

function buildLine() {
    const pools = globalThis.lorePools ?? {};
    const handles = pools.liveFeedFollowHandles ?? [];
    const unfollowHandles = pools.liveFeedUnfollowHandles ?? [];
    const activities = pools.liveFeedActivitiesSafe ?? [];
    const gritty = pools.liveFeedActivitiesGritty ?? [];

    const kind = drawLineKind();
    if (kind === 'follow' && handles.length) {
        return `followed @${pickOne(handles) || 'Someone'}`;
    }
    if (kind === 'unfollow' && unfollowHandles.length) {
        return `unfollowed @${pickOne(unfollowHandles) || 'Someone'}`;
    }
    return pickOne(activities, gritty) || '';
}

function restartAnimation() {
    if (!statusEl) return;
    statusEl.classList.remove('is-animating');
    void statusEl.offsetWidth;
    statusEl.classList.add('is-animating');
}

function showNextLine() {
    if (!statusEl || !running) return;

    statusEl.textContent = buildLine();

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
