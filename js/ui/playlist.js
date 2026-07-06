/** Playlist transport controls (replaces inline onclick on prev/next). */

/**
 * @param {{ onPrev: () => void, onNext: () => void }} handlers
 */
export function bindPlaylistTransport({ onPrev, onNext }) {
    const prevBtn = document.querySelector('#playlist-controls .playlist-btn[aria-label="Previous track"]');
    const nextBtn = document.querySelector('#playlist-controls .playlist-btn[aria-label="Next track"]');

    if (prevBtn && !prevBtn.dataset.transportBound) {
        prevBtn.dataset.transportBound = '1';
        prevBtn.addEventListener('click', () => onPrev());
    }

    if (nextBtn && !nextBtn.dataset.transportBound) {
        nextBtn.dataset.transportBound = '1';
        nextBtn.addEventListener('click', () => onNext());
    }
}

/** Close Maya boss-key overlay (replaces inline handler on #close-maya-btn). */
export function bindBossKeyClose(onClose) {
    const btn = document.getElementById('close-maya-btn');
    if (!btn || btn.dataset.bossCloseBound) return;
    btn.dataset.bossCloseBound = '1';
    btn.addEventListener('click', () => onClose());
}
