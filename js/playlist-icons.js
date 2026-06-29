/** SVG playlist transport controls (replaces Unicode symbols / iOS text labels). */

export function isPlayPauseShowingPlaying(btn) {
    return Boolean(btn?.querySelector('.playlist-icon')?.classList.contains('playlist-icon--pause'));
}

export function setPlayPauseIcon(btn, playing) {
    const icon = btn?.querySelector('.playlist-icon');
    if (!icon) return;

    icon.classList.remove('playlist-icon--play', 'playlist-icon--pause');
    icon.classList.add(playing ? 'playlist-icon--pause' : 'playlist-icon--play');
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}

export function syncPlayPauseIcon(btn, track) {
    if (!btn || !track) return;
    setPlayPauseIcon(btn, !track.paused);
}

/**
 * Keep play/pause icon aligned with real audio state.
 * Click handling uses icon state so buffering tracks can still be paused immediately.
 */
export function bindPlaylistPlayPause(btn, getTrack) {
    if (!btn || btn.dataset.playPauseBound) return null;
    btn.dataset.playPauseBound = '1';

    let pauseIntent = false;
    let boundTrack = null;

    const syncFromTrack = () => {
        if (pauseIntent) {
            setPlayPauseIcon(btn, false);
            return;
        }
        syncPlayPauseIcon(btn, getTrack());
    };

    const bindTrack = (track) => {
        if (!track || track === boundTrack) return;
        boundTrack = track;
        track.addEventListener('playing', () => {
            if (pauseIntent) return;
            setPlayPauseIcon(btn, true);
        });
        track.addEventListener('pause', () => {
            pauseIntent = true;
            setPlayPauseIcon(btn, false);
        });
        track.addEventListener('ended', () => {
            pauseIntent = true;
            setPlayPauseIcon(btn, false);
        });
    };

    const ensureTrackBound = () => {
        bindTrack(getTrack());
        syncFromTrack();
    };

    ensureTrackBound();

    return {
        markPlayingIntent() {
            pauseIntent = false;
            setPlayPauseIcon(btn, true);
            ensureTrackBound();
        },
        markPausedIntent() {
            pauseIntent = true;
            setPlayPauseIcon(btn, false);
        },
        refresh() {
            ensureTrackBound();
        },
    };
}
