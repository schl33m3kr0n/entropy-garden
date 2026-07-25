/** Locked vault item — click-through CPU dialogue before revealing the asset. */

import { sfx, playSound } from '../core/shared.js';
import { isCorrupted } from '../core/state.js';

const IMAGE_SRC = 'assets/img/vault/weirdpic.jpg';
const IMAGE_ALT = 'Classified vault transmission';

const DIALOGUE = [
    { speaker: 'cpu', text: 'enter the code' },
    { speaker: 'user', text: 'what code?' },
    { speaker: 'cpu', text: 'you need to enter the code' },
    { speaker: 'user', text: 'tf are u talking about?' },
    { speaker: 'cpu', text: '[middle finger]' },
    { speaker: 'user', text: '[middle finger]' },
    { speaker: 'cpu', text: '[middle finger] x3' },
    { speaker: 'user', text: 'asshole' },
    { speaker: 'cpu', text: 'you are what you eat, so there' },
    { speaker: 'user', text: 'was that a self diss?' },
    { speaker: 'cpu', text: 'no f u' },
    { speaker: 'user', text: "you're bad at this" },
    { speaker: 'cpu', text: 'shut up' },
    { speaker: 'user', text: 'just show me the gd picture' },
    { speaker: 'cpu', text: "fine, but you didn't deserve it tho" },
];

let overlayEl = null;
let logEl = null;
let actionsEl = null;
let hintEl = null;
let stepIndex = 0;
let advanceBusy = false;
let bound = false;
/** @type {HTMLElement[]} */
let lockedItems = [];

function isVaultLockedAccessible() {
    return isCorrupted || document.body.classList.contains('corrupted');
}

function speakerLabel(speaker) {
    return speaker === 'cpu' ? 'CPU' : 'YOU';
}

function ensureOverlay() {
    if (overlayEl) return overlayEl;

    overlayEl = document.createElement('div');
    overlayEl.id = 'vault-dialogue-overlay';
    overlayEl.className = 'vault-dialogue-overlay';
    overlayEl.hidden = true;
    overlayEl.innerHTML = `
        <div class="vault-dialogue-panel" role="dialog" aria-modal="true" aria-labelledby="vault-dialogue-title">
            <p id="vault-dialogue-title" class="vault-dialogue-title">// SECURE CHANNEL</p>
            <div class="vault-dialogue-log" id="vault-dialogue-log"></div>
            <div class="vault-dialogue-actions" id="vault-dialogue-actions" hidden></div>
            <p class="vault-dialogue-hint" id="vault-dialogue-hint" hidden></p>
        </div>
    `;
    document.body.appendChild(overlayEl);

    logEl = overlayEl.querySelector('#vault-dialogue-log');
    actionsEl = overlayEl.querySelector('#vault-dialogue-actions');
    hintEl = overlayEl.querySelector('#vault-dialogue-hint');
    overlayEl.addEventListener('keydown', onKeydown);

    return overlayEl;
}

function renderLine(entry) {
    const line = document.createElement('p');
    line.className = `vault-dialogue-line vault-dialogue-line--${entry.speaker}`;
    line.innerHTML = `<span class="vault-dialogue-speaker">${speakerLabel(entry.speaker)}:</span> ${entry.text}`;
    logEl?.appendChild(line);
    line.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function setHint(text) {
    if (!hintEl) return;
    if (text) {
        hintEl.hidden = false;
        hintEl.textContent = text;
        return;
    }
    hintEl.hidden = true;
    hintEl.textContent = '';
}

function clearActions() {
    if (!actionsEl) return;
    actionsEl.hidden = true;
    actionsEl.innerHTML = '';
}

function showUserChoice(entry) {
    if (!actionsEl) return;

    clearActions();
    setHint('pick a response');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vault-dialogue-choice';
    btn.textContent = entry.text;
    btn.addEventListener('click', (event) => {
        event.stopPropagation();
        onUserChoice(entry);
    });
    actionsEl.appendChild(btn);
    actionsEl.hidden = false;
    btn.focus({ preventScroll: true });
}

function showRevealChoice() {
    if (!actionsEl) return;

    clearActions();
    setHint('');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vault-dialogue-choice vault-dialogue-choice--reveal';
    btn.textContent = 'fine, show me the gd picture';
    btn.addEventListener('click', (event) => {
        event.stopPropagation();
        finishDialogue();
    });
    actionsEl.appendChild(btn);
    actionsEl.hidden = false;
    btn.focus({ preventScroll: true });
}

function openVaultImageLightbox() {
    const lightboxOverlay = document.getElementById('lightbox-overlay');
    if (!lightboxOverlay) return;

    playSound(sfx.oneUp);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';

    const img = document.createElement('img');
    img.className = 'lightbox-content vault-media--col-fill';
    img.src = IMAGE_SRC;
    img.alt = IMAGE_ALT;

    lightboxOverlay.innerHTML = '';
    lightboxOverlay.appendChild(closeBtn);
    lightboxOverlay.appendChild(img);
    lightboxOverlay.classList.add('active');
}

function closeDialogue() {
    if (!overlayEl) return;
    overlayEl.hidden = true;
    overlayEl.classList.remove('is-open');
    overlayEl.removeAttribute('tabindex');
    if (logEl) logEl.innerHTML = '';
    clearActions();
    setHint('');
    stepIndex = 0;
    advanceBusy = false;
}

function finishDialogue() {
    closeDialogue();
    openVaultImageLightbox();
}

function presentCpuLine(entry) {
    renderLine(entry);
    stepIndex += 1;
    playSound(sfx.click2);
}

function presentNext() {
    if (advanceBusy || !overlayEl || overlayEl.hidden) return;

    if (stepIndex >= DIALOGUE.length) {
        showRevealChoice();
        return;
    }

    const entry = DIALOGUE[stepIndex];
    if (entry.speaker === 'user') {
        showUserChoice(entry);
        return;
    }

    advanceBusy = true;
    presentCpuLine(entry);

    window.setTimeout(() => {
        advanceBusy = false;
        if (stepIndex >= DIALOGUE.length) {
            setHint('');
            showRevealChoice();
            return;
        }
        if (DIALOGUE[stepIndex]?.speaker === 'user') {
            showUserChoice(DIALOGUE[stepIndex]);
            return;
        }
        presentNext();
    }, 280);
}

function onUserChoice(entry) {
    if (advanceBusy || !overlayEl || overlayEl.hidden) return;
    if (stepIndex >= DIALOGUE.length || DIALOGUE[stepIndex] !== entry) return;

    advanceBusy = true;
    clearActions();
    setHint('');
    renderLine(entry);
    stepIndex += 1;
    playSound(sfx.click);

    window.setTimeout(() => {
        advanceBusy = false;
        presentNext();
    }, 220);
}

function onKeydown(event) {
    if (overlayEl?.hidden) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeDialogue();
        playSound(sfx.exit);
    }
}

function openDialogue() {
    ensureOverlay();
    stepIndex = 0;
    advanceBusy = false;
    if (logEl) logEl.innerHTML = '';
    clearActions();
    setHint('');
    overlayEl.hidden = false;
    overlayEl.classList.add('is-open');
    overlayEl.tabIndex = -1;
    overlayEl.focus({ preventScroll: true });
    playSound(sfx.click);
    presentNext();
}

function onLockedItemClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!isVaultLockedAccessible()) return;
    openDialogue();
}

export function syncVaultLockedAccess() {
    const accessible = isVaultLockedAccessible();
    lockedItems.forEach((item) => {
        item.hidden = !accessible;
        item.setAttribute('aria-hidden', accessible ? 'false' : 'true');
        item.tabIndex = accessible ? 0 : -1;
    });
    if (!accessible) {
        closeDialogue();
    }
}

export function initVaultLockedItems(root = document) {
    if (bound) return;
    bound = true;

    lockedItems = [...root.querySelectorAll('.vault-item--locked[data-vault-locked]')];
    lockedItems.forEach((item) => {
        item.addEventListener('click', onLockedItemClick);
    });
    syncVaultLockedAccess();
}
