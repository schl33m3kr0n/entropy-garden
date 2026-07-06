/** SVG playlist transport controls (mask-icon play/pause toggle). */

const PLAYLIST_ICON = '.mask-icon';

export function isPlayPauseShowingPlaying(btn) {
    return Boolean(btn?.querySelector(PLAYLIST_ICON)?.classList.contains('mask-icon--pause'));
}

export function setPlayPauseIcon(btn, playing) {
    const icon = btn?.querySelector(PLAYLIST_ICON);
    if (!icon) return;

    icon.classList.remove('mask-icon--play', 'mask-icon--pause');
    icon.classList.add(playing ? 'mask-icon--pause' : 'mask-icon--play');
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
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

    const isActiveTrack = (track) => track && getTrack() === track;

    const bindTrack = (track) => {
        if (!track || track === boundTrack) return;
        boundTrack = track;
        track.addEventListener('playing', () => {
            if (!isActiveTrack(track)) return;
            pauseIntent = false;
            setPlayPauseIcon(btn, true);
        });
        track.addEventListener('pause', () => {
            if (!isActiveTrack(track)) return;
            pauseIntent = true;
            setPlayPauseIcon(btn, false);
        });
        track.addEventListener('ended', () => {
            if (!isActiveTrack(track)) return;
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
