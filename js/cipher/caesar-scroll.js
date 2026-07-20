/**
 * Document-level wheel capture for Caesar ring rotation during the cipher puzzle.
 * Handler body lives in matrix.js (needs wheel state); this module only wires the listener.
 */

const CIPHER_SCROLL_BLOCK =
    '#terminal-container, .modal-overlay.active, #sidebar-menu.active, #playlist-menu.active, #control-panel.active';

function cipherScrollBlocked(e) {
    return Boolean(e.target?.closest?.(CIPHER_SCROLL_BLOCK));
}

function onCipherScrollWheel(e) {
    if ((globalThis.getCipherStage?.() ?? 0) < 1) return;
    if (cipherScrollBlocked(e)) return;
    globalThis.handleCaesarCipherWheel?.(e);
}

document.addEventListener('wheel', onCipherScrollWheel, { passive: false, capture: true });
