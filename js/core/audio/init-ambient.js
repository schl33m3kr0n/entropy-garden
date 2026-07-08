/** Looping birds ambience — plays in the garden after the boot loader finishes. */
import { sfxPath } from '../dom/media.js';

let birdsAudio = null;
let pendingCanPlay = null;

function gardenIsReady() {
    return document.body.classList.contains('garden-ready');
}

function getBirdsAudio() {
    if (!birdsAudio) {
        birdsAudio = new Audio(sfxPath('birds.mp3'));
        birdsAudio.loop = true;
        birdsAudio.preload = 'none';
        birdsAudio.volume = 0.35;
    }
    return birdsAudio;
}

export function stopGardenBirdsAmbience() {
    const audio = birdsAudio;
    if (!audio) return;

    if (pendingCanPlay) {
        audio.removeEventListener('canplay', pendingCanPlay);
        pendingCanPlay = null;
    }

    audio.pause();
    audio.currentTime = 0;
}

export function startGardenBirdsAmbience() {
    if (!gardenIsReady()) return;

    const audio = getBirdsAudio();
    if (!audio.paused) return;

    if (pendingCanPlay) {
        audio.removeEventListener('canplay', pendingCanPlay);
        pendingCanPlay = null;
    }

    const play = () => {
        pendingCanPlay = null;
        if (!gardenIsReady()) return;
        audio.play().catch(() => {});
    };

    audio.preload = 'auto';
    audio.load();
    if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        play();
        return;
    }

    pendingCanPlay = play;
    audio.addEventListener('canplay', pendingCanPlay, { once: true });
}

// Home screen must stay silent even if a stale bundle queued playback earlier.
stopGardenBirdsAmbience();
