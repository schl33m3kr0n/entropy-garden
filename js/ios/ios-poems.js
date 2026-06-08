// iOS poem archive — sidebar list + reader (replaces singularity overlay).

import { perf, sfx, playSound } from '../core/shared.js';
import { isCorrupted, isCipherSolved, setIosTransmissionsOverride } from '../core/state.js';
import {
    buildSingularityPoemPool,
    poemTitleFromText,
} from '../data/singularity-poems.data.js';

const IOS_POEM_TITLE_SLOTS = 3;

let currentIndex = 0;
let uiBound = false;

export function isIosPoemMode() {
    return perf.isIOS || document.body.classList.contains('ios-ui');
}

export function iosPoemsAllowed() {
    return isCipherSolved || iosTransmissionsOverride;
}

/** @deprecated alias */
export const iosTransmissionsAllowed = iosPoemsAllowed;

export function syncIosPoemsSidebar() {
    const item = document.getElementById('ios-poems-item');
    if (!item) return;
    const show = isIosPoemMode() && iosPoemsAllowed();
    item.hidden = !show;
    item.style.display = show ? '' : 'none';
    item.setAttribute('aria-hidden', show ? 'false' : 'true');
}

/** @deprecated alias */
export const syncIosTransmissionsSidebar = syncIosPoemsSidebar;

function poemPool() {
    return buildSingularityPoemPool(isCorrupted);
}

function modalEl() {
    return document.getElementById('modal-poems');
}

/** Three title buttons: previous, current, next poem in the corpus. */
function renderPoemList() {
    const list = document.getElementById('ios-poem-list');
    if (!list) return;

    const pool = poemPool();
    if (!pool.length) {
        list.innerHTML = '';
        return;
    }

    list.innerHTML = '';
    const half = Math.floor(IOS_POEM_TITLE_SLOTS / 2);
    for (let offset = -half; offset <= half; offset += 1) {
        const i = ((currentIndex + offset) % pool.length + pool.length) % pool.length;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ios-poem-list-item';
        btn.dataset.poemIndex = String(i);
        btn.textContent = poemTitleFromText(pool[i]);
        if (offset === 0) btn.classList.add('active');
        btn.addEventListener('click', () => {
            selectPoem(i);
            playSound(sfx.click);
        });
        list.appendChild(btn);
    }
}

export function selectPoem(index) {
    const pool = poemPool();
    if (!pool.length) return;

    currentIndex = ((index % pool.length) + pool.length) % pool.length;
    const body = document.getElementById('ios-poem-body');
    if (body) body.textContent = pool[currentIndex];
    renderPoemList();
}

export function stepIosPoem(delta) {
    selectPoem(currentIndex + delta);
}

export function refreshIosPoemArchive() {
    if (!iosPoemsAllowed()) {
        syncIosPoemsSidebar();
        return;
    }
    if (!modalEl() || modalEl().style.display === 'none') return;
    const pool = poemPool();
    if (currentIndex >= pool.length) currentIndex = 0;
    renderPoemList();
    selectPoem(currentIndex);
}

function bindIosPoemUi() {
    if (uiBound) return;
    uiBound = true;

    document.getElementById('ios-poem-prev')?.addEventListener('click', () => {
        stepIosPoem(-1);
        playSound(sfx.click);
    });
    document.getElementById('ios-poem-next')?.addEventListener('click', () => {
        stepIosPoem(1);
        playSound(sfx.click);
    });
}

/** Unlock poems sidebar (express backdoor). */
export function unlockIosPoems() {
    setIosTransmissionsOverride(true);
    syncIosPoemsSidebar();
}

/** @deprecated alias */
export const unlockIosTransmissions = unlockIosPoems;

/** Open poems modal at a poem index (dock win, express). */
export function openIosPoemArchive(index = 0) {
    if (!isIosPoemMode()) return;
    if (!iosPoemsAllowed()) return;

    bindIosPoemUi();
    renderPoemList();
    selectPoem(index);

    document.getElementById('sidebar-menu')?.classList.remove('active');
    globalThis.unlockTrophy?.('singularity_ritual');
    playSound(sfx.missionCleared);

    if (typeof globalThis.openModal === 'function') {
        globalThis.openModal('poems');
    } else {
        const modal = modalEl();
        if (modal) modal.style.display = 'block';
    }
}

export function initIosPoemArchive() {
    if (!isIosPoemMode()) return;
    bindIosPoemUi();
    syncIosTransmissionsSidebar();
}
