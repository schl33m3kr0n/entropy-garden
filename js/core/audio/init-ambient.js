/** Looping birds ambience — plays in the garden after the boot loader finishes. */
import { sfxPath } from '../dom/media.js';

const BIRDS_MUTE_KEY = 'entropy-garden-birds-muted-v1';

let birdsAudio = null;
let pendingCanPlay = null;
let unlockFallbackBound = false;
let birdsMuted = false;

function loadBirdsMutePref() {
    try {
        birdsMuted = localStorage.getItem(BIRDS_MUTE_KEY) === '1';
    } catch {
        birdsMuted = false;
    }
}

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

export function isGardenBirdsMuted() {
    return birdsMuted;
}

export function syncGardenBirdsMuteButton() {
    const btn = document.getElementById('birds-mute-btn');
    if (!btn) return;
    btn.textContent = birdsMuted ? 'BIRDS MUTED' : 'BIRDS';
    btn.setAttribute('aria-pressed', birdsMuted ? 'true' : 'false');
    btn.classList.toggle('is-muted', birdsMuted);
}

export function setGardenBirdsMuted(muted) {
    birdsMuted = !!muted;
    try {
        localStorage.setItem(BIRDS_MUTE_KEY, birdsMuted ? '1' : '0');
    } catch {
        /* private mode */
    }
    document.body?.classList.toggle('birds-muted', birdsMuted);
    syncGardenBirdsMuteButton();

    if (birdsMuted) {
        stopGardenBirdsAmbience();
    } else if (gardenIsReady()) {
        startGardenBirdsAmbience();
    }
}

export function toggleGardenBirdsMuted() {
    setGardenBirdsMuted(!birdsMuted);
    return birdsMuted;
}

loadBirdsMutePref();
if (document.body) {
    document.body.classList.toggle('birds-muted', birdsMuted);
}

export function prefetchGardenBirdsAmbience() {
    if (birdsMuted) return;
    const audio = getBirdsAudio();
    audio.preload = 'auto';
    audio.load();
}

/** Call from the init click handler so autoplay survives the loader delay. */
export function primeGardenBirdsAmbience() {
    if (birdsMuted) return;
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
    if (!gardenIsReady() || birdsMuted) return;

    audio.play().catch(() => {
        if (retriesLeft <= 0) {
            bindUnlockFallback();
            return;
        }
        setTimeout(() => attemptPlay(audio, retriesLeft - 1), 450);
    });
}

export function startGardenBirdsAmbience() {
    if (!gardenIsReady() || birdsMuted) return;

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
