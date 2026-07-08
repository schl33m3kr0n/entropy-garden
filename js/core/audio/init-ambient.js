/** Looping birds ambience — plays in the garden after the boot loader finishes. */
import { sfxPath } from '../dom/media.js';

let birdsAudio = null;
let pendingCanPlay = null;
let unlockFallbackBound = false;

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

export function prefetchGardenBirdsAmbience() {
    const audio = getBirdsAudio();
    audio.preload = 'auto';
    audio.load();
}

/** Call from the init click handler so autoplay survives the loader delay. */
export function primeGardenBirdsAmbience() {
    const audio = getBirdsAudio();
    audio.preload = 'auto';
    audio.load();
    audio.play()
        .then(() => {
            audio.pause();
            audio.currentTime = 0;
        })
        .catch(() => {});
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

function bindUnlockFallback() {
    if (unlockFallbackBound) return;
    unlockFallbackBound = true;

    document.addEventListener('pointerdown', () => {
        if (gardenIsReady()) startGardenBirdsAmbience();
    }, { once: true, passive: true });
}

function attemptPlay(audio, retriesLeft = 10) {
    if (!gardenIsReady()) return;

    audio.play().catch(() => {
        if (retriesLeft <= 0) {
            bindUnlockFallback();
            return;
        }
        setTimeout(() => attemptPlay(audio, retriesLeft - 1), 450);
    });
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
        attemptPlay(audio);
    };

    audio.preload = 'auto';
    if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        play();
        return;
    }

    audio.load();
    pendingCanPlay = play;
    audio.addEventListener('canplay', pendingCanPlay, { once: true });
    audio.addEventListener('error', () => {
        pendingCanPlay = null;
        bindUnlockFallback();
    }, { once: true });
}
