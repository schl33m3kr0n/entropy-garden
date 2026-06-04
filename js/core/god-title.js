import { perf } from './shared.js';

const SOURCE = 'ENTROPY GARDEN';
const TARGET = 'PONDERY ARGENT';

/** target slot → source letter index (valid anagram permutation) */
const TO_PONDERY = [5, 4, 1, 11, 0, 3, 6, 7, 9, 10, 8, 12, 13, 2];

const TO_ENTROPY = Array(SOURCE.length);
TO_PONDERY.forEach((sourceIdx, slot) => {
    TO_ENTROPY[sourceIdx] = slot;
});

let titleAnimating = false;

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

function orderedForPermutation(letters, slotToSourceIndex) {
    return slotToSourceIndex.map((sourceIdx) => letters[sourceIdx]);
}

function lockTitleWidth(h1, chrome) {
    const rect = chrome.getBoundingClientRect();
    h1.style.minWidth = `${Math.ceil(rect.width)}px`;
}

function clearTitleWidth(h1) {
    h1.style.removeProperty('min-width');
}

function flipReorder(chrome, ordered, durationMs = 720) {
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
                chrome.classList.add('god-title-shuffling');
                ordered.forEach((el) => {
                    el.style.transition = `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
                    el.style.transform = '';
                });

                const done = () => {
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

function applyPermutation(chrome, slotToSourceIndex) {
    const letters = lettersInSourceOrder(chrome);
    orderedForPermutation(letters, slotToSourceIndex).forEach((el) => chrome.appendChild(el));
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
    const map = pondery ? TO_PONDERY : TO_ENTROPY;

    h1.setAttribute('aria-label', pondery ? TARGET : SOURCE);

    if (!animate || perf.prefersReducedMotion || titleAnimating) {
        applyPermutation(chrome, map);
        clearTitleWidth(h1);
        return Promise.resolve();
    }

    titleAnimating = true;
    lockTitleWidth(h1, chrome);

    const ordered = orderedForPermutation(letters, map);
    return flipReorder(chrome, ordered).finally(() => {
        titleAnimating = false;
        clearTitleWidth(h1);
    });
}

export function prepareGodTitle(h1) {
    if (h1) ensureChrome(h1);
}
