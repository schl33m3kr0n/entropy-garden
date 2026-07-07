/** BGM playlist, buffering, marquee, and transport controls. */
import { musicPath } from '../dom/media.js';

function createBgmAudio(file) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = musicPath(file);
    return audio;
}
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
    { title: '7am', artist: 'Adrian' },
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

/** Warm current + adjacent playlist tracks during the boot loader (not the whole rotation). */
export function prefetchLargeBgmTracks() {
    prefetchAdjacentBgmBuffers(currentTrackIndex);
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
    globalThis.markPlaylistPlayingIntent?.();
}

/** Pause current track and cancel any in-flight async play attempt. */
export function pauseCurrentBgmTrack() {
    nextBgmPlayGeneration();
    const track = getBgmTrack(currentTrackIndex);
    track.pause();
    globalThis.markPlaylistPausedIntent?.();
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
