/** Looping birds ambience — starts after the boot loader finishes. */
import { sfxPath } from '../dom/media.js';

let birdsAudio = null;

function getBirdsAudio() {
    if (!birdsAudio) {
        birdsAudio = new Audio(sfxPath('birds.mp3'));
        birdsAudio.loop = true;
        birdsAudio.preload = 'auto';
        birdsAudio.volume = 0.35;
    }
    return birdsAudio;
}

export function startInitScreenAmbience() {
    const audio = getBirdsAudio();
    if (!audio.paused) return;

    const play = () => {
        audio.play().catch(() => {});
    };

    audio.load();
    if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        play();
        return;
    }

    audio.addEventListener('canplay', play, { once: true });
}

export function stopInitScreenAmbience() {
    if (!birdsAudio) return;
    birdsAudio.pause();
    birdsAudio.currentTime = 0;
}
