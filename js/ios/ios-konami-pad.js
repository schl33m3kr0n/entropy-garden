// iOS Game Boy-style D-pad + A/B for Konami god mode (title pane reveal).

import { panopticonEl, perf } from '../core/shared.js';
import { canEnterKonami } from '../game/konami.js';

const DPAD_SVG = `<svg class="ios-gb-dpad-art" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path class="ios-gb-dpad-seg ios-gb-dpad-seg-up" d="M 28 6 Q 28 3 31 3 L 69 3 Q 72 3 72 6 L 72 36 L 54 44 L 50 46 L 46 44 L 28 36 Z"/>
  <path class="ios-gb-dpad-seg ios-gb-dpad-seg-right" d="M 64 28 L 94 28 Q 97 28 97 31 L 97 69 Q 97 72 94 72 L 64 72 L 56 54 L 54 50 L 56 46 L 64 46 Z"/>
  <path class="ios-gb-dpad-seg ios-gb-dpad-seg-down" d="M 28 64 L 46 56 L 50 54 L 54 56 L 72 64 L 72 94 Q 72 97 69 97 L 31 97 Q 28 97 28 94 Z"/>
  <path class="ios-gb-dpad-seg ios-gb-dpad-seg-left" d="M 6 31 Q 3 31 3 34 L 3 66 Q 3 69 6 69 L 36 69 L 44 54 L 46 50 L 44 46 L 36 46 Z"/>
</svg>`;

const DPAD_KEYS = [
    { dir: 'up', key: 'ArrowUp', label: 'Up' },
    { dir: 'right', key: 'ArrowRight', label: 'Right' },
    { dir: 'down', key: 'ArrowDown', label: 'Down' },
    { dir: 'left', key: 'ArrowLeft', label: 'Left' },
];

let padEl;
let visibilityObserver;
let bound = false;
let pendingHandlers;
let paneRetryObs;

function scrollShell() {
    return document.getElementById('ios-scroll-shell');
}

function titlePane() {
    return document.querySelector('.ios-pane-top');
}

function canShowPad(isPongActive) {
    if (!document.body.classList.contains('ios-ui')) return false;
    if (document.body.classList.contains('ios-pong-playing')) return false;
    if (document.body.classList.contains('singularity-active')) return false;
    return canEnterKonami(isPongActive);
}

function flashControl(el, ok) {
    if (!el) return;
    el.classList.remove('is-ok', 'is-bad');
    el.classList.add(ok ? 'is-ok' : 'is-bad');
    window.setTimeout(() => el.classList.remove('is-ok', 'is-bad'), 140);
}

function bindPress(btn, key, handlers) {
    const { isPongActive, onComplete, konami } = handlers;

    const fire = (e) => {
        if (!canShowPad(isPongActive) || !padEl?.classList.contains('is-visible')) return;
        e.preventDefault();
        e.stopPropagation();

        const result = konami.submitKonamiInput(key, isPongActive, onComplete);
        if (result === 'blocked') return;

        const ok = result === 'complete' || result === 'ok';
        flashControl(btn, ok);

        if (key.startsWith('Arrow')) {
            const seg = padEl.querySelector(`.ios-gb-dpad-seg-${key.replace('Arrow', '').toLowerCase()}`);
            flashControl(seg, ok);
        }
    };

    btn.addEventListener('pointerdown', (e) => {
        btn.setPointerCapture(e.pointerId);
        fire(e);
    }, { passive: false });
    btn.addEventListener('pointerup', () => btn.classList.remove('is-held'));
    btn.addEventListener('pointercancel', () => btn.classList.remove('is-held'));
    btn.addEventListener('pointerdown', () => btn.classList.add('is-held'), { passive: true });
}

function buildPad() {
    if (padEl) return;

    padEl = document.createElement('div');
    padEl.id = 'ios-konami-pad';
    padEl.className = 'ios-konami-pad ios-pong-unselectable';
    padEl.setAttribute('aria-label', 'Konami code input');
    padEl.hidden = true;

    const layout = document.createElement('div');
    layout.className = 'ios-gb-layout';

    const dpad = document.createElement('div');
    dpad.className = 'ios-gb-dpad';
    dpad.innerHTML = DPAD_SVG;

    for (const { dir, key, label } of DPAD_KEYS) {
        const hit = document.createElement('button');
        hit.type = 'button';
        hit.className = `ios-gb-dpad-hit ios-gb-dpad-hit-${dir}`;
        hit.dataset.konami = key;
        hit.setAttribute('aria-label', label);
        dpad.appendChild(hit);
    }

    const actions = document.createElement('div');
    actions.className = 'ios-gb-actions';

    const btnB = document.createElement('button');
    btnB.type = 'button';
    btnB.className = 'ios-gb-btn ios-gb-btn-b';
    btnB.dataset.konami = 'b';
    btnB.setAttribute('aria-label', 'B');
    btnB.innerHTML = '<span class="ios-gb-btn-label">B</span>';

    const btnA = document.createElement('button');
    btnA.type = 'button';
    btnA.className = 'ios-gb-btn ios-gb-btn-a';
    btnA.dataset.konami = 'a';
    btnA.setAttribute('aria-label', 'A');
    btnA.innerHTML = '<span class="ios-gb-btn-label">A</span>';

    actions.append(btnB, btnA);
    layout.append(dpad, actions);
    padEl.appendChild(layout);
    document.body.appendChild(padEl);
}

function syncPadVisibility(revealed, isPongActive) {
    if (!padEl) return;
    const show = revealed && canShowPad(isPongActive);
    padEl.hidden = !show;
    padEl.classList.toggle('is-visible', show);
    padEl.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function bindTitleReveal(isPongActive) {
    const shell = scrollShell();
    const top = titlePane();
    if (!shell || !top || visibilityObserver) return;

    const update = () => {
        const rect = top.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const revealed = rect.bottom > shellRect.top + 48
            && rect.top < shellRect.top + shellRect.height * 0.72;
        syncPadVisibility(revealed, isPongActive);
    };

    visibilityObserver = new IntersectionObserver(() => update(), {
        root: shell,
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
    });
    visibilityObserver.observe(top);
    shell.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
}

function bindBlockingObservers(isPongActive) {
    const recheck = () => {
        if (!padEl?.classList.contains('is-visible')) return;
        if (!canShowPad(isPongActive)) syncPadVisibility(false, isPongActive);
    };

    const bodyObs = new MutationObserver(recheck);
    bodyObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        const lightboxObs = new MutationObserver(recheck);
        lightboxObs.observe(lightbox, { attributes: true, attributeFilter: ['class'] });
    }

    const vault = document.getElementById('modal-vault');
    if (vault) {
        const vaultObs = new MutationObserver(recheck);
        vaultObs.observe(vault, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    if (panopticonEl) {
        const panObs = new MutationObserver(recheck);
        panObs.observe(panopticonEl, { attributes: true, attributeFilter: ['class'] });
    }
}

function clearPaneRetry() {
    paneRetryObs?.disconnect();
    paneRetryObs = null;
}

function schedulePaneRetry(handlers) {
    if (paneRetryObs) return;
    pendingHandlers = handlers;

    const retry = () => {
        if (padEl || !pendingHandlers) return;
        buildPad();
        if (padEl) finishInit(pendingHandlers);
    };

    window.addEventListener('entropy:garden-ready', retry, { once: true });
    paneRetryObs = new MutationObserver(retry);
    paneRetryObs.observe(document.body, { childList: true, subtree: true });
}

function finishInit(handlers) {
    if (bound || !padEl) return;
    bound = true;
    clearPaneRetry();
    pendingHandlers = null;

    padEl.querySelectorAll('[data-konami]').forEach((btn) => {
        bindPress(btn, btn.dataset.konami, handlers);
    });

    bindTitleReveal(handlers.isPongActive);
    bindBlockingObservers(handlers.isPongActive);
}

export function initIosKonamiPad({ isPongActive, onComplete, konami }) {
    if (!perf.isIOS || bound) return;

    const handlers = { isPongActive, onComplete, konami };
    buildPad();
    if (!padEl) {
        schedulePaneRetry(handlers);
        return;
    }

    finishInit(handlers);
}
