/** SVG playlist transport controls (replaces Unicode symbols / iOS text labels). */

export function setPlayPauseIcon(btn, playing) {
    const icon = btn?.querySelector('.playlist-icon');
    if (!icon) return;

    icon.classList.toggle('playlist-icon--play', !playing);
    icon.classList.toggle('playlist-icon--pause', playing);
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}

export function syncPlayPauseIcon(btn, track) {
    if (!btn || !track) return;
    setPlayPauseIcon(btn, !track.paused);
}
