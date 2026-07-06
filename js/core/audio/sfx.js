/** Sound effects pool and playback helpers. */
import { sfxPath } from '../dom/media.js';

function createLazyAudio(src) {
    const audio = new Audio();
    audio.preload = 'none';
    audio.src = src;
    return audio;
}

function createBgmAudio(file) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = musicPath(file);
    return audio;
}

function createEagerAudio(src) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = src;
    return audio;
}

export const sfx = {
    oneUp: createLazyAudio(sfxPath('1 up.mp3')),
    checkpoint: createLazyAudio(sfxPath('checkpoint.mp3')),
    collectible: createLazyAudio(sfxPath('collectible.mp3')),
    glitch: createLazyAudio(sfxPath('glitch.mp3')),
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
    press: createLazyAudio(sfxPath('press.mp3')),
    stop: createLazyAudio(sfxPath('stop it.mp3')),
    boop: createEagerAudio(sfxPath('boop.mp3')),
    meow: createLazyAudio(sfxPath('meow.mp3')),
    blip: createLazyAudio(sfxPath('blip.mp3')),
    echo: createLazyAudio(sfxPath('echo.mp3')),
};
export function playSound(sound) {
    if (!sound) return;

    const playNow = () => {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    };

    if (sound.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        sound.preload = 'auto';
        sound.load();
        if (sound.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            playNow();
            return;
        }
        sound.addEventListener('canplay', playNow, { once: true });
        return;
    }

    playNow();
}

export function warmSound(sound) {
    if (!sound) return;
    sound.preload = 'auto';
    sound.load();
}

/** For rapid hits (pong paddles): clone so overlapping plays don't queue on one element. */
export function playSoundOverlap(sound) {
    if (!sound) return;
    const clone = sound.cloneNode();
    clone.play().catch(() => {});
}
