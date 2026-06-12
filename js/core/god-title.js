import { perf } from './shared.js';

const SOURCE = 'ENTROPY GARDEN';
const TARGET = 'PONDERY ARGENT';

/** Visual slot left→right → source letter index (anagram: same letters as ENTROPY GARDEN). */
const TO_PONDERY = [5, 4, 1, 11, 0, 3, 6, 7, 9, 10, 8, 12, 13, 2];

let titleAnimating = false;
let titleAnimToken = 0;

function cancelTitleAnimation(chrome) {
    titleAnimToken += 1;
    titleAnimating = false;
    chrome.classList.remove('god-title-shuffling');
    chrome.querySelectorAll('.god-title-letter').forEach((el) => {
        el.style.transition = '';
        el.style.transform = '';
    });
}

function ensureChrome(h1) {
    let chrome = h1.querySelector('.god-title-chrome');
    if (chrome) {
        if (!document.body.classList.contains('god-mode')) {
            applyArrangement(chrome, false);
        }
        return chrome;
    }

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

function lockTitleWidth(h1, chrome) {
    const rect = chrome.getBoundingClientRect();
    h1.style.minWidth = `${Math.ceil(rect.width)}px`;
}

function clearTitleWidth(h1) {
    h1.style.removeProperty('min-width');
}

function flipReorder(chrome, ordered, token, durationMs = 720) {
    const first = new Map(ordered.map((el) => [el, el.getBoundingClientRect()]));

    ordered.forEach((el) => chrome.appendChild(el));

    ordered.forEach((el) => {
        const a = first.get(el);
        const b = el.getBoundingClientRect();
        el.style.transition = 'none';
        el.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px)`;
    });

    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (token !== titleAnimToken) {
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
    const letters = lettersInSourceOrder(chrome);
    orderedForArrangement(letters, pondery).forEach((el) => chrome.appendChild(el));
}

/**
 * @param {HTMLHeadingElement | null} h1
 * @param {boolean} pondery
 * @param {{ animate?: boolean }} [options]
 */
export function setGodTitleArrangement(h1, pondery, { animate = true } = {}) {
    if (!h1) return Promise.resolve();

    const chrome = ensureChrome(h1);
    const letters = lettersInSourceOrder(chrome);

    h1.setAttribute('aria-label', pondery ? TARGET : SOURCE);

    if (titleAnimating) cancelTitleAnimation(chrome);

    if (!animate || perf.prefersReducedMotion) {
        applyArrangement(chrome, pondery);
        clearTitleWidth(h1);
        return Promise.resolve();
    }

    const token = titleAnimToken;
    titleAnimating = true;
    lockTitleWidth(h1, chrome);

    const ordered = orderedForArrangement(letters, pondery);
    return flipReorder(chrome, ordered, token).finally(() => {
        if (token === titleAnimToken) titleAnimating = false;
        clearTitleWidth(h1);
    });
}

export function prepareGodTitle(h1) {
    if (h1) ensureChrome(h1);
}
