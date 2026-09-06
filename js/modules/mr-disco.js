/** Mr. Disco modal — disco ball with tracking eyes + alternate history archive. */

import { initDiscoBallEyes } from '../disco-ball-eyes.js';
import { initDiscoBallSpin } from '../disco-ball-spin.js';
import { initDashboard } from "./dashboard.js";
import { loadAlternateHistoryArticles } from '../data/alternate-history.data.js';
import { resolveAlternateHistoryArticles } from '../alternate-history-search.js';

const ALT_HISTORY_SEEN_KEY = 'entropy-garden-alt-history-seen-v1';

/** @type {import('../data/alternate-history.data.js').AlternateHistoryArticle[]} */
let alternateHistoryArticles = [];
/** @type {Set<string>} */
let validArticleIds = new Set();

function loadSeenAlternateHistoryIds() {
    try {
        const raw = localStorage.getItem(ALT_HISTORY_SEEN_KEY);
        if (!raw) return new Set();
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return new Set();
        return new Set(arr.filter((id) => validArticleIds.has(id)));
    } catch {
        return new Set();
    }
}

function markAlternateHistorySeen(ids) {
    const seen = loadSeenAlternateHistoryIds();
    ids.forEach((id) => {
        if (validArticleIds.has(id)) seen.add(id);
    });
    try {
        localStorage.setItem(ALT_HISTORY_SEEN_KEY, JSON.stringify([...seen]));
    } catch {
        /* private mode / quota */
    }
    return seen;
}

function maybeUnlockAvidReaderTrophy(seen) {
    if (seen.size >= alternateHistoryArticles.length) {
        globalThis.unlockTrophy?.('avid_reader');
    }
}

const settings = {
    cx: 50,
    cy: 50,
    r: 42,
    checks: 12,
    tiltX: 0,
    speed: 0.75,
    strokeWidth: 1.5,
    fillDark: '#e6e6e6',
    chromaAmount: 0,
    chromaFalloff: 0.2,
    chromaAngle: 0,
    chromaOpacity: 0,
    chromaVariable: true,
    bgSpeed: 0.5,
    bgPhase: 243,
    reflectStrength: 0.5,
    specularStrength: 0,
    trailLength: 0,
    trailOpacity: 0.42,
    trailFade: 0.78,
    trailStep: 0.035,
    scleraR: 12.3,
    pupilR: 9.1,
    eyeY: 50,
    eyeSpread: 13.5,
    eyeStroke: 2,
    reach: 36,
    ease: 0.2,
};

let initPromise = null;

export function initMrDisco() {
    if (!initPromise) initPromise = setup();
    return initPromise;
}

    initDashboard();

async function setup() {
    const host = document.getElementById('disco-host');
    if (!host) return;

    alternateHistoryArticles = await loadAlternateHistoryArticles();
    validArticleIds = new Set(alternateHistoryArticles.map((article) => article.id));

    const svgText = await fetch('assets/icons/disco-ball.svg').then((r) => r.text());
    host.innerHTML = svgText;

    const svg = host.querySelector('svg');
    if (svg) {
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Disco ball with tracking eyes');
    }

    const spin = initDiscoBallSpin(host, { bgPhase: settings.bgPhase });
    const eyes = initDiscoBallEyes(host, { reach: settings.reach, ease: settings.ease });

    spin.setConfig({
        cx: settings.cx,
        cy: settings.cy,
        r: settings.r,
        checks: settings.checks,
        tiltX: settings.tiltX,
        speed: settings.speed,
        strokeWidth: settings.strokeWidth,
        fillDark: settings.fillDark,
        chromaAmount: settings.chromaAmount,
        chromaFalloff: settings.chromaFalloff,
        chromaAngle: settings.chromaAngle,
        chromaOpacity: settings.chromaOpacity,
        chromaVariable: settings.chromaVariable,
        bgSpeed: settings.bgSpeed,
        reflectStrength: settings.reflectStrength,
        specularStrength: settings.specularStrength,
        trailLength: settings.trailLength,
        trailOpacity: settings.trailOpacity,
        trailFade: settings.trailFade,
        trailStep: settings.trailStep,
    });
    spin.setBgPhase(settings.bgPhase);
    spin.setPaused(false);
    eyes.setLayout({
        scleraR: settings.scleraR,
        pupilR: settings.pupilR,
        eyeY: settings.eyeY,
        eyeLeftX: 50 - settings.eyeSpread,
        eyeRightX: 50 + settings.eyeSpread,
        strokeWidth: settings.eyeStroke,
    });
    eyes.setReach(settings.reach);
    eyes.setEase(settings.ease);

    const resultEl = document.getElementById('alt-history-result');
    const form = document.getElementById('alt-history-form');
    const queryInput = document.getElementById('alt-history-query');

    let lastAltHistoryIds = [];
    let searchLoadToken = 0;

    function revertEyesToTrack() {
        eyes.trackCursor();
    }

    function isArchiveOpen() {
        return Boolean(resultEl?.classList.contains('is-open'));
    }

    function finishArchiveClose() {
        if (!resultEl || isArchiveOpen()) return;
        resultEl.hidden = true;
        resultEl.innerHTML = '';
    }

    function closeArchiveDrawer() {
        if (!resultEl || !isArchiveOpen()) return;
        searchLoadToken += 1;
        resultEl.classList.remove('is-open');
        revertEyesToTrack();

        let finished = false;
        const finish = () => {
            if (finished || isArchiveOpen()) return;
            finished = true;
            resultEl.removeEventListener('transitionend', onTransitionEnd);
            finishArchiveClose();
        };
        const onTransitionEnd = (event) => {
            if (event.target !== resultEl) return;
            if (event.propertyName !== 'max-width' && event.propertyName !== 'max-height') return;
            finish();
        };

        resultEl.addEventListener('transitionend', onTransitionEnd);
        window.setTimeout(finish, 500);
    }

    function openArchiveDrawer({ onComplete, keepOpen = false } = {}) {
        if (!resultEl) return;
        resultEl.hidden = false;

        if (keepOpen && resultEl.classList.contains('is-open')) {
            onComplete?.();
            return;
        }

        resultEl.classList.remove('is-open');
        void resultEl.offsetWidth;

        if (!onComplete) {
            resultEl.classList.add('is-open');
            return;
        }

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            resultEl.removeEventListener('transitionend', onTransitionEnd);
            onComplete();
        };
        const onTransitionEnd = (event) => {
            if (event.target !== resultEl || event.propertyName !== 'max-width') return;
            finish();
        };

        resultEl.addEventListener('transitionend', onTransitionEnd);
        resultEl.classList.add('is-open');
        window.setTimeout(finish, 480);
    }

    function renderArticles({ articles, matchedBySearch, matchCount }, query = '', { onDrawerComplete } = {}) {
        if (!resultEl || !articles?.length) return;

        lastAltHistoryIds = articles.map((article) => article.id);
        maybeUnlockAvidReaderTrophy(markAlternateHistorySeen(lastAltHistoryIds));
        const note = matchedBySearch
            ? `${matchCount} timeline${matchCount === 1 ? '' : 's'} matched · showing ${articles.length}.`
            : query.trim()
                ? `No matches — ${articles.length} random divergences instead.`
                : `${articles.length} random divergences retrieved from the archive.`;

        const entries = articles.map((article) => `
            <article class="alt-history-entry">
                <p class="alt-history-meta">${article.year}</p>
                <h3>${article.title}</h3>
                <p class="alt-history-excerpt">${article.excerpt}</p>
                <p class="alt-history-tags">${article.tags.map((tag) => `#${tag}`).join(' ')}</p>
            </article>
        `).join('');

        resultEl.innerHTML = `
            <div class="alt-history-entries">${entries}</div>
            <p class="alt-history-note">${note}</p>
        `;
        const keepOpen = isArchiveOpen();
        if (keepOpen) resultEl.scrollTop = 0;
        openArchiveDrawer({ onComplete: onDrawerComplete, keepOpen });
    }

    async function showAlternateHistory(query = '', { randomOnly = false, googlyLeadIn = false } = {}) {
        const loadToken = googlyLeadIn ? ++searchLoadToken : searchLoadToken;

        if (googlyLeadIn) {
            eyes.playSilly('googly');
            await new Promise((resolve) => window.setTimeout(resolve, 360));
            if (loadToken !== searchLoadToken) return;
        }

        const resolved = resolveAlternateHistoryArticles(alternateHistoryArticles, {
            query: randomOnly ? '' : query,
            excludeIds: lastAltHistoryIds,
            count: 3,
        });

        renderArticles(resolved, query, {
            onDrawerComplete: googlyLeadIn
                ? () => {
                    if (loadToken !== searchLoadToken) return;
                    revertEyesToTrack();
                }
                : undefined,
        });
    }

    function activateEyeMode(mode) {
        if (!mode) return;
        if (mode === 'track') {
            eyes.trackCursor();
        } else {
            eyes.playSilly(mode);
        }
        if (mode === 'googly') {
            showAlternateHistory('', { randomOnly: true });
        }
    }

    const EYE_KEY_MODES = {
        0: 'sleepy',
        1: 'track',
        2: 'cross',
        3: 'spin',
        4: 'shifty',
        5: 'dizzy',
        6: 'heaven',
        7: 'googly',
        8: 'crossSign',
        9: 'sideEye'
    };

    function isMrDiscoModalOpen() {
        const modal = document.getElementById('modal-projects');
        return Boolean(modal && modal.style.display === 'block');
    }

    function shouldIgnoreEyeHotkey(event) {
        const target = event.target;
        if (!(target instanceof Element)) return false;
        if (target.closest('[contenteditable="true"]')) return true;
        return Boolean(target.closest('input, textarea, select'));
    }

    function isSpaceKey(event) {
        return event.key === ' ' || event.code === 'Space';
    }

    function isRKey(event) {
        return event.key === 'r' || event.key === 'R';
    }

    function shouldIgnoreArchiveHotkey(event) {
        const target = event.target;
        if (!(target instanceof Element)) return false;
        if (target.id === 'alt-history-query') return true;
        if (target.closest('[contenteditable="true"]')) return true;
        return Boolean(target.closest('input, textarea, select'));
    }

    function shouldIgnoreSpaceHotkey(event) {
        const target = event.target;
        if (!(target instanceof Element)) return false;
        if (target.id === 'alt-history-query') return true;
        if (target.closest('[contenteditable="true"]')) return true;

        const field = target.closest('input, textarea, select, button');
        if (!field) return false;

        if (field instanceof HTMLInputElement) {
            const type = (field.type || 'text').toLowerCase();
            return type !== 'submit' && type !== 'reset';
        }

        return true;
    }

    function requestRandomArchive() {
        showAlternateHistory('', {
            randomOnly: true,
            googlyLeadIn: !isArchiveOpen(),
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
        if (!isMrDiscoModalOpen()) return;

        if (isRKey(event) && !shouldIgnoreArchiveHotkey(event)) {
            event.preventDefault();
            event.stopPropagation();
            requestRandomArchive();
            return;
        }

        if (isSpaceKey(event) && !shouldIgnoreSpaceHotkey(event)) {
            event.preventDefault();
            event.stopPropagation();
            requestRandomArchive();
            return;
        }

        if (shouldIgnoreEyeHotkey(event)) return;

        if (event.key === '0') {
            event.preventDefault();
            event.stopPropagation();
            const stats = document.getElementById('mr-disco-stats-shell');
            if (stats) {
                stats.hidden = !stats.hidden;
                activateEyeMode(stats.hidden ? 'track' : 'sleepy');
            } else {
                activateEyeMode('sleepy');
            }
            return;
        }

        const mode = EYE_KEY_MODES[event.key];
        if (!mode) return;
        event.preventDefault();
        event.stopPropagation();
        activateEyeMode(mode);
    }, true);

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        showAlternateHistory(queryInput?.value ?? '', { googlyLeadIn: true });
    });

    const stage = host.closest('.mr-disco-stage');
    stage?.addEventListener('click', (event) => {
        if (!document.body.classList.contains('ios-ui')) return;
        if (event.target.closest('input, button, a')) return;
        event.preventDefault();
        requestRandomArchive();
    });
    stage?.addEventListener('keydown', (event) => {
        if (!document.body.classList.contains('ios-ui')) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        requestRandomArchive();
    });
}
