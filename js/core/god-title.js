import { perf } from './shared.js';

const SOURCE = 'ENTROPY GARDEN';
const TARGET = 'PONDERY ARGENT';

/** Matches chrome.css h1 rainbow (200% wide, --rainbow-offset). */
const HUD_TITLE_GRADIENT = 'linear-gradient(90deg, '
    + 'hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), '
    + 'hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(0, 100%, 50%)'
    + ')';

/** Visual slot left→right → source letter index (anagram: same letters as ENTROPY GARDEN). */
const TO_PONDERY = [5, 4, 1, 11, 0, 3, 6, 7, 9, 10, 8, 12, 13, 2];

let titleAnimating = false;
let titleAnimToken = 0;

function getHudTitleEl() {
    return document.querySelector('#hud h1');
}

/** Align each letter onto one shared HUD gradient (chrome.css h1 math). */
export function syncGodTitleGradient(h1 = getHudTitleEl()) {
    if (!h1?.classList.contains('god-title-live')) return;

    const chrome = h1.querySelector('.god-title-chrome');
    if (!chrome) return;

    const letters = chrome.querySelectorAll('.god-title-letter');
    if (!letters.length) return;

    if (document.body.classList.contains('corrupted')) {
        letters.forEach((el) => {
            el.style.removeProperty('background-size');
            el.style.removeProperty('background-position');
            el.style.removeProperty('background-image');
        });
        return;
    }

    const h1Rect = h1.getBoundingClientRect();
    const titleW = h1Rect.width;
    if (titleW <= 0) return;

    const offsetPct = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--rainbow-offset'),
    ) || 0;

    const bgW = titleW * 2;
    const shiftPx = (offsetPct / 100) * (bgW - titleW);

    letters.forEach((el) => {
        const letterLeft = el.getBoundingClientRect().left - h1Rect.left;
        el.style.backgroundImage = HUD_TITLE_GRADIENT;
        el.style.backgroundRepeat = 'no-repeat';
        el.style.backgroundSize = `${bgW}px 100%`;
        el.style.backgroundPosition = `${shiftPx - letterLeft}px 50%`;
        el.style.webkitBackgroundClip = 'text';
        el.style.backgroundClip = 'text';
        el.style.webkitTextFillColor = 'transparent';
        el.style.color = 'transparent';
    });
}

function clearLetterStyles(chrome) {
    chrome.classList.remove('god-title-shuffling');
    chrome.querySelectorAll('.god-title-letter').forEach((el) => {
        el.style.transition = '';
        el.style.transform = '';
        el.style.removeProperty('color');
        el.style.removeProperty('background');
        el.style.removeProperty('background-image');
        el.style.removeProperty('background-size');
        el.style.removeProperty('background-position');
        el.style.removeProperty('background-repeat');
        el.style.removeProperty('-webkit-background-clip');
        el.style.removeProperty('background-clip');
        el.style.removeProperty('-webkit-text-fill-color');
        el.style.removeProperty('text-shadow');
    });
}

function restoreTitlePresentation(h1, pondery) {
    if (!h1) return;
    h1.classList.toggle('god-title-pondery', pondery);
}

function restoreSourceLetters(chrome) {
    chrome.querySelectorAll('.god-title-letter').forEach((el) => {
        const i = Number(el.dataset.sourceIndex);
        if (!Number.isFinite(i) || i < 0 || i >= SOURCE.length) return;
        const ch = SOURCE[i];
        el.textContent = ch === ' ' ? '\u00a0' : ch;
    });
}

function cancelTitleAnimation(chrome) {
    titleAnimToken += 1;
    titleAnimating = false;
    clearLetterStyles(chrome);
}

function ensureChrome(h1) {
    let chrome = h1.querySelector('.god-title-chrome');
    if (chrome) return chrome;

    chrome = document.createElement('span');
    chrome.className = 'god-title-chrome';
    chrome.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < SOURCE.length; i++) {
        const ch = SOURCE[i];
        const span = document.createElement('span');
        span.className = `god-title-letter${ch === ' ' ? ' is-space' : ''}`;
        span.textContent = ch === ' ' ? '\u00a0' : ch;
        span.dataset.sourceIndex = String(i);
        chrome.appendChild(span);
    }

    h1.textContent = '';
    h1.appendChild(chrome);
    h1.classList.add('god-title-live');
    return chrome;
}

function lettersInSourceOrder(chrome) {
    return [...chrome.querySelectorAll('.god-title-letter')].sort(
        (a, b) => Number(a.dataset.sourceIndex) - Number(b.dataset.sourceIndex),
    );
}

/** Left-to-right DOM order for the target phrase. */
function orderedForArrangement(letters, pondery) {
    if (!pondery) return letters;
    return TO_PONDERY.map((sourceIdx) => letters[sourceIdx]);
}

function measureArrangementWidth(chrome, letters, pondery) {
    const currentOrder = [...chrome.querySelectorAll('.god-title-letter')];
    orderedForArrangement(letters, pondery).forEach((el) => chrome.appendChild(el));
    const width = chrome.getBoundingClientRect().width;
    currentOrder.forEach((el) => chrome.appendChild(el));
    return width;
}

function lockTitleWidth(h1, chrome, letters) {
    const width = Math.ceil(Math.max(
        measureArrangementWidth(chrome, letters, true),
        measureArrangementWidth(chrome, letters, false),
    ));
    if (width > 0) {
        h1.style.minWidth = `${width}px`;
    } else {
        h1.style.removeProperty('min-width');
    }
}

function restorePlainTitle(h1) {
    if (!h1) return;
    h1.textContent = SOURCE;
    h1.classList.remove('god-title-live', 'god-title-pondery');
    h1.style.removeProperty('min-width');
    h1.setAttribute('aria-label', SOURCE);
}

function shouldAnimateTitle(animate) {
    return animate && !perf.prefersReducedMotion && !perf.isIOS;
}

function flipReorder(h1, chrome, ordered, token, durationMs = 720) {
    const first = new Map(ordered.map((el) => [el, el.getBoundingClientRect()]));

    ordered.forEach((el) => chrome.appendChild(el));

    ordered.forEach((el) => {
        const a = first.get(el);
        const b = el.getBoundingClientRect();
        el.style.transition = 'none';
        el.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px)`;
    });

    syncGodTitleGradient(h1);

    return new Promise((resolve) => {
        const shuffleUntil = performance.now() + durationMs + 100;
        const syncWhileShuffling = () => {
            if (token !== titleAnimToken) return;
            syncGodTitleGradient(h1);
            if (performance.now() < shuffleUntil) {
                requestAnimationFrame(syncWhileShuffling);
            }
        };
        requestAnimationFrame(syncWhileShuffling);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (token !== titleAnimToken) {
                    clearLetterStyles(chrome);
                    resolve();
                    return;
                }

                chrome.classList.add('god-title-shuffling');
                ordered.forEach((el) => {
                    el.style.transition = `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
                    el.style.transform = '';
                });

                const done = () => {
                    if (token !== titleAnimToken) {
                        resolve();
                        return;
                    }
                    chrome.classList.remove('god-title-shuffling');
                    ordered.forEach((el) => {
                        el.style.transition = '';
                        el.style.transform = '';
                    });
                    syncGodTitleGradient(h1);
                    resolve();
                };

                const last = ordered[ordered.length - 1];
                if (last) {
                    last.addEventListener('transitionend', (e) => {
                        if (e.propertyName === 'transform') done();
                    }, { once: true });
                    setTimeout(done, durationMs + 80);
                } else {
                    done();
                }
            });
        });
    });
}

function applyArrangement(chrome, pondery) {
    clearLetterStyles(chrome);
    const letters = lettersInSourceOrder(chrome);
    orderedForArrangement(letters, pondery).forEach((el) => chrome.appendChild(el));
    if (!pondery) restoreSourceLetters(chrome);
}

/**
 * @param {HTMLHeadingElement | null} h1
 * @param {boolean} pondery
 * @param {{ animate?: boolean }} [options]
 */
export function setGodTitleArrangement(h1, pondery, { animate = true } = {}) {
    if (!h1) return Promise.resolve();

    const existingChrome = h1.querySelector('.god-title-chrome');
    if (!pondery && !existingChrome) {
        restorePlainTitle(h1);
        return Promise.resolve();
    }

    // iOS WebKit often paints parent background-clip:text as invisible — restore plain h1 on exit.
    if (!pondery && perf.isIOS && existingChrome) {
        if (titleAnimating) cancelTitleAnimation(existingChrome);
        restorePlainTitle(h1);
        return Promise.resolve();
    }

    const chrome = ensureChrome(h1);
    const letters = lettersInSourceOrder(chrome);

    h1.setAttribute('aria-label', pondery ? TARGET : SOURCE);
    if (pondery) restoreTitlePresentation(h1, true);

    if (titleAnimating) cancelTitleAnimation(chrome);

    if (!pondery) restoreSourceLetters(chrome);

    const finish = () => {
        if (!pondery) restoreTitlePresentation(h1, false);
    };

    if (!shouldAnimateTitle(animate)) {
        applyArrangement(chrome, pondery);
        lockTitleWidth(h1, chrome, letters);
        syncGodTitleGradient(h1);
        finish();
        return Promise.resolve();
    }

    const token = titleAnimToken;
    titleAnimating = true;
    lockTitleWidth(h1, chrome, letters);

    const ordered = orderedForArrangement(letters, pondery);
    return flipReorder(h1, chrome, ordered, token).finally(() => {
        if (token !== titleAnimToken) return;
        titleAnimating = false;
        syncGodTitleGradient(h1);
        finish();
    });
}

export function prepareGodTitle(h1) {
    if (h1) ensureChrome(h1);
}
