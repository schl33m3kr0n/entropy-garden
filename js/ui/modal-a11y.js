/** Modal focus trap, escape-to-close, and aria state. */

let focusRestore = null;
/** @type {HTMLElement[]} */
const openStack = [];

function focusableIn(container) {
    return container.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
}

export function onModalOpened(modalEl) {
    if (!modalEl) return;

    focusRestore = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openStack.push(modalEl);

    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.removeAttribute('aria-hidden');

    const title = modalEl.querySelector('.drag-handle');
    if (title && !title.id) {
        title.id = `${modalEl.id}-title`;
    }
    if (title?.id) {
        modalEl.setAttribute('aria-labelledby', title.id);
    }

    requestAnimationFrame(() => {
        const target = modalEl.querySelector('.modal-close') || focusableIn(modalEl);
        target?.focus({ preventScroll: true });
    });
}

export function onModalClosed(modalEl) {
    if (!modalEl) return;

    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.removeAttribute('aria-modal');

    const idx = openStack.lastIndexOf(modalEl);
    if (idx >= 0) openStack.splice(idx, 1);

    if (openStack.length === 0 && focusRestore?.isConnected) {
        focusRestore.focus({ preventScroll: true });
        focusRestore = null;
    }
}

export function getTopOpenModal() {
    for (let i = openStack.length - 1; i >= 0; i -= 1) {
        const el = openStack[i];
        if (el?.isConnected && getComputedStyle(el).display !== 'none') return el;
    }
    return null;
}

/** @param {(modal: HTMLElement) => void} closeModal */
export function bindModalEscapeClose(closeModal) {
    if (document.documentElement.dataset.modalEscapeBound) return;
    document.documentElement.dataset.modalEscapeBound = '1';

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const top = getTopOpenModal();
        if (!top) return;
        e.preventDefault();
        closeModal(top);
    });
}

export function enhanceSidebarItems() {
    document.querySelectorAll('#sidebar-menu li[data-modal]').forEach((item) => {
        if (item.dataset.a11yEnhanced) return;
        item.dataset.a11yEnhanced = '1';
        item.setAttribute('role', 'button');
        if (!item.hasAttribute('tabindex')) item.tabIndex = 0;

        const label = item.querySelector('.sidebar-text')?.textContent?.trim();
        if (label && !item.getAttribute('aria-label')) {
            item.setAttribute('aria-label', label.replace(/^\/\/\s*/, 'Open '));
        }

        item.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            item.click();
        });
    });
}

/** Sync playlist transport aria state (play/pause + prev/next). */
export function syncPlaylistTransportAria(btn, { playing, label }) {
    if (!btn) return;
    if (typeof playing === 'boolean') {
        btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
        btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }
    if (label) btn.setAttribute('aria-label', label);
}

export function bindPlaylistTransportLabels() {
    const prev = document.querySelector('#playlist-controls .playlist-btn[aria-label="Previous track"]');
    const next = document.querySelector('#playlist-controls .playlist-btn[aria-label="Next track"]');
    if (prev && !prev.dataset.a11yBound) {
        prev.dataset.a11yBound = '1';
        prev.setAttribute('aria-label', 'Previous track');
    }
    if (next && !next.dataset.a11yBound) {
        next.dataset.a11yBound = '1';
        next.setAttribute('aria-label', 'Next track');
    }
}
