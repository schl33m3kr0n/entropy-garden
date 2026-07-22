/** Sound effects pool and playback helpers. */
import { sfxPath } from '../dom/media.js';

function createLazyAudio(src) {
    const audio = new Audio();
    audio.preload = 'none';
    audio.src = src;
    return audio;
}

function createEagerAudio(src) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = src;
    return audio;
}

const glitchBank = [
    createLazyAudio(sfxPath('glitch.mp3')),
    createLazyAudio(sfxPath('glitch2.mp3')),
    createLazyAudio(sfxPath('glitch3.mp3')),
    createLazyAudio(sfxPath('glitch4.mp3')),
    createLazyAudio(sfxPath('glitch5.mp3')),
];

let lastGlitchIdx = -1;

/** Pick a glitch clip, avoiding an immediate repeat when possible. */
export function pickGlitchSound() {
    if (glitchBank.length <= 1) return glitchBank[0];
    let idx = Math.floor(Math.random() * glitchBank.length);
    if (idx === lastGlitchIdx) {
        idx = (idx + 1 + Math.floor(Math.random() * (glitchBank.length - 1))) % glitchBank.length;
    }
    lastGlitchIdx = idx;
    return glitchBank[idx];
}

export const sfx = {
    oneUp: createLazyAudio(sfxPath('1 up.mp3')),
    checkpoint: createLazyAudio(sfxPath('checkpoint.mp3')),
    collectible: createLazyAudio(sfxPath('collectible.mp3')),
    glitch: glitchBank[0],
    itemAcquired: createLazyAudio(sfxPath('item acquired.mp3')),
    missionCleared: createLazyAudio(sfxPath('mission cleared.mp3')),
    oopsy: createLazyAudio(sfxPath('oopsy daisies.mp3')),
    it: createLazyAudio(sfxPath('it.mp3')),
    transition: createLazyAudio(sfxPath('transition.mp3')),
    refresh: createLazyAudio(sfxPath('dry-fart.mp3')),
    taskComplete: createLazyAudio(sfxPath('task complete.mp3')),
    loading: createLazyAudio(sfxPath('loading.mp3')),
    radio: createLazyAudio(sfxPath('radio.mp3')),
    gameStart: createLazyAudio(sfxPath('game-start.mp3')),
    gamePoint: createLazyAudio(sfxPath('game-point.mp3')),
    hit: createLazyAudio(sfxPath('hit.mp3')),
    pop: createLazyAudio(sfxPath('pop.mp3')),
    sixSeven: createLazyAudio(sfxPath('67.mp3')),
    eat: createLazyAudio(sfxPath('eat.mp3')),
    exit: createLazyAudio(sfxPath('exit.mp3')),
    burp: document.getElementById('burp-sound'),
    error: document.getElementById('error-sound'),
    keystroke: createLazyAudio(sfxPath('keystroke.mp3')),
    clearThroat: createLazyAudio(sfxPath('clearing-throat.mp3')),
    unknown: createLazyAudio(sfxPath('unknown command.mp3')),
    ui: createLazyAudio(sfxPath('ui.mp3')),
    stfu: createLazyAudio(sfxPath('stfu.mp3')),
    close: createLazyAudio(sfxPath('close.mp3')),
    click: createLazyAudio(sfxPath('click.mp3')),
    click2: createLazyAudio(sfxPath('click2.mp3')),
    press: createLazyAudio(sfxPath('press.mp3')),
    stop: createLazyAudio(sfxPath('stop it.mp3')),
    boop: createEagerAudio(sfxPath('boop.mp3')),
    meow: createLazyAudio(sfxPath('meow.mp3')),
    blip: createLazyAudio(sfxPath('blip.mp3')),
    echo: createLazyAudio(sfxPath('echo.mp3')),
};

export function playSound(sound) {
    if (!sound) return;

    if (sound.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        sound.preload = 'auto';
        // Only (re)load when idle or errored — calling load() while a fetch is
        // in flight (e.g. after warmSound) aborts and restarts it every time.
        if (sound.networkState !== HTMLMediaElement.NETWORK_LOADING) {
            sound.load();
        }
        // Play immediately inside the user gesture; the promise resolves once
        // data arrives. Deferring to `canplay` would run outside the gesture's
        // transient activation and could be blocked by autoplay policy.
        sound.play().catch(() => {});
        return;
    }

    // Fast path: already buffered — restart from the top.
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

/** Random glitch from the bank (original + glitch2–5). */
export function playGlitchSound(options = {}) {
    const sound = pickGlitchSound();
    if (!sound) return;

    if (typeof options.volume === 'number') {
        const clip = sound.cloneNode();
        clip.volume = Math.max(0, Math.min(1, options.volume));
        clip.play().catch(() => {});
        return;
    }

    playSound(sound);
}

export function warmSound(sound) {
    if (!sound) return;
    if (sound.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
    if (sound.networkState === HTMLMediaElement.NETWORK_LOADING) return;
    sound.preload = 'auto';
    sound.load();
}

/** For rapid hits (pong paddles): clone so overlapping plays don't queue on one element. */
export function playSoundOverlap(sound) {
    if (!sound) return;
    const clone = sound.cloneNode();
    clone.play().catch(() => {});
}
