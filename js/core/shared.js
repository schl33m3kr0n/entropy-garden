// Shared utilities, audio, perf, canvas
import {
    gardenHasStarted,
    gardenLoopActive,
    singularityAnimId,
    isCorrupted,
    isSingularityActive,
    getCipherStage,
} from './state.js';
import { FULL_MATRIX_CHARS, HEBREW_CIPHER_CHARS } from '../data/cipher-glyphs.data.js';
import {
    isIOS,
    isSafari,
    isRealIOSDevice,
    isSafariBrowser,
    isFileProtocol,
} from './environment.js';

export { gardenHasStarted, gardenLoopActive, singularityAnimId, isCorrupted, isSingularityActive };
export { isIOS, isSafari, isRealIOSDevice, isSafariBrowser, isFileProtocol };

export const asset = (path) => `assets/${path}`;
export const sfxPath = (file) => asset(`audio/sfx/${file}`);
export const musicPath = (file) => asset(`audio/music/${encodeURIComponent(file)}`);
export const imgPath = (file) => asset(`img/${file}`);

export function setImgWithFallback(el) {
    if (!el || el.tagName !== 'IMG' || el.getAttribute('src')) return;
    const primary = el.dataset.src;
    const fallback = el.dataset.fallback;
    if (!primary) return;
    if (fallback) {
        el.onerror = () => {
            el.onerror = null;
            el.src = fallback;
        };
    }
    el.src = primary;
}

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

export const BGM_TRACKS = [
    'init.mp3',
    'ambient2.mp3',
    'ambient3.mp3',
    'ambient4.mp3',
    'ambient6.mp3',
    'ambient7.mp3',
    'playboi carti - 7am (slowed reverb).mp3',
    'ambient8.mp3',
    'fractals.mp3',
];

/** Parallel to BGM_TRACKS — display artist + title. */
export const BGM_TRACK_INFO = [
    { title: 'Hightech Data', artist: 'Alex_Jauk' },
    { title: 'Ambient arp', artist: 'freesound_community' },
    { title: 'ambient dream', artist: 'freesound_community' },
    { title: 'Ambient Soundscape - Glitch Bells', artist: 'GregorQuendel' },
    { title: 'Preparing for the Uncertain', artist: 'Grand_Project' },
    { title: 'Ambient', artist: 'leberch' },
    { title: '7am (slowed + reverb)', artist: 'Adrian' },
    { title: 'Cybernetic Night (Sci-Fi Ambient)', artist: 'KonstantinPazuzuStudio' },
    { title: 'Fractals', artist: '5Δ' },
];

export const BGM_TRACK_TITLES = BGM_TRACK_INFO.map((track) => `${track.title} — ${track.artist}`);

export function getBgmTrackTitle(index) {
    const track = BGM_TRACK_INFO[wrapTrackIndex(index)];
    if (!track) return 'Unknown Track';
    return `${track.title} — ${track.artist}`;
}

let trackTitleResizeObserver = null;
const observedTrackTitles = new Set();

function setupTrackTitleResizeObserver() {
    if (trackTitleResizeObserver) return;
    trackTitleResizeObserver = new ResizeObserver(() => {
        for (const container of observedTrackTitles) {
            const text = container.dataset.trackTitle;
            if (text) applyTrackTitleMarquee(container, text, { skipObserve: true });
        }
    });
}

export function applyTrackTitleMarquee(container, text, options = {}) {
    if (!container) return;
    const displayText = `// ${text}`;
    container.title = text;
    container.dataset.trackTitle = text;
    container.classList.remove('is-scrolling');
    container.classList.add('is-static');
    container.style.removeProperty('--marquee-duration');
    container.style.removeProperty('--marquee-offset');

    container.innerHTML = '';
    const scroll = document.createElement('div');
    scroll.className = 'track-title-scroll';
    const content = document.createElement('span');
    content.className = 'track-title-content';
    content.textContent = displayText;
    scroll.appendChild(content);
    container.appendChild(scroll);

    const measureAndApply = () => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        container.classList.remove('is-scrolling');
        container.classList.add('is-static');
        container.style.removeProperty('--marquee-duration');
        container.style.removeProperty('--marquee-offset');

        scroll.innerHTML = '';
        const primary = document.createElement('span');
        primary.className = 'track-title-content';
        primary.textContent = displayText;
        scroll.appendChild(primary);

        if (reducedMotion) {
            container.classList.add('is-static');
            return;
        }

        const primaryWidth = primary.getBoundingClientRect().width;
        if (primaryWidth <= container.clientWidth + 1) {
            container.classList.add('is-static');
            return;
        }

        const gap = document.createElement('span');
        gap.className = 'track-title-gap';
        gap.setAttribute('aria-hidden', 'true');
        gap.textContent = '   ·   ';

        const duplicate = primary.cloneNode(true);
        duplicate.setAttribute('aria-hidden', 'true');

        scroll.appendChild(gap);
        scroll.appendChild(duplicate);

        const primaryLeft = primary.getBoundingClientRect().left;
        let segmentWidth = duplicate.getBoundingClientRect().left - primaryLeft;
        if (!segmentWidth) {
            segmentWidth = primary.getBoundingClientRect().width + gap.getBoundingClientRect().width;
        }

        const speed = 35;
        container.style.setProperty('--marquee-offset', `-${segmentWidth}px`);
        container.style.setProperty('--marquee-duration', `${segmentWidth / speed}s`);
        container.classList.remove('is-static');
        container.classList.add('is-scrolling');
    };

    const scheduleMeasure = () => {
        requestAnimationFrame(() => requestAnimationFrame(measureAndApply));
    };

    if (document.fonts?.ready) {
        document.fonts.ready.then(scheduleMeasure).catch(scheduleMeasure);
    } else {
        scheduleMeasure();
    }

    if (!options.skipObserve) {
        setupTrackTitleResizeObserver();
        observedTrackTitles.add(container);
        trackTitleResizeObserver.observe(container);
    }
}

const bgmCache = new Map();
/** @type {Map<number, Promise<HTMLAudioElement>>} */
const bgmBufferPromises = new Map();
export let currentTrackIndex = 0;
let bgmPlayGeneration = 0;

function wrapTrackIndex(index) {
    return ((index % BGM_TRACKS.length) + BGM_TRACKS.length) % BGM_TRACKS.length;
}

function nextBgmPlayGeneration() {
    bgmPlayGeneration += 1;
    return bgmPlayGeneration;
}

export function getBgmTrack(index) {
    const i = wrapTrackIndex(index);
    if (!bgmCache.has(i)) {
        const audio = createBgmAudio(BGM_TRACKS[i]);
        audio.loop = false;
        audio.volume = 0.3;
        bgmCache.set(i, audio);
    }
    return bgmCache.get(i);
}

function stopBgmTrack(index) {
    const i = wrapTrackIndex(index);
    const track = bgmCache.get(i);
    if (!track) return;
    nextBgmPlayGeneration();
    track.pause();
    track.currentTime = 0;
    track.onended = null;
}

function preloadBgmTrack(index) {
    const track = getBgmTrack(index);
    if (track.readyState === 0) track.load();
}

function pruneBgmCache() {
    const keep = new Set([
        wrapTrackIndex(currentTrackIndex),
        wrapTrackIndex(currentTrackIndex + 1),
        wrapTrackIndex(currentTrackIndex - 1),
        wrapTrackIndex(currentTrackIndex + 2),
    ]);
    bgmCache.forEach((track, index) => {
        const fileName = BGM_TRACKS[wrapTrackIndex(index)];
        if (
            isLargeBgmFile(fileName) &&
            track.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
            keep.add(index);
            return;
        }
        if (keep.has(index)) return;
        if (bgmBufferPromises.has(index)) return;
        const i = wrapTrackIndex(index);
        const cached = bgmCache.get(i);
        if (!cached) return;
        cached.pause();
        cached.currentTime = 0;
        cached.onended = null;
        cached.removeAttribute('src');
        cached.load();
        bgmCache.delete(i);
    });
}

/** Long playlist tracks — buffer to HAVE_FUTURE_DATA before play. */
const BGM_LARGE_FILES = new Set([
    'ambient3.mp3',
    'ambient8.mp3',
    'fractals.mp3',
    'playboi carti - 7am (slowed reverb).mp3',
]);

function isLargeBgmFile(fileName) {
    return BGM_LARGE_FILES.has(fileName);
}

function bgmBufferTarget(fileName) {
    return isLargeBgmFile(fileName)
        ? HTMLMediaElement.HAVE_FUTURE_DATA
        : HTMLMediaElement.HAVE_CURRENT_DATA;
}

function bgmBufferTimeoutMs(fileName) {
    return isLargeBgmFile(fileName) ? 30_000 : 20_000;
}

/** Large MP3s often stall below HAVE_FUTURE_DATA on Safari — play once this much is ready. */
const BGM_LARGE_EARLY_PLAY_MS = 6_000;

function ensureBgmSource(track, fileName) {
    if (!track.src && fileName) track.src = musicPath(fileName);
    if (track.readyState === 0 || track.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        track.load();
    }
}

/**
 * Load a playlist track and wait until enough audio is buffered to play reliably.
 * Large files wait for HAVE_FUTURE_DATA; shorter tracks use HAVE_CURRENT_DATA.
 */
function waitForBgmBuffer(track, fileName) {
    const idealReady = bgmBufferTarget(fileName);
    const playableReady = HTMLMediaElement.HAVE_CURRENT_DATA;
    const timeoutMs = bgmBufferTimeoutMs(fileName);
    const large = isLargeBgmFile(fileName);

    return new Promise((resolve, reject) => {
        const resolveIfReady = (minReady) => {
            if (track.readyState >= minReady) {
                cleanup();
                resolve(track);
                return true;
            }
            return false;
        };

        const tryIdeal = () => resolveIfReady(idealReady);
        const tryPlayable = () => resolveIfReady(playableReady);

        const onError = () => {
            cleanup();
            reject(new Error(`bgm-buffer-error:${fileName}`));
        };
        const onStalled = () => {
            if (track.readyState < playableReady) track.load();
        };

        let waitTimeout;
        let earlyPlayTimeout;
        const cleanup = () => {
            clearTimeout(waitTimeout);
            clearTimeout(earlyPlayTimeout);
            track.removeEventListener('canplaythrough', tryIdeal);
            track.removeEventListener('canplay', tryIdeal);
            track.removeEventListener('progress', tryIdeal);
            track.removeEventListener('error', onError);
            track.removeEventListener('stalled', onStalled);
        };

        if (resolveIfReady(idealReady) || (!large && resolveIfReady(playableReady))) return;

        if (large) {
            earlyPlayTimeout = setTimeout(tryPlayable, BGM_LARGE_EARLY_PLAY_MS);
        }

        waitTimeout = setTimeout(() => {
            if (tryPlayable()) return;
            cleanup();
            reject(new Error(`bgm-buffer-timeout:${fileName}`));
        }, timeoutMs);

        track.addEventListener('canplaythrough', tryIdeal);
        track.addEventListener('canplay', tryIdeal);
        track.addEventListener('progress', tryIdeal);
        track.addEventListener('error', onError, { once: true });
        track.addEventListener('stalled', onStalled);
        ensureBgmSource(track, fileName);
        tryIdeal();
    });
}

/** Warm all large playlist files (e.g. during the boot loader). */
export function prefetchLargeBgmTracks() {
    BGM_TRACKS.forEach((file, index) => {
        if (isLargeBgmFile(file)) bufferBgmTrack(index).catch(() => {});
    });
}

/** Eagerly buffer a playlist track (deduped per index). */
export function bufferBgmTrack(index) {
    const i = wrapTrackIndex(index);
    const pending = bgmBufferPromises.get(i);
    if (pending) return pending;

    const fileName = BGM_TRACKS[i];
    const track = getBgmTrack(i);
    const promise = waitForBgmBuffer(track, fileName).finally(() => {
        if (bgmBufferPromises.get(i) === promise) bgmBufferPromises.delete(i);
    });
    bgmBufferPromises.set(i, promise);
    return promise;
}

/** Pre-buffer the current track and upcoming large files in the rotation. */
function prefetchAdjacentBgmBuffers(centerIndex = currentTrackIndex) {
    const center = wrapTrackIndex(centerIndex);
    const next = wrapTrackIndex(center + 1);
    const next2 = wrapTrackIndex(center + 2);
    const prev = wrapTrackIndex(center - 1);

    bufferBgmTrack(center).catch(() => {});
    preloadBgmTrack(next);
    preloadBgmTrack(prev);

    if (isLargeBgmFile(BGM_TRACKS[next])) {
        bufferBgmTrack(next).catch(() => {});
    }
    if (isLargeBgmFile(BGM_TRACKS[next2])) {
        bufferBgmTrack(next2).catch(() => {});
    }
}

/** Wait for buffer then play(); retry on autoplay/block or load failure. */
function playBgmWhenReady(track, generation, retriesLeft = 4, trackIndex = currentTrackIndex) {
    if (generation !== bgmPlayGeneration) return;

    const i = wrapTrackIndex(trackIndex);
    const fileName = BGM_TRACKS[i];

    const skipBrokenTrack = () => {
        if (generation !== bgmPlayGeneration) return;
        playNextTrack();
    };

    const startPlayback = () => {
        if (generation !== bgmPlayGeneration) return;
        track.volume = 0.3;
        track.play().catch(() => {
            if (generation !== bgmPlayGeneration) return;
            if (retriesLeft <= 0) {
                skipBrokenTrack();
                return;
            }
            setTimeout(() => playBgmWhenReady(track, generation, retriesLeft - 1, trackIndex), 250);
        });
    };

    bufferBgmTrack(i)
        .then(() => startPlayback())
        .catch(() => {
            if (generation !== bgmPlayGeneration) return;
            if (retriesLeft <= 0) {
                skipBrokenTrack();
                return;
            }
            ensureBgmSource(track, fileName);
            track.load();
            setTimeout(() => playBgmWhenReady(track, generation, retriesLeft - 1, trackIndex), 400);
        });
}

function schedulePruneBgmCache(track) {
    const prune = () => pruneBgmCache();
    track.addEventListener('playing', prune, { once: true });
    setTimeout(prune, 45_000);
}

export function playCurrentBgmTrack() {
    const i = wrapTrackIndex(currentTrackIndex);
    const generation = nextBgmPlayGeneration();
    const track = getBgmTrack(i);
    track.loop = false;
    track.onended = playNextTrack;
    prefetchAdjacentBgmBuffers(i);
    playBgmWhenReady(track, generation, 4, i);
    track.addEventListener('playing', () => prefetchAdjacentBgmBuffers(i), { once: true });
    schedulePruneBgmCache(track);
    if (typeof globalThis.updatePlaylistUI === 'function') {
        globalThis.updatePlaylistUI();
    }
}

export function playSound(sound) {
    if (!sound) return;
    sound.currentTime = 0;
    sound.play().catch(() => {});
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

export function playMeow() {
    triggerPanopticonCatEye(sfx.meow);
    playSound(sfx.meow);
}

export function shuffle(array) {
    let currentIndex = array.length;
    let randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

export function createBag(arr) {
    let bag = [];
    return function draw(count = 1) {
        const results = [];
        for (let i = 0; i < count; i++) {
            if (bag.length === 0) bag = shuffle([...arr]);
            results.push(bag.pop());
        }
        return count === 1 ? results[0] : results;
    };
}

const loreBagRegistry = new WeakMap();

function getLoreDrawer(safe, gritty = []) {
    let entry = loreBagRegistry.get(safe);
    if (!entry) {
        entry = {};
        loreBagRegistry.set(safe, entry);
    }
    const useGritty = isCorrupted && gritty.length;
    const key = useGritty ? 'gritty' : 'safe';
    if (!entry[key]) {
        const pool = useGritty ? safe.concat(gritty) : safe.slice();
        entry[key] = createBag(pool);
    }
    return entry[key];
}

export function pickOne(safe, gritty = []) {
    return getLoreDrawer(safe, gritty)();
}

export function pickMany(safe, gritty, count) {
    return getLoreDrawer(safe, gritty)(count);
}

export const canvas = document.getElementById('grid-canvas');
export const ctx = canvas.getContext('2d');

export { FULL_MATRIX_CHARS };
export const chars = FULL_MATRIX_CHARS;

// BMP symbols that render reliably in iOS system fonts (cipher wheels only).
const IOS_CIPHER_CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
    '∑∫∆∞≈±×÷√∧∨∩∪∴∵∼≠≤≥⊕⊗⊥─□△▽◇○◎★☆♪♀♂☼' +
    'αβγδεζηθικλμνξοπρστυφχψω' +
    'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЮЯ' +
    'アイウエオカキクケコサシスセソタチツテトナニヌネノ' +
    'ハヒフヘホマミムメモヤユヨラリルレロワン' +
    '道禅空幻心理气天阴阳' +
    HEBREW_CIPHER_CHARS +
    '!?@#$%&*_+=<>[]{}|/~';

/** Smaller glyph pool + flat wheel paint on WebKit (iOS / Safari). */
export function usesIosCipherGlyphs() {
    return perf.liteGfx || document.body?.classList.contains('ios-ui');
}

export function usesLiteCipherWheelPaint() {
    return usesIosCipherGlyphs();
}

export function pickCipherChar() {
    const pool = usesIosCipherGlyphs() ? IOS_CIPHER_CHARS : FULL_MATRIX_CHARS;
    return pool[Math.floor(Math.random() * pool.length)];
}

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isNarrowViewport = window.innerWidth <= 768;
const isMobile = isCoarsePointer || isNarrowViewport;

function applyPerfNumbers() {
    const rm = perf.prefersReducedMotion;
    const ios = perf.isIOS;
    const saf = perf.isSafari;
    const mob = perf.isMobile;

    perf.liteGfx = ios || saf;
    perf.dprCap = ios ? 1 : (saf ? 1 : (mob ? 1.5 : 2));
    perf.spawnPerFrame = rm ? 12 : (ios ? 2 : (saf ? 3 : (mob ? 4 : 8)));
    perf.steadySwapsPerFrame = rm ? 8 : (ios ? 4 : (saf ? 6 : (mob ? 12 : 30)));
    perf.matrixFrameSkip = rm
        ? 0
        : (ios ? 2 : (saf ? 2 : (mob ? 1 : 0)));
    perf.panopticonFrameSkip = rm ? 0 : ((ios || saf) ? 1 : 0);
    perf.maxCipherRings = ios ? 7 : (saf ? 8 : null);
    perf.cellSpacing = mob ? 1.45 : 1.65;
}

export const perf = {
    isIOS,
    isSafari,
    isMobile,
    liteGfx: isIOS || isSafari,
    prefersReducedMotion: reducedMotionQuery.matches,
    dprCap: 2,
    spawnPerFrame: 8,
    steadySwapsPerFrame: 30,
    matrixFrameSkip: 0,
    panopticonFrameSkip: 0,
    maxCipherRings: null,
    cellSpacing: 1.65,
};

applyPerfNumbers();

export function applyPerfClass() {
    document.body.classList.toggle('perf-lite', isMobile || perf.prefersReducedMotion || perf.isSafari);
    document.body.classList.toggle('perf-safari', perf.isSafari);
}

applyPerfClass();
reducedMotionQuery.addEventListener('change', (e) => {
    perf.prefersReducedMotion = e.matches;
    applyPerfNumbers();
    applyPerfClass();
    import('./state.js').then((s) => s.setNeedsFullRedraw(true));
});

export let eyeAngle = 0;
export let eyeMode = 'idle';

export const panopticonCommentEl = document.getElementById('panopticon-comment');
export const panopticonEl = document.getElementById('panopticon-eye');
export const panopticonInnerEl = panopticonEl?.querySelector('.panopticon-inner');
export const panopticonGazeEl = document.getElementById('panopticon-gaze');
export const panopticonPupilEl = document.querySelector('.panopticon-pupil');
export const panopticonIrisOuterEl = document.querySelector('.panopticon-iris-outer');
export const panopticonIrisMidEl = document.querySelector('.panopticon-iris-mid');
export const panopticonGodPupilEl = document.getElementById('panopticon-god-pupil');
export const panopticonLidEl = document.getElementById('panopticon-lid');
export const panopticonClipPathEl = document.getElementById('panopticon-clip-path');
export const panopticonRainbowGradEl = document.getElementById('panopticon-rainbow');

/** One glyph per icosphere face (same set as singularity 3D). */
export const ICO_SYMBOLS = [
    '⛦', '⚛︎', '☯︎', '❖', '◉', '⧊', '☉', '⛬', '⛢', '☧',
    '☥', '♁', '𖣂', '🜲', '🜁', '𖤓', '✖', '☸', '⚖', '∞',
];

const PANOPTICON_GOD_CLOSE_MS = 480;
const PANOPTICON_GOD_HOLD_MS = 280;
const PANOPTICON_GOD_OPEN_MS = 480;
const PANOPTICON_GOD_SYMBOL_MS = 260;
const PANOPTICON_LID_OPEN = 'M 8 50 C 28 12, 72 12, 92 50 C 72 88, 28 88, 8 50 Z';
const PANOPTICON_LID_CLOSED = 'M 8 50 L 92 50';
const PANOPTICON_CAT_MORPH_MS = 420;
const PANOPTICON_CAT_HOLD_MS = 1100;
const PANOPTICON_WAKE_PEEK_MS = 520;
const PANOPTICON_WAKE_BLINK_MS = 880;
const PANOPTICON_WAKE_BLINK_COUNT = 2;
const PANOPTICON_WAKE_YAWN_MS = 640;
const PANOPTICON_WAKE_SETTLE_MS = 360;
const PANOPTICON_WAKE_HALF_SHUT = 0.52;
const PANOPTICON_WAKE_BLINK_SHUT = 0.88;
const PANOPTICON_IDLE_COMMENT_MS = 10000;
const PANOPTICON_IDLE_COMMENT_CHANCE = 1;
const PANOPTICON_TAB_RETURN_MIN_MS = 500;

let catEyePhase = null;
let catEyeStart = 0;
let catEyeAudioEl = null;

let sleepStart = 0;
let wakeStart = 0;
let lidShutNow = 0;
let wakeFromShut = 1;
let panopticonAuxId = null;
let panopticonIdleCommentTimer = null;
let panopticonCommentTimeout = null;
let panopticonTabHiddenAt = 0;
let panopticonCodeSequenceActivePrev = false;

function isPanopticonGodModeCommentary() {
    return document.body.classList.contains('god-mode');
}

function isPanopticonCodeSequenceActive() {
    if (getCipherStage() > 0) return true;
    const hooks = globalThis.gardenHooks;
    if (hooks?.isKonamiActivelyEntering?.()) return true;
    if (hooks?.isPongArmingActive?.()) return true;
    if (hooks?.isPongSessionActive?.()) return true;
    if (godEyeSequence && godEyeSequence !== 'open') return true;
    return false;
}

function canShowPanopticonComment() {
    if (!gardenHasStarted || !panopticonEl?.classList.contains('visible')) return false;
    if (isPanopticonCodeSequenceActive()) return false;
    if (eyeMode === 'reroll' || eyeMode === 'waking') return false;
    if (document.body.classList.contains('pong-playing')) return false;
    if (document.hidden || isSingularityActive) return false;
    return true;
}

function canShowPanopticonIdleComment() {
    if (!canShowPanopticonComment()) return false;
    if (panopticonSleepWakeActive()) return false;
    return true;
}

function positionPanopticonComment() {
    if (!panopticonCommentEl || !panopticonEl) return;

    const eyeRect = panopticonEl.getBoundingClientRect();
    const boxW = panopticonCommentEl.offsetWidth || panopticonCommentEl.scrollWidth;
    const margin = 8;
    const left = eyeRect.left + eyeRect.width / 2 - boxW / 2;
    const clampedLeft = Math.max(margin, Math.min(left, window.innerWidth - boxW - margin));

    panopticonCommentEl.style.left = `${clampedLeft}px`;
    panopticonCommentEl.style.top = `${eyeRect.bottom + 10}px`;
}

function repositionVisiblePanopticonComment() {
    if (!panopticonCommentEl?.classList.contains('visible')) return;
    positionPanopticonComment();
}

let panopticonCommentViewportBound = false;

function bindPanopticonCommentViewportSync() {
    if (panopticonCommentViewportBound || !perf.isIOS) return;
    panopticonCommentViewportBound = true;
    const vv = window.visualViewport;
    if (!vv) return;
    vv.addEventListener('resize', repositionVisiblePanopticonComment);
    vv.addEventListener('scroll', repositionVisiblePanopticonComment);
    document.getElementById('ios-scroll-shell')?.addEventListener('scroll', repositionVisiblePanopticonComment, {
        passive: true,
    });
}

function playPanopticonCommentSfx() {
    playSoundOverlap(isPanopticonGodModeCommentary() ? sfx.echo : sfx.blip);
}

function showPanopticonIdleComment(text, ttlMs = 4400) {
    if (!panopticonCommentEl || !text || !canShowPanopticonIdleComment()) return;

    syncPanopticonCommentChrome();
    playPanopticonCommentSfx();
    panopticonCommentEl.textContent = text;
    panopticonCommentEl.classList.add('visible');
    panopticonCommentEl.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
        if (!panopticonCommentEl.classList.contains('visible')) return;
        positionPanopticonComment();
    });

    clearTimeout(panopticonCommentTimeout);
    panopticonCommentTimeout = setTimeout(() => hidePanopticonComment(), ttlMs);
}

export function showPanopticonComment(text, ttlMs = 4400) {
    if (!panopticonCommentEl || !text || !canShowPanopticonComment()) return;

    syncPanopticonCommentChrome();
    playPanopticonCommentSfx();
    panopticonCommentEl.textContent = text;
    panopticonCommentEl.classList.add('visible');
    positionPanopticonComment();
    panopticonCommentEl.setAttribute('aria-hidden', 'false');

    clearTimeout(panopticonCommentTimeout);
    panopticonCommentTimeout = setTimeout(() => hidePanopticonComment(), ttlMs);
}

const PANOPTICON_COMMENT_FADE_MS = 450;

export function hidePanopticonComment() {
    clearTimeout(panopticonCommentTimeout);
    if (!panopticonCommentEl) return;

    panopticonCommentEl.setAttribute('aria-hidden', 'true');
    if (!panopticonCommentEl.classList.contains('visible')) {
        panopticonCommentEl.classList.remove('panopticon-comment-god');
        return;
    }

    panopticonCommentEl.classList.remove('visible');

    const clearGodChrome = () => {
        panopticonCommentEl.classList.remove('panopticon-comment-god');
    };

    const onFadeEnd = (e) => {
        if (e.target !== panopticonCommentEl || e.propertyName !== 'opacity') return;
        panopticonCommentEl.removeEventListener('transitionend', onFadeEnd);
        clearTimeout(fadeFallback);
        clearGodChrome();
    };

    const fadeFallback = setTimeout(clearGodChrome, PANOPTICON_COMMENT_FADE_MS + 80);
    panopticonCommentEl.addEventListener('transitionend', onFadeEnd);
}

/** Hide idle/return bubbles when konami, pong, cipher, or god-eye sequences start. */
export function syncPanopticonCodeSequenceComments() {
    const active = isPanopticonCodeSequenceActive();
    if (active && !panopticonCodeSequenceActivePrev) {
        hidePanopticonComment();
        if (panopticonCommentEl) panopticonCommentEl.textContent = '';
    } else if (!active && panopticonCodeSequenceActivePrev) {
        if (!panopticonIdleCommentTimer) schedulePanopticonIdleCommentTimer();
    }
    panopticonCodeSequenceActivePrev = active;
}

function syncPanopticonCommentChrome() {
    if (!panopticonCommentEl) return;
    panopticonCommentEl.classList.toggle('panopticon-comment-god', isPanopticonGodModeCommentary());
}

function pickPanopticonIdleComment() {
    const pools = globalThis.lorePools;
    if (!pools) return null;
    if (isPanopticonGodModeCommentary()) {
        const god = pools.panopticonGodModeComments;
        return god?.length ? pickOne(god, []) : null;
    }
    const safe = pools.panopticonIdleCommentsSafe;
    if (!safe?.length) return null;
    return pickOne(safe, pools.panopticonIdleCommentsGritty || []);
}

function pickPanopticonReturnComment() {
    const pools = globalThis.lorePools;
    if (!pools) return 'missed me?';
    if (isPanopticonGodModeCommentary()) {
        const god = pools.panopticonGodModeComments;
        return god?.length ? pickOne(god, []) : 'YOU HAVE RETURNED TO THE THRESHOLD';
    }
    const safe = pools.panopticonReturnCommentsSafe;
    if (!safe?.length) return 'missed me?';
    return pickOne(safe, pools.panopticonReturnCommentsGritty || []);
}

function clearPanopticonIdleCommentTimer() {
    clearTimeout(panopticonIdleCommentTimer);
    panopticonIdleCommentTimer = null;
}

export function startPanopticonIdleComments() {
    bindPanopticonCommentViewportSync();
    resetPanopticonIdleCommentTimer();
}

function schedulePanopticonIdleCommentTimer() {
    clearPanopticonIdleCommentTimer();

    if (!gardenHasStarted) return;

    panopticonIdleCommentTimer = setTimeout(() => {
        syncPanopticonCodeSequenceComments();
        if (!isPanopticonCodeSequenceActive() && canShowPanopticonIdleComment()) {
            if (Math.random() < PANOPTICON_IDLE_COMMENT_CHANCE) {
                const text = pickPanopticonIdleComment();
                if (text) showPanopticonIdleComment(text);
            }
        }

        schedulePanopticonIdleCommentTimer();
    }, PANOPTICON_IDLE_COMMENT_MS);
}

export function resetPanopticonIdleCommentTimer() {
    syncPanopticonCodeSequenceComments();
    schedulePanopticonIdleCommentTimer();
}

export function handlePanopticonVisibilityChange(hidden) {
    if (hidden) {
        panopticonTabHiddenAt = performance.now();
        hidePanopticonComment();
        return;
    }

    if (!gardenHasStarted || !panopticonTabHiddenAt) return;

    const awayMs = performance.now() - panopticonTabHiddenAt;
    panopticonTabHiddenAt = 0;
    if (awayMs < PANOPTICON_TAB_RETURN_MIN_MS) return;

    const text = pickPanopticonReturnComment();
    requestAnimationFrame(() => {
        if (canShowPanopticonComment()) showPanopticonComment(text);
    });
}

function panopticonSleepWakeActive() {
    return eyeMode === 'sleeping' || eyeMode === 'waking';
}

function cancelPanopticonAuxLoop() {
    if (panopticonAuxId != null) {
        cancelAnimationFrame(panopticonAuxId);
        panopticonAuxId = null;
    }
}

function schedulePanopticonAuxLoop() {
    if (panopticonAuxId != null) return;

    const frame = () => {
        panopticonAuxId = null;
        if (!panopticonSleepWakeActive()) return;

        updatePanopticonVisibility();
        if (!animatePanopticonGodEye(performance.now())) {
            updatePanopticonSleepWake(performance.now());
        }

        if (panopticonSleepWakeActive()) {
            panopticonAuxId = requestAnimationFrame(frame);
        }
    };

    panopticonAuxId = requestAnimationFrame(frame);
}

function panopticonSleepCloseMs() {
    return perf.prefersReducedMotion ? 300 : PANOPTICON_GOD_CLOSE_MS;
}

function panopticonWakeTimings() {
    const rm = perf.prefersReducedMotion;
    return {
        peekMs: rm ? 280 : PANOPTICON_WAKE_PEEK_MS,
        blinkMs: rm ? 480 : PANOPTICON_WAKE_BLINK_MS,
        yawnMs: rm ? 320 : PANOPTICON_WAKE_YAWN_MS,
        settleMs: rm ? 180 : PANOPTICON_WAKE_SETTLE_MS,
    };
}

function applyPanopticonSleepVisual(shut, breatheY = 0) {
    const clamped = Math.max(0, Math.min(1, shut));
    applyPanopticonLidShut(clamped);
    if (panopticonInnerEl) {
        panopticonInnerEl.style.transform = breatheY ? `translateY(${breatheY}px)` : '';
    }
}

/** Round-cap arch for yawn (single smooth curve, same stroke/fill as normal lid). */
function panopticonYawnArchPath(intensity) {
    const k = smoothstep(Math.max(0, Math.min(1, intensity)));
    if (k < 0.001) return PANOPTICON_LID_CLOSED;

    const rise = k * 26;
    const yMid = 50;
    const yPeak = yMid - rise;
    const yLower = yMid + 3 + k * 5;
    return `M 8 ${yMid} C 26 ${yPeak}, 74 ${yPeak}, 92 ${yMid} C 74 ${yLower}, 26 ${yLower}, 8 ${yMid} Z`;
}

function applyPanopticonSocketPath(path, gazeStrength = 0) {
    panopticonLidEl?.setAttribute('d', path);

    if (path === PANOPTICON_LID_CLOSED) {
        panopticonClipPathEl?.setAttribute('d', 'M 8 50 L 92 50 L 92 50 L 8 50 Z');
        if (panopticonGazeEl) panopticonGazeEl.style.opacity = '0';
        return;
    }

    panopticonClipPathEl?.setAttribute('d', path);
    if (panopticonGazeEl) {
        panopticonGazeEl.style.opacity = String(Math.min(1, Math.max(0, gazeStrength)));
    }
}

function applyPanopticonYawnShape(progress) {
    const p = Math.max(0, Math.min(1, progress));

    if (p < 0.28) {
        const shut = PANOPTICON_WAKE_HALF_SHUT + (1 - PANOPTICON_WAKE_HALF_SHUT) * smoothstep(p / 0.28);
        lidShutNow = shut;
        applyPanopticonLidShut(shut);
        if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
        return;
    }

    if (p < 0.72) {
        const archPhase = (p - 0.28) / 0.44;
        const intensity = Math.sin(Math.PI * archPhase);
        const path = panopticonYawnArchPath(intensity);
        lidShutNow = 1 - intensity * 0.82;
        applyPanopticonSocketPath(path, intensity * 0.45);
        if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
        return;
    }

    const shut = 1 - smoothstep((p - 0.72) / 0.28) * (1 - PANOPTICON_WAKE_HALF_SHUT);
    lidShutNow = shut;
    applyPanopticonLidShut(shut);
    if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
}

function easePanopticonWakeGaze() {
    panopticonGazeX += (0 - panopticonGazeX) * 0.18;
    panopticonGazeY += (0 - panopticonGazeY) * 0.18;
    panopticonGazeEl?.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);
}

let panopticonGodActive = false;
let godEyeSequence = null;
let godEyeSeqStart = 0;
let godSymbolBag = null;
let godSymbolTick = 0;

function resetGodSymbolBag() {
    godSymbolBag = createBag(ICO_SYMBOLS);
}

function drawGodSymbol() {
    if (!godSymbolBag) resetGodSymbolBag();
    return godSymbolBag();
}

const PANOPTICON_MAX_GAZE = 14;
const PANOPTICON_REROLL_MS = 2800;
let panopticonTargetX = 0;
let panopticonTargetY = 0;
let panopticonGazeX = 0;
let panopticonGazeY = 0;
let rerollStart = 0;
let rerollUntil = 0;
let rerollSettleTarget = 0;
let angularVelocity = 0;
let rerollInitialVelocity = 0;
let rerollPhase = 'active';
let landStart = 0;
let landFromAngle = 0;
let landFromGazeX = 0;
let landFromGazeY = 0;

const PANOPTICON_LAND_MS = 500;
const PANOPTICON_EYEROLL_MS = 1300;
const PANOPTICON_STARE_MS = 2500;
let eyerollStart = 0;
let eyerollFromX = 0;
let eyerollFromY = 0;
let stareStart = 0;
let stareFromX = 0;
let stareFromY = 0;

function normalizeMod360(angle) {
    return ((angle % 360) + 360) % 360;
}

function nearestHorizontal(angle) {
    return Math.round(angle / 360) * 360;
}

function smoothstep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
}

function rerollWobbleEnvelope(elapsedSec, durationSec, speedNorm) {
    const rampOut = smoothstep(Math.max(0, (durationSec - elapsedSec) / 0.65));
    const inertiaBlend = 0.45 + (1 - speedNorm) * 0.55;
    return inertiaBlend * rampOut;
}

function applyPanopticonGazeEase() {
    const ease = perf.prefersReducedMotion ? 0.08 : 0.14;
    panopticonGazeX += (panopticonTargetX - panopticonGazeX) * ease;
    panopticonGazeY += (panopticonTargetY - panopticonGazeY) * ease;
    panopticonGazeEl?.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);
}

function setPanopticonCursor(clientX, clientY) {
    if (!panopticonEl || !panopticonEl.classList.contains('visible')) return;
    if (eyeMode !== 'idle' && eyeMode !== 'eyeroll' && eyeMode !== 'stare') return;

    const rect = panopticonInnerEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const influence = Math.min(len / (Math.min(window.innerWidth, window.innerHeight) * 0.4), 1);
    const maxGaze = perf.prefersReducedMotion ? PANOPTICON_MAX_GAZE * 0.45 : PANOPTICON_MAX_GAZE;

    panopticonTargetX = (dx / len) * maxGaze * influence;
    panopticonTargetY = (dy / len) * maxGaze * influence;
}

if (panopticonEl) {
    window.addEventListener('mousemove', (e) => setPanopticonCursor(e.clientX, e.clientY));
    const onTouchGaze = (e) => {
        const t = e.touches?.[0];
        if (t) setPanopticonCursor(t.clientX, t.clientY);
    };
    window.addEventListener('touchstart', onTouchGaze, { passive: true });
    window.addEventListener('touchmove', onTouchGaze, { passive: true });
}

function enterPanopticonReroll() {
    cancelPanopticonCatEye();
    const mod = normalizeMod360(eyeAngle);
    const minSpins = perf.prefersReducedMotion ? 2 : 3;
    const extraSpins = perf.prefersReducedMotion ? 0 : Math.floor(Math.random() * 2);
    const toHorizontal = mod === 0 ? 0 : 360 - mod;
    rerollSettleTarget = nearestHorizontal(eyeAngle + toHorizontal + (minSpins + extraSpins) * 360);

    angularVelocity = perf.prefersReducedMotion ? 16 : 24 + Math.random() * 8;
    rerollInitialVelocity = angularVelocity;
    rerollPhase = 'active';

    eyeMode = 'reroll';
    rerollStart = performance.now();
    rerollUntil = rerollStart + (perf.prefersReducedMotion ? 1600 : PANOPTICON_REROLL_MS);

    panopticonEl?.classList.remove('flash-anim', 'dizzy');
    if (panopticonEl) {
        void panopticonEl.offsetWidth;
        panopticonEl.classList.add('flash-anim', 'dizzy');
    }
}

export function triggerPanopticonReroll() {
    if (!panopticonEl) return;
    enterPanopticonReroll();
}

export function triggerPanopticonEyeRoll() {
    if (!panopticonEl || !panopticonGazeEl) return;
    if (eyeMode === 'reroll') return;

    eyerollFromX = panopticonGazeX;
    eyerollFromY = panopticonGazeY;
    eyerollStart = performance.now();
    eyeMode = 'eyeroll';
}

export function triggerPanopticonCenterStare() {
    if (!panopticonEl || !panopticonGazeEl) return;
    if (eyeMode === 'reroll') return;

    stareFromX = panopticonGazeX;
    stareFromY = panopticonGazeY;
    stareStart = performance.now();
    eyeMode = 'stare';
}

export function triggerPanopticonSleep() {
    if (!panopticonEl) return;
    updatePanopticonVisibility();
    if (!panopticonEl.classList.contains('visible')) return;
    if (panopticonGodActive || godEyeSequence) return;
    if (eyeMode === 'reroll' || eyeMode === 'sleeping') return;
    cancelPanopticonCatEye();
    hidePanopticonComment();
    eyeMode = 'sleeping';
    const closeMs = panopticonSleepCloseMs();
    sleepStart = document.hidden ? performance.now() - closeMs : performance.now();
    panopticonEl.classList.add('panopticon-sleeping');
    schedulePanopticonAuxLoop();
    updatePanopticonSleepWake(performance.now());
}

export function triggerPanopticonWake() {
    if (!panopticonEl) return;
    if (eyeMode !== 'sleeping') return;
    resetPanopticonIdleCommentTimer();
    wakeFromShut = lidShutNow;
    eyeMode = 'waking';
    wakeStart = performance.now();
    schedulePanopticonAuxLoop();
    updatePanopticonSleepWake(performance.now());
}

function onCatEyeAudioEnded() {
    if (catEyePhase !== 'hold') return;
    catEyePhase = 'out';
    catEyeStart = performance.now();
    catEyeAudioEl = null;
}

export function triggerPanopticonCatEye(audioEl = null) {
    if (!panopticonEl?.classList.contains('visible')) return;
    if (godEyeSequence || panopticonGodActive) return;
    if (eyeMode === 'reroll') return;

    if (catEyeAudioEl && catEyeAudioEl !== audioEl) {
        catEyeAudioEl.removeEventListener('ended', onCatEyeAudioEnded);
    }
    catEyeAudioEl = audioEl || null;
    if (catEyeAudioEl) {
        catEyeAudioEl.addEventListener('ended', onCatEyeAudioEnded, { once: true });
    }

    catEyePhase = 'in';
    catEyeStart = performance.now();
}

export function updatePanopticonVisibility() {
    if (!panopticonEl) return;

    const singularity = document.getElementById('singularity-overlay');
    const boss = document.getElementById('boss-key-overlay');
    const hidden = singularity?.style.display === 'flex' || boss?.classList.contains('active');
    panopticonEl.classList.toggle('visible', gardenHasStarted && !hidden);
}

function horizontalOffset(angle) {
    const mod = normalizeMod360(angle);
    return mod > 180 ? mod - 360 : mod;
}

function finishPanopticonReroll() {
    eyeMode = 'idle';
    eyeAngle = 0;
    angularVelocity = 0;
    rerollPhase = 'active';
    panopticonEl?.classList.remove('dizzy', 'flash-anim');
    if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
    panopticonGazeX += (panopticonTargetX - panopticonGazeX) * 0.2;
    panopticonGazeY += (panopticonTargetY - panopticonGazeY) * 0.2;
}

function beginPanopticonLand(displayAngle, gazeX, gazeY) {
    rerollPhase = 'land';
    landStart = performance.now();
    landFromAngle = horizontalOffset(displayAngle);
    landFromGazeX = gazeX;
    landFromGazeY = gazeY;
    angularVelocity = 0;
}

function syncPanopticonRainbow() {
    if (!panopticonRainbowGradEl) return;
    const offset = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--rainbow-offset')
    ) || 0;
    const cycle = (offset / 2) % 100;
    panopticonRainbowGradEl.setAttribute('gradientTransform', `translate(${-cycle}, 0)`);
}

function panopticonLidPath(shut) {
    if (shut >= 0.98) return PANOPTICON_LID_CLOSED;

    const yTop = 12 + 38 * shut;
    const yBot = 88 - 38 * shut;
    return `M 8 50 C 28 ${yTop}, 72 ${yTop}, 92 50 C 72 ${yBot}, 28 ${yBot}, 8 50 Z`;
}

function setPanopticonScaleAtCenter(el, sx, sy, cx = 50, cy = 50) {
    if (!el) return;

    if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) {
        el.removeAttribute('transform');
        return;
    }

    el.setAttribute('transform', `translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
}

function resetPanopticonCatMorph() {
    panopticonIrisOuterEl?.removeAttribute('transform');
    panopticonIrisMidEl?.removeAttribute('transform');
    panopticonPupilEl?.removeAttribute('transform');
    panopticonIrisOuterEl?.style.removeProperty('opacity');
    panopticonIrisMidEl?.style.removeProperty('opacity');
}

function applyPanopticonCatMorph(morph) {
    const m = Math.max(0, Math.min(1, morph));

    if (m <= 0.001) {
        resetPanopticonCatMorph();
        return;
    }

    setPanopticonScaleAtCenter(panopticonIrisOuterEl, 1 - m * 0.48, 1 + m * 0.18);
    setPanopticonScaleAtCenter(panopticonIrisMidEl, 1 - m * 0.58, 1 + m * 0.42);
    setPanopticonScaleAtCenter(panopticonPupilEl, 1 - m * 0.68, 1 + m * 2.8);

    if (panopticonIrisOuterEl) {
        panopticonIrisOuterEl.style.opacity = String(0.55 * (1 - m));
    }
    if (panopticonIrisMidEl) {
        panopticonIrisMidEl.style.opacity = String(0.85 * (1 - m));
    }
}

function cancelPanopticonCatEye() {
    if (catEyeAudioEl) {
        catEyeAudioEl.removeEventListener('ended', onCatEyeAudioEnded);
        catEyeAudioEl = null;
    }
    catEyePhase = null;
    resetPanopticonCatMorph();
}

function animatePanopticonCatEye(now) {
    if (!catEyePhase) return;

    const morphMs = perf.prefersReducedMotion ? 280 : PANOPTICON_CAT_MORPH_MS;
    const holdMs = perf.prefersReducedMotion ? 520 : PANOPTICON_CAT_HOLD_MS;
    const elapsed = now - catEyeStart;

    if (catEyePhase === 'in') {
        applyPanopticonCatMorph(elapsed / morphMs);
        if (elapsed >= morphMs) {
            catEyePhase = 'hold';
            catEyeStart = now;
        }
        return;
    }

    if (catEyePhase === 'hold') {
        applyPanopticonCatMorph(1);
        if (catEyeAudioEl) {
            const d = catEyeAudioEl.duration;
            if (
                catEyeAudioEl.ended
                || (Number.isFinite(d) && d > 0 && catEyeAudioEl.currentTime >= d - 0.05)
                || elapsed > 15000
            ) {
                onCatEyeAudioEnded();
            }
            return;
        }
        if (elapsed >= holdMs) {
            catEyePhase = 'out';
            catEyeStart = now;
        }
        return;
    }

    if (catEyePhase === 'out') {
        applyPanopticonCatMorph(1 - smoothstep(Math.min(1, elapsed / morphMs)));
        if (elapsed >= morphMs) cancelPanopticonCatEye();
    }
}

function resetPanopticonLidGeometry() {
    cancelPanopticonCatEye();
    cancelPanopticonAuxLoop();
    panopticonEl?.classList.remove('panopticon-sleeping');
    lidShutNow = 0;
    panopticonLidEl?.setAttribute('d', PANOPTICON_LID_OPEN);
    panopticonClipPathEl?.setAttribute('d', PANOPTICON_LID_OPEN);
    if (panopticonGazeEl) panopticonGazeEl.style.opacity = '1';
    if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
}

function applyPanopticonLidShut(shut) {
    const path = panopticonLidPath(shut);
    panopticonLidEl?.setAttribute('d', path);

    if (shut >= 0.98) {
        panopticonClipPathEl?.setAttribute('d', 'M 8 50 L 92 50 L 92 50 L 8 50 Z');
        if (panopticonGazeEl) panopticonGazeEl.style.opacity = '0';
        return;
    }

    panopticonClipPathEl?.setAttribute('d', path);
    if (panopticonGazeEl) {
        const fade = shut <= 0.45 ? 1 : 1 - smoothstep((shut - 0.45) / 0.4);
        panopticonGazeEl.style.opacity = String(fade);
    }
}

function resetPanopticonGodStyling() {
    panopticonEl?.classList.remove('god-active', 'god-rainbow');
    if (panopticonPupilEl) panopticonPupilEl.style.display = '';
    if (panopticonGodPupilEl) panopticonGodPupilEl.style.display = 'none';
}

function resetPanopticonNormalPupil() {
    resetPanopticonGodStyling();
    resetPanopticonLidGeometry();
}

function enablePanopticonGodPupil() {
    panopticonEl?.classList.add('god-active', 'god-rainbow');
    if (panopticonPupilEl) panopticonPupilEl.style.display = 'none';
    if (panopticonGodPupilEl) {
        panopticonGodPupilEl.textContent = drawGodSymbol();
        panopticonGodPupilEl.style.display = 'block';
    }
}

export function setPanopticonGodMode(active) {
    if (active) {
        cancelPanopticonCatEye();
        panopticonGodActive = true;
        godEyeSequence = 'closing';
        godEyeSeqStart = performance.now();
        resetGodSymbolBag();
        godSymbolTick = 0;
        syncPanopticonCodeSequenceComments();
        return;
    }

    panopticonGodActive = false;
    if (godEyeSequence === 'open') {
        godEyeSequence = 'deactivating';
        godEyeSeqStart = performance.now();
        syncPanopticonCodeSequenceComments();
        return;
    }

    resetPanopticonNormalPupil();
    godEyeSequence = null;
    syncPanopticonCodeSequenceComments();
}

function animatePanopticonGodEye(now) {
    if (!godEyeSequence || !panopticonEl) return false;

    const closeMs = perf.prefersReducedMotion ? 300 : PANOPTICON_GOD_CLOSE_MS;
    const holdMs = perf.prefersReducedMotion ? 140 : PANOPTICON_GOD_HOLD_MS;
    const openMs = perf.prefersReducedMotion ? 300 : PANOPTICON_GOD_OPEN_MS;
    const elapsed = now - godEyeSeqStart;

    syncPanopticonRainbow();
    panopticonInnerEl.style.transform = '';

    if (godEyeSequence === 'closing') {
        const shut = smoothstep(Math.min(1, elapsed / closeMs));
        applyPanopticonLidShut(shut);
        applyPanopticonGazeEase();

        if (elapsed >= closeMs) {
            panopticonEl.classList.add('god-rainbow');
            godEyeSequence = 'closed';
            godEyeSeqStart = now;
        }
        return true;
    }

    if (godEyeSequence === 'closed') {
        applyPanopticonLidShut(1);
        panopticonEl.classList.add('god-rainbow');
        applyPanopticonGazeEase();

        if (elapsed >= holdMs) {
            godEyeSequence = 'opening';
            godEyeSeqStart = now;
        }
        return true;
    }

    if (godEyeSequence === 'opening') {
        const shut = 1 - smoothstep(Math.min(1, elapsed / openMs));
        applyPanopticonLidShut(shut);
        panopticonEl.classList.add('god-rainbow');
        applyPanopticonGazeEase();

        if (elapsed >= openMs) {
            enablePanopticonGodPupil();
            godEyeSequence = 'open';
            godSymbolTick = now;
        }
        return true;
    }

    if (godEyeSequence === 'open' && panopticonGodActive) {
        applyPanopticonLidShut(0);
        syncPanopticonRainbow();

        if (now - godSymbolTick >= (perf.prefersReducedMotion ? 380 : PANOPTICON_GOD_SYMBOL_MS)) {
            if (panopticonGodPupilEl) {
                panopticonGodPupilEl.textContent = drawGodSymbol();
            }
            godSymbolTick = now;
        }

        applyPanopticonGazeEase();
        return true;
    }

    if (godEyeSequence === 'deactivating') {
        if (elapsed < closeMs) {
            const shut = smoothstep(elapsed / closeMs);
            applyPanopticonLidShut(shut);
            applyPanopticonGazeEase();
            return true;
        }

        if (elapsed < closeMs + holdMs) {
            applyPanopticonLidShut(1);
            resetPanopticonGodStyling();
            applyPanopticonGazeEase();
            return true;
        }

        const openElapsed = elapsed - closeMs - holdMs;
        const shut = 1 - smoothstep(Math.min(1, openElapsed / openMs));
        applyPanopticonLidShut(shut);
        applyPanopticonGazeEase();

        if (openElapsed >= openMs) {
            resetPanopticonNormalPupil();
            godEyeSequence = null;
        }
        return true;
    }

    return false;
}

/** @returns {boolean} true when sleep/wake consumed this frame */
function updatePanopticonSleepWake(now) {
    if (!panopticonGazeEl || !panopticonInnerEl) return false;

    if (eyeMode === 'sleeping') {
        const closeMs = panopticonSleepCloseMs();
        const elapsed = now - sleepStart;

        if (elapsed >= closeMs) {
            lidShutNow = 1;
            applyPanopticonLidShut(1);
            if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
            return true;
        }

        const shut = smoothstep(elapsed / closeMs);
        lidShutNow = shut;
        applyPanopticonLidShut(shut);
        if (panopticonInnerEl) panopticonInnerEl.style.transform = '';
        return true;
    }

    if (eyeMode === 'waking') {
        const elapsed = now - wakeStart;
        const { peekMs, blinkMs, yawnMs, settleMs } = panopticonWakeTimings();
        easePanopticonWakeGaze();

        if (elapsed < peekMs) {
            const t = smoothstep(elapsed / peekMs);
            const shut = wakeFromShut + (PANOPTICON_WAKE_HALF_SHUT - wakeFromShut) * t;
            lidShutNow = shut;
            applyPanopticonSleepVisual(shut);
            return true;
        }

        const blinkElapsed = elapsed - peekMs;
        if (blinkElapsed < blinkMs) {
            const wave = Math.abs(Math.sin((blinkElapsed / blinkMs) * PANOPTICON_WAKE_BLINK_COUNT * Math.PI));
            const shut = PANOPTICON_WAKE_HALF_SHUT
                + (PANOPTICON_WAKE_BLINK_SHUT - PANOPTICON_WAKE_HALF_SHUT) * wave;
            lidShutNow = shut;
            applyPanopticonSleepVisual(shut);
            return true;
        }

        const yawnElapsed = blinkElapsed - blinkMs;
        if (yawnElapsed < yawnMs) {
            applyPanopticonYawnShape(yawnElapsed / yawnMs);
            return true;
        }

        const settleElapsed = yawnElapsed - yawnMs;
        if (settleElapsed < settleMs) {
            const shut = PANOPTICON_WAKE_HALF_SHUT * (1 - smoothstep(settleElapsed / settleMs));
            lidShutNow = shut;
            applyPanopticonSleepVisual(shut);
            return true;
        }

        lidShutNow = 0;
        applyPanopticonSleepVisual(0);
        eyeMode = 'idle';
        panopticonEl?.classList.remove('panopticon-sleeping');
        cancelPanopticonAuxLoop();
        if (!panopticonIdleCommentTimer) schedulePanopticonIdleCommentTimer();
        return true;
    }

    return false;
}

export function animatePanopticon() {
    if (!panopticonGazeEl || !panopticonInnerEl) return;

    updatePanopticonVisibility();
    if (!panopticonEl?.classList.contains('visible')) return;

    if (panopticonEl.classList.contains('god-rainbow')) {
        syncPanopticonRainbow();
    }

    if (animatePanopticonGodEye(performance.now())) return;

    if (updatePanopticonSleepWake(performance.now())) return;

    if (panopticonEl.classList.contains('pong-active')) return;

    animatePanopticonCatEye(performance.now());

    if (eyeMode === 'eyeroll') {
        const elapsed = performance.now() - eyerollStart;
        const duration = perf.prefersReducedMotion ? 900 : PANOPTICON_EYEROLL_MS;
        const p = Math.min(1, elapsed / duration);
        const rollTargetX = 5;
        const rollTargetY = -14;

        let towardRoll = 0;
        if (p <= 0.38) towardRoll = smoothstep(p / 0.38);
        else if (p <= 0.58) towardRoll = 1;
        else towardRoll = 1 - smoothstep((p - 0.58) / 0.42);

        const rolledX = eyerollFromX + (rollTargetX - eyerollFromX) * towardRoll;
        const rolledY = eyerollFromY + (rollTargetY - eyerollFromY) * towardRoll;
        const returnT = p > 0.58 ? smoothstep((p - 0.58) / 0.42) : 0;

        panopticonGazeX = rolledX + (panopticonTargetX - rolledX) * returnT;
        panopticonGazeY = rolledY + (panopticonTargetY - rolledY) * returnT;
        panopticonInnerEl.style.transform = '';
        panopticonGazeEl.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);

        if (p >= 1) eyeMode = 'idle';
        return;
    }

    if (eyeMode === 'stare') {
        const elapsed = performance.now() - stareStart;
        const duration = perf.prefersReducedMotion ? 1800 : PANOPTICON_STARE_MS;
        const arriveT = smoothstep(Math.min(1, elapsed / 320));
        const leaveStart = duration * 0.62;
        const leaveT = elapsed > leaveStart ? smoothstep((elapsed - leaveStart) / (duration - leaveStart)) : 0;

        if (leaveT === 0) {
            panopticonGazeX = stareFromX * (1 - arriveT);
            panopticonGazeY = stareFromY * (1 - arriveT);
        } else {
            panopticonGazeX = panopticonTargetX * leaveT;
            panopticonGazeY = panopticonTargetY * leaveT;
        }

        panopticonInnerEl.style.transform = '';
        panopticonGazeEl.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);

        if (elapsed >= duration) eyeMode = 'idle';
        return;
    }

    if (eyeMode === 'reroll') {
        const now = performance.now();

        if (rerollPhase === 'land') {
            const landMs = perf.prefersReducedMotion ? 320 : PANOPTICON_LAND_MS;
            const landT = smoothstep((now - landStart) / landMs);
            const angle = landFromAngle * (1 - landT);

            panopticonInnerEl.style.transform = landT < 1 ? `rotate(${angle}deg)` : '';
            panopticonGazeX = landFromGazeX * (1 - landT);
            panopticonGazeY = landFromGazeY * (1 - landT);
            panopticonGazeEl.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);

            if (landT >= 1) finishPanopticonReroll();
            return;
        }

        const elapsed = now - rerollStart;
        const duration = rerollUntil - rerollStart;
        const t = elapsed / 1000;
        const durationSec = duration / 1000;

        eyeAngle += angularVelocity;
        angularVelocity *= perf.prefersReducedMotion ? 0.965 : 0.978;

        const speedNorm = rerollInitialVelocity > 0
            ? Math.min(1, Math.abs(angularVelocity) / rerollInitialVelocity)
            : 0;
        const envelope = rerollWobbleEnvelope(t, durationSec, speedNorm);

        const settleT = speedNorm < 0.1 && elapsed > duration * 0.4
            ? smoothstep((elapsed - duration * 0.4) / (duration * 0.6))
            : 0;
        const baseAngle = eyeAngle + (rerollSettleTarget - eyeAngle) * settleT * 0.15;

        const wobbleDeg =
            Math.sin(t * 8.5) * 13 * envelope +
            Math.sin(t * 12.8) * 5.5 * envelope +
            angularVelocity * 1.25;
        const displayAngle = baseAngle + wobbleDeg;
        panopticonInnerEl.style.transform = `rotate(${displayAngle}deg)`;

        const wobbleX = (Math.sin(t * 11.2) * 7.5 + Math.cos(t * 7.8) * 5) * envelope;
        const wobbleY = (Math.cos(t * 9.8) * 7.5 + Math.sin(t * 7.1) * 5) * envelope;
        const gazeEase = perf.prefersReducedMotion ? 0.08 : 0.11;
        panopticonGazeX += (0 - panopticonGazeX) * gazeEase;
        panopticonGazeY += (0 - panopticonGazeY) * gazeEase;
        const gazeX = panopticonGazeX + wobbleX;
        const gazeY = panopticonGazeY + wobbleY;
        panopticonGazeEl.setAttribute('transform', `translate(${gazeX}, ${gazeY})`);

        const readyToLand = elapsed > 700 && Math.abs(angularVelocity) < 0.4;
        const timedOut = now >= rerollUntil;

        if (readyToLand || timedOut) {
            beginPanopticonLand(displayAngle, gazeX, gazeY);
        }
        return;
    }

    panopticonInnerEl.style.transform = '';
    applyPanopticonGazeEase();
}

export function playPrevTrack() {
    stopBgmTrack(currentTrackIndex);
    currentTrackIndex = wrapTrackIndex(currentTrackIndex - 1);
    playCurrentBgmTrack();
}

export function playNextTrack() {
    stopBgmTrack(currentTrackIndex);
    currentTrackIndex = wrapTrackIndex(currentTrackIndex + 1);
    playCurrentBgmTrack();
}

export function resetBgmToStart() {
    currentTrackIndex = 0;
    playCurrentBgmTrack();
}
