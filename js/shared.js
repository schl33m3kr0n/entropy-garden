// Shared utilities, audio, perf, canvas
import {
    gardenHasStarted,
    gardenLoopActive,
    singularityAnimId,
    isCorrupted,
} from './state.js';

export { gardenHasStarted, gardenLoopActive, singularityAnimId, isCorrupted };

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
};

export const BGM_TRACKS = [
    'init.mp3',
    'ambient2.mp3',
    'ambient3.mp3',
    'ambient4.mp3',
    'ambient5.mp3',
    'ambient6.mp3',
    'ambient7.mp3',
    'playboi carti - 7am (slowed reverb).mp3',
    'ambient8.mp3',
    '13 angels.mp3',
    'fractals.mp3',
];

/** Parallel to BGM_TRACKS — display artist + title. */
export const BGM_TRACK_INFO = [
    { title: 'Hightech Data', artist: 'Alex_Jauk' },
    { title: 'Ambient arp', artist: 'freesound_community' },
    { title: 'ambient dream', artist: 'freesound_community' },
    { title: 'Ambient Soundscape - Glitch Bells', artist: 'GregorQuendel' },
    { title: 'Space Ambient', artist: 'leberch' },
    { title: 'Preparing for the Uncertain', artist: 'Grand_Project' },
    { title: 'Ambient', artist: 'leberch' },
    { title: '7am (slowed + reverb)', artist: 'Adrian' },
    { title: 'Cybernetic Night (Sci-Fi Ambient)', artist: 'KonstantinPazuzuStudio' },
    { title: "13 Angels Standing Guard 'Round The Side Of Your Bed", artist: 'A Silver Mt. Zion' },
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
    ]);
    bgmCache.forEach((track, index) => {
        if (keep.has(index)) return;
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

const BGM_LARGE_FILES = new Set([
    'ambient3.mp3',
    'ambient5.mp3',
    'ambient8.mp3',
    '13 angels.mp3',
    'fractals.mp3',
    'playboi carti - 7am (slowed reverb).mp3',
]);

function isLargeBgmTrack(track) {
    const src = track.currentSrc || track.src || '';
    return BGM_LARGE_FILES.has(decodeURIComponent(src.split('/').pop() || ''));
}

/** Wait for buffer (large tracks) before play(); retry on autoplay/block. */
function playBgmWhenReady(track, generation, retriesLeft = 4, fileName = '') {
    if (generation !== bgmPlayGeneration) return;

    const large = isLargeBgmTrack(track) || (fileName && BGM_LARGE_FILES.has(fileName));
    const minReady = large
        ? HTMLMediaElement.HAVE_FUTURE_DATA
        : HTMLMediaElement.HAVE_CURRENT_DATA;

    const startPlayback = () => {
        if (generation !== bgmPlayGeneration) return;
        track.volume = 0.3;
        track.play().catch(() => {
            if (generation !== bgmPlayGeneration || retriesLeft <= 0) return;
            setTimeout(() => playBgmWhenReady(track, generation, retriesLeft - 1), 250);
        });
    };

    const onReady = () => {
        cleanup();
        startPlayback();
    };
    const onError = () => {
        cleanup();
        if (generation !== bgmPlayGeneration || retriesLeft <= 0) return;
        const file = fileName || BGM_TRACKS[wrapTrackIndex(currentTrackIndex)];
        if (!track.src && file) track.src = musicPath(file);
        track.load();
        playBgmWhenReady(track, generation, retriesLeft - 1, fileName);
    };
    const onStalled = () => {
        if (generation !== bgmPlayGeneration) return;
        if (track.readyState < minReady) track.load();
    };
    const cleanup = () => {
        clearTimeout(waitTimeout);
        track.removeEventListener('canplaythrough', onReady);
        track.removeEventListener('canplay', onReady);
        track.removeEventListener('error', onError);
        track.removeEventListener('stalled', onStalled);
    };

    if (track.readyState >= minReady) {
        startPlayback();
        return;
    }

    const waitTimeout = setTimeout(() => {
        if (generation !== bgmPlayGeneration) return;
        if (track.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            cleanup();
            startPlayback();
        }
    }, large ? 90_000 : 20_000);

    track.addEventListener('canplaythrough', onReady, { once: true });
    track.addEventListener('canplay', onReady, { once: true });
    track.addEventListener('error', onError, { once: true });
    track.addEventListener('stalled', onStalled);
    const file = fileName || BGM_TRACKS[wrapTrackIndex(currentTrackIndex)];
    if (!track.src && file) track.src = musicPath(file);
    if (track.readyState === 0 || track.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        track.load();
    }
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
    preloadBgmTrack(i);
    preloadBgmTrack(currentTrackIndex + 1);
    preloadBgmTrack(currentTrackIndex - 1);
    playBgmWhenReady(track, generation, 4, BGM_TRACKS[i]);
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

// Hebrew aleph-bet + finals + geresh/gershayim/maqaf (cipher wheels).
const HEBREW_CIPHER_CHARS = 'אבגדהוזחטיכךלמםנןסעפףצץקרשת׳״־';

const FULL_MATRIX_CHARS =
    'ÆÐÞǷȜƩƱƲƷƸƎƔƜɅꜲꜨꜬꜮꜴꜶꝎꝠꝏꟄꟿƁƇƊƑƓƘƤƬƳȡȴȶɁɃɆɎ∑∫∆∞≈µ¥£€¢±×÷∂∇∏√∝∠∧∨∩∪∴∵∼≅≠≤≥⊂⊃⊆⊇⊕⊗⊥─□△▽◇○◎★☆♪♀♂☼ϫϞ֍' +
    HEBREW_CIPHER_CHARS +
    'पफबभमयरलवशषसहअआइईउऊऋएऐओऔॐॠѢѪѦѮѰѲѴѶѸѠѾѼӁӃӇӋӚӜӞӠӢӤӦӨӪӬӮӰӲӴӶӸӺӼӾԀԂԄԆԈԊԌԎԐԒЖЗЛФЦЧШЩЪЫЬЭЮЯ道无极阴阳气玄虚禅空觉悟幻仁义礼智信理天命心变აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰჱჲჳჴჵჶჷჸჹჺァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶᚠᚢᚦᚬᚱᚴᚼᚽᚾᚿᛁᛅᛆᛋᛌᛏᛐᛒᛘᛚᛦঅআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলবশষসহకఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరలవశషసహ가나다라마바사아자차카타파하ሀለሐመሠረሰቀበተኀነአከወዐዘየደገጠጰጸፀፈፐကခဂဃငစဆဇဈညဋဌဍ႑ဏတထဒဓနပဖဗဘမယရလဝသဟဠအഅആഇഈഉഊഋഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനപഫബഭമയരലവശഷസഹᜀᜁᜂᜃᜄᜅᜆᜇᜈᜉᜊᜋᜌᜎᜏᜐᜑកខគឃងចឆជឈញដឋឌឍណតថទធនបផពភមយរលវសហឡអกขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหඅආඇඈඉඊඋඌඍඑඒඓඔඕඖකඛගඝඞඟචඡජඣඤඥඦටඨඩඪණඬතථදධනඳපඵබභමඹයරලවශෂසහළෆֆբգդեզէըթժլխծկհձղճմյնշոչպջռսվտրցւփքօႠႡႢႣႤႥႦႧႨႩႪႫႬႭႮႯႰႱႲႳႴႵႶႷႸႹႺႻႼႽႾႿჀⴀⴁⴂⴃⴄⴅⴆⴇⴈⴉⴊⴋⴌⴍⴎⴏⴐⴑⴒⴓⴔⴕⴖⴗⴘⴙⴚⴛⴜⴝⴞⴟⴠꔀꔃꔉꔊꔋꔌꔚꔛꔤꔥꔪ가고구그기나노누느니다도두드디라로루르리마모무므미바보부브비사소수스시아오우으이자조주즈지차초추츠치카코쿠크키타토투트티파포푸프피하호후흐히';

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

export function usesIosCipherGlyphs() {
    return isIOS || document.body?.classList.contains('ios-ui');
}

export function pickCipherChar() {
    const pool = usesIosCipherGlyphs() ? IOS_CIPHER_CHARS : FULL_MATRIX_CHARS;
    return pool[Math.floor(Math.random() * pool.length)];
}

/** iPhone / iPad / iPod — excludes macOS laptops (same MacIntel touch heuristic, but hover: hover). */
export function isRealIOSDevice() {
    if (/iPad|iPhone|iPod/i.test(navigator.userAgent)) return true;
    return navigator.platform === 'MacIntel'
        && navigator.maxTouchPoints > 1
        && window.matchMedia('(hover: none)').matches;
}

export const isIOS = isRealIOSDevice();

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isNarrowViewport = window.innerWidth <= 768;
const isMobile = isCoarsePointer || isNarrowViewport;

export const perf = {
    isIOS,
    isMobile,
    prefersReducedMotion: reducedMotionQuery.matches,
    dprCap: isIOS ? 1 : (isMobile ? 1.5 : 2),
    spawnPerFrame: reducedMotionQuery.matches ? 12 : (isIOS ? 2 : (isMobile ? 4 : 8)),
    steadySwapsPerFrame: reducedMotionQuery.matches ? 8 : (isIOS ? 4 : (isMobile ? 12 : 30)),
    matrixFrameSkip: isIOS && !reducedMotionQuery.matches
        ? 2
        : (isMobile && !reducedMotionQuery.matches ? 1 : 0),
    panopticonFrameSkip: isIOS && !reducedMotionQuery.matches ? 1 : 0,
    maxCipherRings: isIOS ? 7 : null,
    cellSpacing: isMobile ? 1.45 : 1.65,
};

export function applyPerfClass() {
    document.body.classList.toggle('perf-lite', isMobile || perf.prefersReducedMotion);
}

applyPerfClass();
reducedMotionQuery.addEventListener('change', (e) => {
    perf.prefersReducedMotion = e.matches;
    perf.spawnPerFrame = e.matches ? 12 : (perf.isIOS ? 2 : (perf.isMobile ? 4 : 8));
    perf.steadySwapsPerFrame = e.matches ? 8 : (perf.isIOS ? 4 : (perf.isMobile ? 12 : 30));
    perf.matrixFrameSkip = perf.isIOS && !e.matches
        ? 2
        : (perf.isMobile && !e.matches ? 1 : 0);
    perf.panopticonFrameSkip = perf.isIOS && !e.matches ? 1 : 0;
    applyPerfClass();
    import('./state.js').then((s) => s.setNeedsFullRedraw(true));
});

export let eyeAngle = 0;
export let eyeMode = 'idle';

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

let catEyePhase = null;
let catEyeStart = 0;
let catEyeAudioEl = null;

let panopticonGodActive = false;
let godEyeSequence = null;
let godEyeSeqStart = 0;
let godSymbolIndex = 0;
let godSymbolTick = 0;

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

function panopticonGodGazeLocked() {
    if (!godEyeSequence && !panopticonGodActive) return false;
    return godEyeSequence !== 'open';
}

function setPanopticonCursor(clientX, clientY) {
    if (!panopticonEl || !panopticonEl.classList.contains('visible')) return;
    if (panopticonGodGazeLocked()) return;
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
    panopticonLidEl?.setAttribute('d', PANOPTICON_LID_OPEN);
    panopticonClipPathEl?.setAttribute('d', PANOPTICON_LID_OPEN);
    if (panopticonGazeEl) panopticonGazeEl.style.opacity = '1';
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
        panopticonGodPupilEl.textContent = ICO_SYMBOLS[godSymbolIndex];
        panopticonGodPupilEl.style.display = 'block';
    }
    panopticonGazeX = 0;
    panopticonGazeY = 0;
    panopticonGazeEl?.setAttribute('transform', 'translate(0, 0)');
}

export function setPanopticonGodMode(active) {
    if (active) {
        cancelPanopticonCatEye();
        panopticonGodActive = true;
        godEyeSequence = 'closing';
        godEyeSeqStart = performance.now();
        godSymbolIndex = 0;
        godSymbolTick = 0;
        return;
    }

    panopticonGodActive = false;
    if (godEyeSequence === 'open') {
        godEyeSequence = 'deactivating';
        godEyeSeqStart = performance.now();
        return;
    }

    resetPanopticonNormalPupil();
    godEyeSequence = null;
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
            godSymbolIndex = (godSymbolIndex + 1) % ICO_SYMBOLS.length;
            if (panopticonGodPupilEl) {
                panopticonGodPupilEl.textContent = ICO_SYMBOLS[godSymbolIndex];
            }
            godSymbolTick = now;
        }

        const ease = perf.prefersReducedMotion ? 0.08 : 0.14;
        panopticonGazeX += (panopticonTargetX - panopticonGazeX) * ease;
        panopticonGazeY += (panopticonTargetY - panopticonGazeY) * ease;
        panopticonGazeEl?.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);
        return true;
    }

    if (godEyeSequence === 'deactivating') {
        if (elapsed < closeMs) {
            const shut = smoothstep(elapsed / closeMs);
            applyPanopticonLidShut(shut);
            return true;
        }

        if (elapsed < closeMs + holdMs) {
            applyPanopticonLidShut(1);
            resetPanopticonGodStyling();
            return true;
        }

        const openElapsed = elapsed - closeMs - holdMs;
        const shut = 1 - smoothstep(Math.min(1, openElapsed / openMs));
        applyPanopticonLidShut(shut);

        if (openElapsed >= openMs) {
            resetPanopticonNormalPupil();
            godEyeSequence = null;
        }
        return true;
    }

    return false;
}

export function animatePanopticon() {
    if (!panopticonGazeEl || !panopticonInnerEl) return;

    updatePanopticonVisibility();
    if (!panopticonEl?.classList.contains('visible')) return;

    if (panopticonEl.classList.contains('pong-active')) return;

    if (panopticonEl.classList.contains('god-rainbow')) {
        syncPanopticonRainbow();
    }

    if (animatePanopticonGodEye(performance.now())) return;

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

    const ease = perf.prefersReducedMotion ? 0.08 : 0.14;
    panopticonGazeX += (panopticonTargetX - panopticonGazeX) * ease;
    panopticonGazeY += (panopticonTargetY - panopticonGazeY) * ease;
    panopticonInnerEl.style.transform = '';
    panopticonGazeEl.setAttribute('transform', `translate(${panopticonGazeX}, ${panopticonGazeY})`);
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
