import { panopticonEl } from './shared.js';
import {
    dismissActivationHint,
    getActivationHintOwner,
    revealActivationHint,
    updateActivationHintHtml,
} from './pong.js';

const KONAMI_CODE = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a',
];

const KONAMI_LABELS = ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A'];
const ACTIVATE_WINDOW_MS = 4500;

let konamiIndex = 0;
let armTimeout = null;

function normalizeKey(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        return e.key;
    }
    if (e.key.length === 1) return e.key.toLowerCase();
    return e.key;
}

function isTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    return Boolean(el.closest?.('#term-input, [contenteditable="true"]'));
}

function canEnterKonami(isPongActive) {
    if (isPongActive()) return false;
    if (!document.body.classList.contains('garden-ready')) return false;
    if (!panopticonEl?.classList.contains('visible')) return false;
    if (document.getElementById('lightbox')?.classList.contains('active')) return false;
    const vault = document.getElementById('modal-vault');
    if (vault && getComputedStyle(vault).display !== 'none') return false;
    return true;
}

function buildKonamiHintHtml(confirmed = konamiIndex) {
    return KONAMI_LABELS.map((label, i) => {
        const cls = i < confirmed ? 'pong-hint-arrow is-confirmed' : 'pong-hint-arrow';
        return `<span class="${cls}">${label}</span>`;
    }).join(' ');
}

function updateKonamiHint(confirmed = konamiIndex) {
    if (getActivationHintOwner() !== 'konami') return;
    revealActivationHint('konami', buildKonamiHintHtml(confirmed));
}

function resetKonamiState() {
    konamiIndex = 0;
    clearTimeout(armTimeout);
    armTimeout = null;
}

function cancelKonamiArming() {
    resetKonamiState();
    if (getActivationHintOwner() === 'konami') dismissActivationHint('konami', true);
}

function fadeKonamiHint() {
    if (getActivationHintOwner() !== 'konami') return;
    resetKonamiState();
    dismissActivationHint('konami', true);
}

function showKonamiHint() {
    if (!panopticonEl?.classList.contains('visible')) return;
    revealActivationHint('konami', buildKonamiHintHtml(konamiIndex));
}

function resetKonamiTimeout() {
    clearTimeout(armTimeout);
    armTimeout = setTimeout(fadeKonamiHint, ACTIVATE_WINDOW_MS);
}

function handleKonamiKey(e, isPongActive) {
    if (!canEnterKonami(isPongActive)) return false;
    if (isTypingTarget(document.activeElement)) return false;

    const key = normalizeKey(e);
    const expected = KONAMI_CODE[konamiIndex];

    if (key === expected) {
        if (getActivationHintOwner() !== 'konami') showKonamiHint();

        konamiIndex += 1;
        updateActivationHintHtml('konami', buildKonamiHintHtml(konamiIndex));

        if (konamiIndex >= KONAMI_CODE.length) {
            clearTimeout(armTimeout);
            armTimeout = null;
            konamiIndex = 0;
            dismissActivationHint('konami', true);
            return 'complete';
        }

        resetKonamiTimeout();
        return true;
    }

    if (key === KONAMI_CODE[0]) {
        if (getActivationHintOwner() !== 'konami') showKonamiHint();
        else updateActivationHintHtml('konami', buildKonamiHintHtml(1));
        konamiIndex = 1;
        resetKonamiTimeout();
        return true;
    }

    if (konamiIndex > 0 || getActivationHintOwner() === 'konami') {
        cancelKonamiArming();
    }

    return false;
}

export function resetKonamiSequence() {
    resetKonamiState();
}

export function cancelKonamiArmingSequence() {
    cancelKonamiArming();
}

export function isKonamiInProgress() {
    return konamiIndex > 0 || getActivationHintOwner() === 'konami';
}

export function konamiClaimsKey(e, isPongActive) {
    if (isPongActive()) return false;
    if (isKonamiInProgress()) return true;
    return normalizeKey(e) === KONAMI_CODE[0];
}

export function initKonami({ isPongActive, onComplete }) {
    window.addEventListener('keydown', (e) => {
        if (e.repeat) return;

        const key = normalizeKey(e);
        const inKonami = isKonamiInProgress();
        const startingKonami = key === KONAMI_CODE[0];

        if (!inKonami && !startingKonami) return;

        const result = handleKonamiKey(e, isPongActive);
        if (result === 'complete') {
            e.preventDefault();
            e.stopPropagation();
            onComplete();
            return;
        }
        if (inKonami || startingKonami) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    window.addEventListener('resize', () => {
        if (getActivationHintOwner() === 'konami') {
            updateActivationHintHtml('konami', buildKonamiHintHtml(konamiIndex));
        }
    });
}
