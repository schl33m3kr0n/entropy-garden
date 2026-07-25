/** Locked vault item — click-through CPU dialogue before revealing the asset. */

import { sfx, playSound } from '../core/shared.js';
import { isCorrupted } from '../core/state.js';

const IMAGE_SRC = new URL('../../assets/img/vault/weirdpic.jpg', import.meta.url).href;
const IMAGE_ALT = 'Classified vault transmission';
const MIDDLE_FINGER_SRC = new URL('../../assets/img/terminal-insult.png', import.meta.url).href;
const MIDDLE_FINGER_TEXT = '[middle finger]';
const MIDDLE_FINGER_TRIPLE_TEXT = '[middle finger] x3';
const TRIPLE_GESTURE_DELAYS_MS = [0, 500, 2500];
const LIGHTBOX_PARTING_DELAY_MS = 2000;
const GESTURE_POP_MS = 280;

const middleFingerPreload = new Image();
middleFingerPreload.src = MIDDLE_FINGER_SRC;

const DIALOGUE = [
    { speaker: 'cpu', text: 'enter the code' },
    { speaker: 'user', text: 'what code?' },
    { speaker: 'cpu', text: 'you need to enter the code' },
    { speaker: 'user', text: 'tf are u talking about?' },
    { speaker: 'cpu', text: MIDDLE_FINGER_TEXT },
    { speaker: 'user', text: MIDDLE_FINGER_TEXT },
    { speaker: 'cpu', text: MIDDLE_FINGER_TRIPLE_TEXT },
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
/** @type {number[]} */
let dialogueTimers = [];
/** @type {number | null} */
let lightboxPartingTimer = null;
/** @type {HTMLElement[]} */
let lockedItems = [];
let lightboxCleanupBound = false;
let dialoguePreviewMode = false;

function isVaultLockedAccessible() {
    return isCorrupted || document.body.classList.contains('corrupted');
}

function speakerLabel(speaker) {
    return speaker === 'cpu' ? 'CPU' : 'YOU';
}

function isMiddleFingerText(text) {
    return text === MIDDLE_FINGER_TEXT;
}

function isMiddleFingerTripleText(text) {
    return text === MIDDLE_FINGER_TRIPLE_TEXT;
}

function clearDialogueTimers() {
    dialogueTimers.forEach((id) => window.clearTimeout(id));
    dialogueTimers = [];
}

function clearLightboxPartingTimer() {
    if (lightboxPartingTimer != null) {
        window.clearTimeout(lightboxPartingTimer);
        lightboxPartingTimer = null;
    }
}

function scheduleDialogueTimer(fn, delayMs) {
    const id = window.setTimeout(fn, delayMs);
    dialogueTimers.push(id);
    return id;
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
            <div class="vault-dialogue-log" id="vault-dialogue-log" aria-live="polite"></div>
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

function createMiddleFingerIcon() {
    const img = document.createElement('img');
    img.src = MIDDLE_FINGER_SRC;
    img.alt = '';
    img.className = 'vault-dialogue-gesture';
    img.setAttribute('aria-hidden', 'true');
    img.width = 36;
    img.height = 36;
    img.decoding = 'async';
    return img;
}

function playGesturePop(icon) {
    icon.getAnimations().forEach((animation) => animation.cancel());
    icon.style.opacity = '';
    return icon.animate(
        [
            { opacity: 0, transform: 'scale(0.55) rotate(-8deg)' },
            { opacity: 1, transform: 'scale(1) rotate(0deg)' },
        ],
        { duration: GESTURE_POP_MS, easing: 'ease', fill: 'forwards' },
    );
}

function appendAnimatedMiddleFinger(gestures) {
    const icon = createMiddleFingerIcon();
    icon.style.opacity = '0';
    gestures.appendChild(icon);

    const start = () => {
        requestAnimationFrame(() => {
            playGesturePop(icon);
        });
    };

    if (icon.complete && icon.naturalWidth > 0) {
        start();
    } else {
        icon.addEventListener('load', start, { once: true });
        icon.addEventListener('error', () => {
            console.error('[vault] middle finger asset failed to load:', icon.src);
        }, { once: true });
    }

    return icon;
}

function appendLineBody(line, text) {
    if (isMiddleFingerText(text)) {
        const gestures = document.createElement('span');
        gestures.className = 'vault-dialogue-gestures';
        appendAnimatedMiddleFinger(gestures);
        line.appendChild(gestures);
        return;
    }

    line.appendChild(document.createTextNode(text));
}

function renderLine(entry) {
    if (!logEl) return;

    logEl.innerHTML = '';
    const line = document.createElement('p');
    line.className = `vault-dialogue-line vault-dialogue-line--${entry.speaker}`;

    const speaker = document.createElement('span');
    speaker.className = 'vault-dialogue-speaker';
    speaker.textContent = `${speakerLabel(entry.speaker)}:`;
    line.appendChild(speaker);
    line.appendChild(document.createTextNode(' '));
    appendLineBody(line, entry.text);

    logEl.appendChild(line);
}

function renderTripleMiddleFingerLine(entry) {
    if (!logEl) return null;

    logEl.innerHTML = '';
    const line = document.createElement('p');
    line.className = `vault-dialogue-line vault-dialogue-line--${entry.speaker}`;

    const speaker = document.createElement('span');
    speaker.className = 'vault-dialogue-speaker';
    speaker.textContent = `${speakerLabel(entry.speaker)}:`;
    line.appendChild(speaker);
    line.appendChild(document.createTextNode(' '));

    const gestures = document.createElement('span');
    gestures.className = 'vault-dialogue-gestures vault-dialogue-gestures--triple';
    line.appendChild(gestures);
    logEl.appendChild(line);

    return gestures;
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
    if (isMiddleFingerText(entry.text)) {
        btn.classList.add('vault-dialogue-choice--gesture');
        btn.setAttribute('aria-label', 'middle finger');
        btn.appendChild(createMiddleFingerIcon());
    } else {
        btn.textContent = entry.text;
    }
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
    btn.textContent = 'whatever bro';
    btn.addEventListener('click', (event) => {
        event.stopPropagation();
        finishDialogue();
    });
    actionsEl.appendChild(btn);
    actionsEl.hidden = false;
    btn.focus({ preventScroll: true });
}

function showLightboxPartingMiddleFinger(lightboxOverlay) {
    if (!lightboxOverlay?.classList.contains('active')) return;
    if (lightboxOverlay.querySelector('.vault-lightbox-parting-gesture')) return;

    const flash = document.createElement('div');
    flash.className = 'vault-lightbox-parting-gesture';
    const icon = appendAnimatedMiddleFinger(flash);
    icon.classList.add('vault-lightbox-parting-gesture-icon');
    lightboxOverlay.appendChild(flash);
    playSound(sfx.click2);

    window.setTimeout(() => {
        flash.remove();
    }, 1400);
}

function openVaultImageLightbox() {
    const lightboxOverlay = document.getElementById('lightbox-overlay');
    if (!lightboxOverlay) return;

    clearLightboxPartingTimer();
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

    lightboxPartingTimer = window.setTimeout(() => {
        lightboxPartingTimer = null;
        showLightboxPartingMiddleFinger(lightboxOverlay);
    }, LIGHTBOX_PARTING_DELAY_MS);
}

function closeDialogue() {
    clearDialogueTimers();
    clearLightboxPartingTimer();
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
    if (dialoguePreviewMode) {
        dialoguePreviewMode = false;
        return;
    }
    openVaultImageLightbox();
}

function continueAfterCpuLine() {
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
}

function presentCpuLine(entry) {
    advanceBusy = true;
    renderLine(entry);
    stepIndex += 1;
    playSound(sfx.click2);

    scheduleDialogueTimer(() => {
        advanceBusy = false;
        continueAfterCpuLine();
    }, 280);
}

function presentTripleMiddleFinger(entry) {
    advanceBusy = true;
    const gestures = renderTripleMiddleFingerLine(entry);
    if (!gestures) {
        advanceBusy = false;
        return;
    }

    TRIPLE_GESTURE_DELAYS_MS.forEach((delayMs, index) => {
        const appendFinger = () => {
            appendAnimatedMiddleFinger(gestures);
            playSound(sfx.click2);

            if (index === TRIPLE_GESTURE_DELAYS_MS.length - 1) {
                stepIndex += 1;
                scheduleDialogueTimer(() => {
                    advanceBusy = false;
                    continueAfterCpuLine();
                }, 320);
            }
        };

        if (delayMs === 0) appendFinger();
        else scheduleDialogueTimer(appendFinger, delayMs);
    });
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

    if (isMiddleFingerTripleText(entry.text)) {
        presentTripleMiddleFinger(entry);
        return;
    }

    presentCpuLine(entry);
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

    scheduleDialogueTimer(() => {
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

function openDialogue(fromStep = 0) {
    ensureOverlay();
    clearDialogueTimers();
    stepIndex = fromStep;
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

export function previewVaultDialogue(options = {}) {
    dialoguePreviewMode = true;
    document.body.classList.add('corrupted');
    const fromStep = typeof options.fromStep === 'number' ? options.fromStep : 0;
    openDialogue(fromStep);
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
    bindLightboxCloseCleanup();
    syncVaultLockedAccess();
}

function bindLightboxCloseCleanup() {
    if (lightboxCleanupBound) return;
    lightboxCleanupBound = true;

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const lightboxOverlay = document.getElementById('lightbox-overlay');
        if (!lightboxOverlay?.classList.contains('active')) return;
        if (target === lightboxOverlay || target.closest('.lightbox-close')) {
            clearLightboxPartingTimer();
        }
    });
}
