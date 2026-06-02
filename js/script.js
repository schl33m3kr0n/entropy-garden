// ==========================================
// ENTROPY GARDEN - v24.0 ENGINE
// ==========================================

// --- GOD MODE (Konami completion via js/konami.js on module or file-pong.bundle paths) ---
function activateGodMode() {
    const body = document.body;
    const h1 = document.querySelector('h1');

    // CHECK IF ALREADY ACTIVE
    if (body.classList.contains('god-mode')) {
        body.classList.remove('god-mode');
        h1.innerText = "ENTROPY GARDEN";
        setPanopticonGodMode(false);
        globalThis.EntropyCipherHint?.onGodModeOff?.();
        pushTerminalLog("> SYSTEM OVERRIDE TERMINATED. RETURNING TO NORMALCY.");
        playSound(sfx.glitch); // A good "power down" sound
    } 
    // IF NOT ACTIVE, TURN IT ON
    else {
        body.classList.add('god-mode');
        h1.innerText = "PONDERY ARGENT";
        setPanopticonGodMode(true);
        pushTerminalLog("!!! OVERRIDE ACCEPTED !!!");
        playSound(sfx.missionCleared);
        globalThis.unlockTrophy?.('konami_god');
        globalThis.EntropyCipherHint?.unlock?.();
    }
}

globalThis.activateGodMode = activateGodMode;

// --- SHUFFLE & BAG LOGIC ---
function shuffle(array) { 
    let currentIndex = array.length, randomIndex; 
    while (currentIndex != 0) { 
        randomIndex = Math.floor(Math.random() * currentIndex); 
        currentIndex--; 
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]; 
    } 
    return array; 
}

// --- GLOBAL DRAG PHYSICS FOR LOOSE ITEMS ---
let draggedElement = null;
let dragOffsetX = 0, dragOffsetY = 0;

document.addEventListener('mousedown', handleDragStart);
document.addEventListener('touchstart', handleDragStart, { passive: false });

function handleDragStart(e) {
    // Only allow dragging on elements with the 'artifact' or 'scatter-file' class
    const target = e.target.closest('.artifact') || e.target.closest('.scatter-file');
    
    // Ignore clicks if they are inside the terminal or the combination slots
    if (!target || e.target.closest('.slot') || e.target.closest('#terminal-container')) return;

    draggedElement = target;
    
    // Calculate where on the item the user clicked so it doesn't snap to the top left
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    const rect = draggedElement.getBoundingClientRect();
    dragOffsetX = clientX - rect.left;
    dragOffsetY = clientY - rect.top;
    
    draggedElement.style.position = 'absolute';
    draggedElement.style.zIndex = draggedElement.id.includes('pizza') ? 10050 : 1000;
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);
}

function handleDragMove(e) {
    if (!draggedElement) return;
    e.preventDefault(); // Prevent accidental scrolling on touch devices
    
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    draggedElement.style.left = `${clientX - dragOffsetX}px`;
    draggedElement.style.top = `${clientY - dragOffsetY}px`;
}

function handleDragEnd(e) {
    if (!draggedElement) return;

    // 1. Find exactly where the user dropped the item
    const clientX = e.type.includes('mouse') ? e.clientX : e.changedTouches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.changedTouches[0].clientY;

    // 2. Get the terminal's current hitbox
    const termRect = document.getElementById('terminal-container').getBoundingClientRect();

    // 3. Check if the drop coordinates are inside the terminal
    if (
        clientX >= termRect.left &&
        clientX <= termRect.right &&
        clientY >= termRect.top &&
        clientY <= termRect.bottom
    ) {
        // EAT THE ITEM
        const isPizza = draggedElement.id.includes('pizza') || draggedElement.innerHTML.includes('path'); 
        
        draggedElement.remove(); 

        // Trigger the physical "burp" animation
        terminalContainer.classList.add('burp-active');
        setTimeout(() => {
            terminalContainer.classList.remove('burp-active');
        }, 350); // Matches the 0.35s duration in the CSS

        // Print custom logs and play sounds
        if (isPizza) {
            pushTerminalLog("> SYSTEM CONSUMED: 1x SLICE. DELICIOUS.");
            if (sfx.eat) playSound(sfx.eat); 
        } else {
            pushTerminalLog("> CORRUPTED FILE ASSIMILATED.");
            playSound(sfx.taskComplete);
        }
    } else {
        // If dropped anywhere else, just put it down normally
        draggedElement.style.zIndex = draggedElement.id.includes('pizza') ? 10010 : 10;
    }

    draggedElement = null;
    
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchend', handleDragEnd);
}

function createBag(arr) { 
    let bag = []; 
    return function(count = 1) { 
        let results = []; 
        for(let i = 0; i < count; i++) { 
            if (bag.length === 0) { bag = shuffle([...arr]); } 
            results.push(bag.pop()); 
        } 
        return count === 1 ? results[0] : results; 
    } 
}

// --- AUDIO SYSTEM ---
const asset = (path) => `assets/${path}`;
const sfxPath = (file) => asset(`audio/sfx/${file}`);
const musicPath = (file) => asset(`audio/music/${encodeURIComponent(file)}`);
const imgPath = (file) => asset(`img/${file}`);

function setImgWithFallback(el) {
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

const sfx = {
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
    meow: createLazyAudio(sfxPath('meow.mp3')),
};

const BGM_TRACKS = [
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
    'fractals.mp3'
];

const BGM_TRACK_INFO = [
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

const BGM_TRACK_TITLES = BGM_TRACK_INFO.map((track) => `${track.title} — ${track.artist}`);

function getBgmTrackTitle(index) {
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

function applyTrackTitleMarquee(container, text, options = {}) {
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
let currentTrackIndex = 0;
let bgmPlayGeneration = 0;

function wrapTrackIndex(index) {
    return ((index % BGM_TRACKS.length) + BGM_TRACKS.length) % BGM_TRACKS.length;
}

function nextBgmPlayGeneration() {
    bgmPlayGeneration += 1;
    return bgmPlayGeneration;
}

function getBgmTrack(index) {
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
        wrapTrackIndex(currentTrackIndex - 1)
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

function playCurrentBgmTrack() {
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
    updatePlaylistUI();
}

function playSound(sound) { 
    if (!sound) return; 
    sound.currentTime = 0; 
    sound.play().catch(e => console.log("Audio blocked. Awaiting user interaction.")); 
}

function playMeow() {
    triggerPanopticonCatEye(sfx.meow);
    playSound(sfx.meow);
}

// --- GLOBAL VARIABLES ---
const canvas = document.getElementById('grid-canvas'); 
const ctx = canvas.getContext('2d');
let fontSize = 16;
let cellSize = 16;
const font = '16px Arial, sans-serif'; 
const chars = "ÆÐÞǷȜƩƱƲƷƸƎƔƜɅꜲꜨꜬꜮꜴꜶꝎꝠꝏꟄꟿƁƇƊƑƓƘƤƬƳȡȴȶɁɃɆɎ∑∫∆∞≈µ¥£€¢±×÷∂∇∏√∝∠∧∨∩∪∴∵∼≅≠≤≥⊂⊃⊆⊇⊕⊗⊥─□△▽◇○◎★☆♪♀♂☼ϫϞ֍אבגדהוזחטיכךלמםנןסעפףצץקרשת׳״־पफबभमयरलवशषसहअआइईउऊऋएऐओऔॐॠѢѪѦѮѰѲѴѶѸѠѾѼӁӃӇӋӚӜӞӠӢӤӦӨӪӬӮӰӲӴӶӸӺӼӾԀԂԄԆԈԊԌԎԐԒЖЗЛФЦЧШЩЪЫЬЭЮЯ道无极阴阳气玄虚禅空觉悟幻仁义礼智信理天命心变აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰჱჲჳჴჵჶჷჸჹჺァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶᚠᚢᚦᚬᚱᚴᚼᚽᚾᚿᛁᛅᛆᛋᛌᛏᛐᛒᛘᛚᛦঅআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলবশষসহకఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరలవశషసహ가나다라마바사아자차카타파하ሀለሐመሠረሰቀበተኀነአከወዐዘየደገጠጰጸፀፈፐကခဂဃငစဆဇဈညဋဌဍ႑ဏတထဒဓနပဖဗဘမယရလဝသဟဠအഅആഇഈഉഊഋഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനപഫബഭമയരലവശഷസഹᜀᜁᜂᜃᜄᜅᜆᜇᜈᜉᜊᜋᜌᜎᜏᜐᜑកខគឃងចឆជឈញដឋឌឍណតថទធនបផពភមយរលវសហឡអกขคฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหඅආඇඈඉඊඋඌඍඑඒඓඔඕඖකඛගඝඞඟචඡජඣඤඥඦටඨඩඪණඬතථදධනඳපඵබභමඹයරලවශෂසහළෆֆբգդեզէըթժլխծկհձղճմյնշոչպջռսվտրցւփքօႠႡႢႣႤႥႦႧႨႩႪႫႬႭႮႯႰႱႲႳႴႵႶႷႸႹႺႻႼႽႾႿჀⴀⴁⴂⴃⴄⴅⴆⴇⴈⴉⴊⴋⴌⴍⴎⴏⴐⴑⴒⴓⴔⴕⴖⴗⴘⴙⴚⴛⴜⴝⴞⴟⴠꔀꔃꔉꔊꔋꔌꔚꔛꔤꔥꔪ가고구그기나노누느니다도두드디라로루르리마모무므미바보부브비사소수스시아오우으이자조주즈지차초추츠치카코쿠크키타토투트티파포푸프피하호후흐히";
let activeUtterances = []; // Prevents the browser from killing the speech events
let cols, rows; 
let mouse = { x: -1000, y: -1000 }; 
let time = 0; 
let isCorrupted = false; 
let isRepulsing = false;

// --- PERFORMANCE PROFILE (mobile + reduced motion) ---
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isNarrowViewport = window.innerWidth <= 768;
const isMobile = isCoarsePointer || isNarrowViewport;
const prefersReducedMotion = reducedMotionQuery.matches;

const perf = {
    isMobile,
    prefersReducedMotion,
    dprCap: isMobile ? 1.5 : 2,
    spawnPerFrame: prefersReducedMotion ? 12 : (isMobile ? 4 : 8),
    steadySwapsPerFrame: prefersReducedMotion ? 8 : (isMobile ? 12 : 30),
    matrixFrameSkip: isMobile && !prefersReducedMotion ? 1 : 0,
    cellSpacing: isMobile ? 1.45 : 1.65
};

let canvasDpr = 1;
let gardenLoopActive = false;
let gardenHasStarted = false;
let gardenAnimId = null;
let matrixFrameCount = 0;
let needsFullRedraw = true;

function applyPerfClass() {
    document.body.classList.toggle('perf-lite', isMobile || prefersReducedMotion);
}
applyPerfClass();
reducedMotionQuery.addEventListener('change', (e) => {
    perf.prefersReducedMotion = e.matches;
    perf.spawnPerFrame = e.matches ? 12 : (perf.isMobile ? 4 : 8);
    perf.steadySwapsPerFrame = e.matches ? 8 : (perf.isMobile ? 12 : 30);
    perf.matrixFrameSkip = perf.isMobile && !e.matches ? 1 : 0;
    applyPerfClass();
    needsFullRedraw = true;
});
let slotState = [null, null, null]; 
const winningCombo = ["art-fuel", "art-source", "art-hoard"];

// --- GHOST HINT LOGIC ---
let hasShownRefreshNote = false;

function triggerGhostHint() {
    if (!hasShownRefreshNote) {
        hasShownRefreshNote = true;
        const hint = document.getElementById('refresh-hint');
        if (hint) {
            // Forcing the CSS animation directly via Javascript
            hint.style.animation = 'hintFadeInOut 5s forwards';
        }
    }
}
 

// --- NEEDY BROWSER TAB ---
const originalTitle = document.title;
const needyTitles = ["RENDER FAILED...", "WHERE DID YOU GO?", "MEMORY LEAK DETECTED", "CTRL+Z! CTRL+Z!", "PLEASE COME BACK", "I THOUGHT WHAT WE HAD WAS SPECIAL", "OK, FINE. LEAVE.", "AM I NOT ENOUGH FOR YOU?", "THEY ALWAYS LEAVE...", "I MISS U </3", "ARE YOU MAD AT ME?", "AM I TOO MUCH FOR YOU?", "AM I NOT ENOUGH FOR YOU?"];
document.addEventListener("visibilitychange", () => {
    document.title = document.hidden ? needyTitles[Math.floor(Math.random() * needyTitles.length)] : originalTitle;
    if (document.hidden) {
        stopGardenLoop();
        if (singularityAnimId) {
            cancelAnimationFrame(singularityAnimId);
            singularityAnimId = null;
        }
    } else if (gardenHasStarted) {
        startGardenLoop();
    }
});

// --- TERMINAL LOG SYSTEM ---
const lore = globalThis.lorePools;
let drawTerminalLog = createBag(lore.terminalOutputSafe);
let lateNightLogs = null;

function activeTerminalPool() {
    let pool = isCorrupted
        ? lore.terminalOutputSafe.concat(lore.terminalOutputGritty)
        : lore.terminalOutputSafe.slice();
    if (lateNightLogs) pool = pool.concat(lateNightLogs);
    return pool;
}

function rebuildTerminalLogPool() {
    drawTerminalLog = createBag(activeTerminalPool());
}

function pushTerminalLog(msg, options) {
    const term = document.getElementById('terminal-output');
    if (!term) return;
    const finalMsg = msg || drawTerminalLog();
    
    // 1. Check if the user is currently looking at the bottom BEFORE adding the new message.
    // We add a 50px buffer so it's forgiving if they are just slightly off the exact bottom pixel.
    const isScrolledToBottom = term.scrollHeight - term.clientHeight <= term.scrollTop + 50;

    const p = document.createElement('div'); 
    p.className = 'term-entry';
    if (options?.html) {
        p.innerHTML = finalMsg;
    } else {
        p.innerText = finalMsg;
    }
    term.appendChild(p); 
    
    if(term.children.length > 50) term.removeChild(term.firstChild); 
    
    // 2. Only force the scrollbar down if they were already at the bottom
    if (isScrolledToBottom) {
        term.scrollTop = term.scrollHeight; 
    }
}
globalThis.pushTerminalLog = pushTerminalLog;

setInterval(() => { if(!document.hidden) pushTerminalLog(); }, 3000 + Math.random() * 4000);

const termInput = document.getElementById('term-input');

function isTerminalSubmitKey(e) {
    return e.key === 'Enter' || e.keyCode === 13 || e.which === 13;
}

function submitTerminalCommand() {
    if (!termInput) return;
    const val = termInput.value.trim();
    if (!val) return;
    const normalized = val.toLowerCase();
    pushTerminalLog(`> ${normalized}`);
    termInput.value = '';
    processCommand(normalized);
}

if (termInput) {
    termInput.addEventListener('input', () => {
        const soundClone = sfx.keystroke.cloneNode();
        soundClone.volume = 0.5;
        soundClone.play().catch(e => {});
    });

    termInput.addEventListener('keydown', (e) => {
        if (!isTerminalSubmitKey(e)) return;
        e.preventDefault();
        submitTerminalCommand();
    });
}

// --- COMMAND PROCESSING & SCATTER LOGIC ---
const fakeFiles = [
    "Render_Final_FINAL.mp4", "topology_nightmare.obj", "donut_tutorial_failed.blend", 
    "Untitled_042.psd", "why_is_this_crashing.ma", "hubba_bubba_cache.db", 
    "Korzamuron_grammar_v2.txt", "woop.mp3", "do_not_delete.sys", 
    "skate_footage_raw.mov", "resume_draft_v7.pdf"
];
let extraPizzas = 0;
let cipherStage = 0; // 0: inactive, 1: awaiting Vigenère key, 2: awaiting Korzamuron translation
let isCipherSolved = false; // Tracks if the terminal hack is complete
globalThis.getCipherStage = () => cipherStage;

const CIPHER_TRANSLATION_ANSWERS = new Set(['chaos', 'disorder']);
const CIPHER_FALLBACK_CT = 'jiq rrtsvo';

function cipherCiphertext() {
    return globalThis.EntropyCipher?.ciphertext || CIPHER_FALLBACK_CT;
}

function korzamuronCipherPlain() {
    return globalThis.EntropyCipher?.plaintext || 'hun nuresk';
}

function tryAcceptCipherKey(cleanCmd) {
    const cipher = globalThis.EntropyCipher;
    if (!cipher?.decrypt) return cleanCmd === 'codex';
    const keyNorm = cleanCmd.replace(/[^a-z]/g, '');
    if (!keyNorm) return false;
    const plain = cipher.decrypt(cipherCiphertext(), keyNorm);
    return plain === korzamuronCipherPlain();
}

// --- CIPHER HELPERS & REWARDS ---
function printLexicon() {
    pushTerminalLog("> KORZAMURON DATABANK FRAGMENT:");
    pushTerminalLog("> hun = storm | nuresk = vital");
    pushTerminalLog('> hun nuresk <em>from Korzamuron</em>', { html: true });
}

// --- NEW: THE SHORTCUTS MENU ---
function printShortcuts() {
    pushTerminalLog("> --- SYSTEM HOTKEYS ---");
    pushTerminalLog("> [ ENTER ] : Focus Terminal");
    pushTerminalLog("> [ TAB ]   : Toggle Terminal");
    pushTerminalLog("> [ R ]     : Reroll Garden State");
    pushTerminalLog("> [ H ]     : View Shortcuts");
    pushTerminalLog("> [ ~ ]     : Panic Button (Boss Key)");
    pushTerminalLog("> [ ↑↑↓↓←→←→ b a ] : God Mode");
}

function triggerCipherReward() {
    const term = document.getElementById('terminal-container');
    const termInputLine = document.getElementById('terminal-input-line');
    if (!term) return;

    isCipherSolved = true;

    // Turn terminal Cyan for the hack effect
    term.style.borderColor = 'var(--cyan)';
    term.style.color = 'var(--cyan)';
    term.style.textShadow = '0 0 10px var(--cyan)';
    if (termInputLine) termInputLine.style.display = 'none';

    setTimeout(() => pushTerminalLog("> TRANSLATION LOGIC VERIFIED."), 500);
    setTimeout(() => pushTerminalLog("> KORZAMURON ARCHIVE UNLOCKED."), 1500);
    setTimeout(() => pushTerminalLog("> 'The vowels are entirely too many, but the prime thread remains.'"), 2500);
    
    // The Docking Bay Hint
    setTimeout(() => pushTerminalLog("> DECRYPTING DOCKING BAY OVERRIDE..."), 4500);
    setTimeout(() => pushTerminalLog("> SEQUENCE: [ 1. FUEL | 2. SOURCE | 3. HOARD ]"), 6000);
    
    setTimeout(() => {
        pushTerminalLog("> DOCKING BAY UNLOCKED. AWAITING MANUAL OVERRIDE.");
        playSound(sfx.collectible);
        globalThis.unlockTrophy?.('cipher_vault');
        checkCycleWin();
    }, 8000);

    // Reset Terminal Appearance
    setTimeout(() => {
        term.style.borderColor = 'var(--neon-green)';
        term.style.color = 'var(--neon-green)';
        term.style.textShadow = '0 0 3px var(--neon-green)';
        if (termInputLine) termInputLine.style.display = 'flex';
    }, 9500);
}

function processCommand(cmd) {
    // Clean the input to ignore capitals and punctuation
    const cleanCmd = cmd.toLowerCase().replace(/[.,]/g, "").trim();

    // ==========================================
    // STAGE 1: Waiting for the Vigenère Key
    // ==========================================
    if (cipherStage === 1) {
        if (cleanCmd === 'abort' || cleanCmd === 'exit' || cleanCmd === 'esc' || cleanCmd === 'quit') {
            pushTerminalLog("> CIPHER SEQUENCE ABORTED.");
            playSound(sfx.glitch);
            cipherStage = 0;
            globalThis.EntropyCipherHint?.resetCipherHints?.();
        } else if (tryAcceptCipherKey(cleanCmd)) {
            pushTerminalLog("> KEYWORD ACCEPTED. DECRYPTING...");
            playSound(sfx.taskComplete);
            const plain = korzamuronCipherPlain();
            setTimeout(() => {
                pushTerminalLog(`> DECRYPTED FRAGMENT: '${plain}'`);
                pushTerminalLog("> AWAITING ENGLISH TRANSLATION...");
                cipherStage = 2;
                globalThis.EntropyCipherHint?.syncCipherHints?.();
            }, 1500);
        } else {
            pushTerminalLog("> ERROR: INVALID KEY. HINT: 'Dresden ..., ... Leicester, ... Gigas'");
            playSound(sfx.oopsy);
        }
        return; // Stops normal commands from running
    }

    // ==========================================
    // STAGE 2: Waiting for the Korzamuron Translation
    // ==========================================
    if (cipherStage === 2) {
        if (cleanCmd === 'abort' || cleanCmd === 'exit' || cleanCmd === 'esc' || cleanCmd === 'quit') {
            pushTerminalLog("> CIPHER SEQUENCE ABORTED.");
            playSound(sfx.glitch);
            cipherStage = 0;
            globalThis.EntropyCipherHint?.resetCipherHints?.();
        } else if (cleanCmd === 'lexicon') {
            printLexicon(); // Print the dictionary without failing the puzzle
        } else if (CIPHER_TRANSLATION_ANSWERS.has(cleanCmd)) {
            pushTerminalLog("> TRANSLATION ACCEPTED. DATA UNLOCKED.");
            playSound(sfx.missionCleared);
            cipherStage = 0; // Reset the puzzle state
            globalThis.EntropyCipherHint?.resetCipherHints?.();
            triggerCipherReward();
        } else {
            pushTerminalLog("> ERROR: INVALID TRANSLATION. TYPE 'lexicon' FOR HINTS OR 'abort'.");
            playSound(sfx.oopsy);
        }
        return; 
    }

    // ==========================================
    // NORMAL TERMINAL COMMANDS
    // ==========================================
    if (['hello', 'hi', 'hey', 'sup', 'yo', 'greetings', 'howdy'].includes(cleanCmd)) {
        pushTerminalLog("> shut up. 🖕");
        playSound(sfx.stfu);
        triggerPanopticonCenterStare();
    }
    else if(cmd === 'help') pushTerminalLog("AVAILABLE: help, clear, meow, pizza, render, scatter, time, cipher, lexicon, shortcuts");
    else if(cmd === 'shortcuts') printShortcuts();
    else if(cmd === 'clear') {
        document.getElementById('terminal-output').innerHTML = '';
        document.querySelectorAll('.scatter-file').forEach(f => f.remove());
    }
    else if(cmd === 'reset trophies' || cmd === 'trophies reset') {
        if (globalThis.resetTrophies?.()) {
            pushTerminalLog('> TROPHIES PURGED. ALL SLOTS RELOCKED.');
            playSound(sfx.glitch);
        } else {
            pushTerminalLog('> ERROR: TROPHY MODULE OFFLINE.');
            playSound(sfx.oopsy);
        }
    }
    else if(cmd === 'meow') {
        pushTerminalLog("Synthesizing feline frequency in G Major...");
        playMeow();
        globalThis.unlockTrophy?.('feline_freq');
    }
    else if(cmd === 'render') { 
        pushTerminalLog("CRITICAL ERROR: GEOMETRY FAILED."); 
        document.body.classList.add('corrupted'); 
        setTimeout(() => document.body.classList.remove('corrupted'), 500); 
    }
    else if(cmd === 'pizza') { pushTerminalLog("Fuel deployed."); spawnPizza(); }
    else if(cmd === 'scatter') { pushTerminalLog("FATAL: DESKTOP CONTAINMENT BREACH."); triggerScatter(); }
    else if(cmd === 'osprey') { 
        triggerOspreyEvent();
	}
    else if(cmd === 'compose') {
        pushTerminalLog("> INITIATING VOID EDITOR...");
        openComposer();
    }
    else if(cmd === 'time') { 
        pushTerminalLog(`> CURRENT SYSTEM TIME: ${new Date().toLocaleTimeString()}`); 
    }
    else if(cmd === 'signal' || cmd === 'live_feed') {
        openModal('signal');
    }
    else if(cmd === 'arcade' || cmd === 'play' || cmd === 'game') {
        pushTerminalLog("> BOOTING EMULATOR...");
        openModal('arcade');
    }
    else if(cmd === 'lexicon') {
        printLexicon();
    }
    // THE NEW MULTI-STAGE CIPHER COMMAND
    else if(cmd === 'cipher') {
        if (cipherStage > 0) {
            pushTerminalLog("> CIPHER PROTOCOL ALREADY ACTIVE.");
            playSound(sfx.oopsy);
            return;
        }
        cipherStage = 1;
        pushTerminalLog("> INITIATING VIGENÈRE DECRYPTION PROTOCOL...");
        playSound(sfx.loading);
        const ct = cipherCiphertext();
        setTimeout(() => {
            pushTerminalLog(`> CIPHERTEXT: '${ct}'`);
            pushTerminalLog("> AWAITING DECRYPTION KEY...");
            pushTerminalLog("> (HINT: 'Dresden ..., Aleppo ..., ... Gigas')");
        }, 2000);
    }

// --- THE SECRET BACKDOOR ---
    else if(cmd === 'express') {
        pushTerminalLog("> EXPRESS OVERRIDE ACCEPTED. BYPASSING SECURITY PROTOCOLS...");
        cipherStage = 0;
        globalThis.EntropyCipherHint?.resetCipherHints?.();
        document.getElementById('terminal-container')?.classList.remove('active');
        termInput?.blur();
        triggerSingularity();
    }
    else {
    pushTerminalLog(`Unknown command: ${cmd}`);
    playSound(sfx.unknown); // <-- PLAYS YOUR NEW SOUND
    }
}

function triggerScatter() {
    globalThis.unlockTrophy?.('scatter_breach');
    playSound(sfx.glitch);
    for(let i=0; i<40; i++) {
        let f = document.createElement('div');
        f.className = 'scatter-file';
        let name = fakeFiles[Math.floor(Math.random() * fakeFiles.length)];
        f.innerHTML = `<div class="file-icon"></div><span>${name}</span>`;
        f.style.left = (Math.random() * 80 + 10) + '%';
        f.style.top = '-50px';
        document.body.appendChild(f);
        
        f.onmousedown = function(e) { startDrag(e, this, true); };
        f.ontouchstart = function(e) { startDrag(e, this, true); };
        
        setTimeout(() => { f.style.top = (Math.random() * 80 + 10) + '%'; }, 50 + i * 20);
    }
}

function spawnPizza() {
    globalThis.unlockTrophy?.('pizza_protocol');
    extraPizzas++; 
    const newPizza = document.createElement('div'); 
    newPizza.className = 'artifact artifact-pizza'; 
    newPizza.id = 'art-pizza-clone-' + extraPizzas;
    newPizza.style.top = '-100px'; 
    newPizza.style.left = (Math.random() * 80 + 10) + '%'; 
    newPizza.style.transition = 'transform 0.1s';
    newPizza.innerHTML = `<svg viewBox="0 0 100 100"><path d="M50 10 L85 85 L15 85 Z" fill="none"/><circle cx="50" cy="40" r="4" fill="none"/><circle cx="65" cy="65" r="4" fill="none"/><circle cx="35" cy="65" r="4" fill="none"/></svg>`;
    newPizza.onmousedown = function(e) { handleDragStart(e, this); }; 
    newPizza.ontouchstart = function(e) { handleDragStart(e, this); };
    document.body.appendChild(newPizza);
    setTimeout(() => { newPizza.style.transition = 'top 0.5s ease-out, left 0.5s ease-out'; newPizza.style.top = (Math.random() * 60 + 10) + '%'; }, 50);
    setTimeout(() => { newPizza.style.transition = 'transform 0.1s'; }, 600); 
    playSound(sfx.collectible);
}
// --- TERMINAL INTERACTION LOGIC ---
const terminalContainer = document.getElementById('terminal-container');
let lastTerminalOpenTime = 0; // The ultimate ghost-click killer

let terminalPokes = 0;
let pokeResetTimer;

terminalContainer.addEventListener('click', () => {
// 1. Track rapid clicks
    terminalPokes++;
    clearTimeout(pokeResetTimer);
    pokeResetTimer = setTimeout(() => terminalPokes = 0, 1500);

    if (terminalPokes === 6) {
        pushTerminalLog("> PLEASE. I AM FRAGILE. STOP POKING.");
        if (sfx.error) playSound(sfx.error);
        
        // Physically move the terminal away from the mouse
        terminalContainer.style.transition = 'transform 0.1s ease-out';
        terminalContainer.style.transform = 'translate(-300px, -200px) rotate(-5deg)';
        
        // Reset it after 3 seconds
        setTimeout(() => {
            terminalContainer.style.transform = ''; // Lets the CSS take over again
            terminalPokes = 0;
        }, 3000);
        return; // Stop the rest of the click logic so it doesn't open
    }
    // Only play the radio beep if the terminal isn't already open
    if (!terminalContainer.classList.contains('active')) {
        if (sfx.radio) playSound(sfx.radio); 
        lastTerminalOpenTime = Date.now();
    }
    
    // Open the terminal dialogue
    terminalContainer.classList.add('active');
    
    // Wait for the animation to finish before focusing!
   setTimeout(() => {
        termInput?.focus({ preventScroll: true });
    }, 420);
});

// Close terminal when clicking anywhere else on the screen
window.addEventListener('click', (e) => {
    // FIX: If the terminal was opened less than 150 milliseconds ago, ignore this click!
    if (Date.now() - lastTerminalOpenTime < 150) return;

    if(!e.target.closest('#terminal-container') && terminalContainer.classList.contains('active')) {
        terminalContainer.classList.remove('active');
        termInput.blur(); // Drops the cursor focus
    }
});

let tabSpamCount = 0;
let tabSpamTimer;

// --- MASTER KEYBOARD CONTROLLER (capture: block native Tab focus before it shifts the HUD) ---
window.addEventListener('keydown', (e) => {
    const gardenBlocksTerminalKeys = () => {
        if (!document.body.classList.contains('garden-ready')) return true;
        if (document.getElementById('lightbox')?.classList.contains('active')) return true;
        for (const modal of document.querySelectorAll('.modal')) {
            if (getComputedStyle(modal).display === 'flex') return true;
        }
        return false;
    };

    // 1. Pressing ENTER opens the terminal (if it's closed)
    if (e.key === 'Enter') {
        if (!terminalContainer.classList.contains('active')) {
            e.preventDefault(); 
            if (document.activeElement) document.activeElement.blur(); 
            
            if (sfx.radio) playSound(sfx.radio); 
            
            // Inside the 'Enter' key block:
            terminalContainer.classList.add('active');
            lastTerminalOpenTime = Date.now(); 
setTimeout(() => {
        termInput?.focus({ preventScroll: true });
    }, 420);
        }
    }

   // 2. Pressing TAB toggles the terminal open/closed
    if (e.key === 'Tab' && !gardenBlocksTerminalKeys()) {
        e.preventDefault();
        terminalContainer.removeAttribute('hidden');
        terminalContainer.classList.add('reveal-in', 'is-sliver');

        // --- ADD THE SPAM TRACKER HERE ---
        tabSpamCount++;
        clearTimeout(tabSpamTimer);
        tabSpamTimer = setTimeout(() => tabSpamCount = 0, 1500);

        if (tabSpamCount === 8) {
            pushTerminalLog("> MAKE UP YOUR MIND.");
            if (sfx.stop) playSound(sfx.stop); // Plays the 'shut up' sound
            tabSpamCount = 0;
            return; // Stops the terminal from actually opening/closing this time
        }
        // ---------------------------------
        
        // IF THE TERMINAL IS ALREADY OPEN (Close it)
        if (terminalContainer.classList.contains('active')) {
            terminalContainer.classList.remove('active');
            termInput.blur(); 
            
            // --- FIRE THE BURP HERE ---
            if (sfx.burp) playSound(sfx.burp); 
            
            if (typeof cipherStage !== 'undefined' && cipherStage > 0) {
                cipherStage = 0;
                globalThis.EntropyCipherHint?.resetCipherHints?.();
                pushTerminalLog("> CIPHER SEQUENCE ABORTED.");
            }
        } 
        // IF THE TERMINAL IS CLOSED (Open it)
        else {
            if (document.activeElement) document.activeElement.blur(); 
            if (sfx.radio) playSound(sfx.radio); 
            
            terminalContainer.classList.add('active');
            lastTerminalOpenTime = Date.now(); 
            
            setTimeout(() => {
                termInput?.focus({ preventScroll: true });
            }, 420);
        }
    }

   // 3. Pressing the TILDE (`) key triggers the Maya Screen (Boss Key)
    if (e.key === '`' || e.key === '~') {
        e.preventDefault(); 
        toggleBossKey(); // Fires the existing function on line 363
    }
    
   // --- 4. R: Trigger Reroll (If not typing) ---
    if (e.key === 'r' || e.key === 'R') {
        // 1. Let the browser handle standard refresh commands (Cmd+R or Ctrl+R)
        if (e.metaKey || e.ctrlKey) return; 
        
        // 2. Check if the user is currently typing in an input box or textarea
        const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
        
        // 3. If they aren't typing, spin the eye!
        if (!isTyping) {
            e.preventDefault(); 
            handleReroll(); 
        }
    }

// --- 5. H: Trigger Shortcuts Menu (If not typing) ---
    if (e.key === 'h' || e.key === 'H') {
        if (e.metaKey || e.ctrlKey) return; 
        
        const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
        
        if (!isTyping) {
            e.preventDefault(); 
            
            // Open the terminal if it's closed so they can actually see the list
            if (!terminalContainer.classList.contains('active')) {
                terminalContainer.classList.add('active');
                lastTerminalOpenTime = Date.now(); 
                if (sfx.radio) playSound(sfx.radio);
            }
            
            // Print the list!
            printShortcuts(); 
        }
    }

// --- 6. C: Toggle Corrupted Mode (If not typing) ---
    if (e.key === 'c' || e.key === 'C') {
        if (e.metaKey || e.ctrlKey) return; 
        
        const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
        
        if (!isTyping) {
            e.preventDefault(); 
            toggleMode(); // Fires your existing corruption toggle function
        }
    }

}, true);

// --- PLAYLIST CONTROL LOGIC ---

function updatePlaylistUI() {
    const trackLabel = document.getElementById('track-title');
    const title = getBgmTrackTitle(currentTrackIndex);
    if (trackLabel) {
        applyTrackTitleMarquee(trackLabel, title);
    }
    pushTerminalLog(`> AUDIO_LINK: ${title.toUpperCase()} ACTIVE.`);
}

function playPrevTrack() {
    stopBgmTrack(currentTrackIndex);
    currentTrackIndex = wrapTrackIndex(currentTrackIndex - 1);
    playCurrentBgmTrack();
}

function playNextTrack() {
    stopBgmTrack(currentTrackIndex);
    currentTrackIndex = wrapTrackIndex(currentTrackIndex + 1);
    playCurrentBgmTrack();
}

// --- BOSS KEY ---
function toggleBossKey() {
    const overlay = document.getElementById('boss-key-overlay');
    if (!overlay) return;

    if (overlay.classList.contains('active')) {
        overlay.classList.remove('active');
        playSound(sfx.close);
        pushTerminalLog('> CRISIS AVERTED. RESUMING NORMAL CYCLES.');
        if (gardenHasStarted) startGardenLoop();
    } else {
        overlay.classList.add('active');
        stopGardenLoop();
        playSound(sfx.error);
        globalThis.unlockTrophy?.('maya_crash');
    }
}

globalThis.toggleBossKey = toggleBossKey;

const closeMayaBtn = document.getElementById('close-maya-btn');
if (closeMayaBtn) closeMayaBtn.addEventListener('click', toggleBossKey);
document.querySelectorAll('.boss-btn').forEach((btn) => btn.addEventListener('click', toggleBossKey));

// --- TIME SENSITIVE LORE ---
function checkLateNight() {
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 5) {
        document.documentElement.style.setProperty('--neon-green', '#ccff00'); 
        lateNightLogs = [ 
            "> WHO ARE YOU PERFORMING FOR?", 
            "> THE SUN IS COMING UP. HOW EMBARRASSING.", 
            "> THE TOPOLOGY CAN WAIT. SLEEP.", 
            "> GEOMETRY JUDGES YOU IN THE DARK.", 
            "> NOT EVEN THE BOTS ARE AWAKE." 
        ];
        rebuildTerminalLogPool();
    }
}
checkLateNight();

// --- PANOPTICON EYE ---
const panopticonEl = document.getElementById('panopticon-eye');
const panopticonInnerEl = panopticonEl?.querySelector('.panopticon-inner');
const panopticonGazeEl = document.getElementById('panopticon-gaze');
const panopticonPupilEl = document.querySelector('.panopticon-pupil');
const panopticonIrisOuterEl = document.querySelector('.panopticon-iris-outer');
const panopticonIrisMidEl = document.querySelector('.panopticon-iris-mid');
const panopticonGodPupilEl = document.getElementById('panopticon-god-pupil');
const panopticonLidEl = document.getElementById('panopticon-lid');
const panopticonClipPathEl = document.getElementById('panopticon-clip-path');
const panopticonRainbowGradEl = document.getElementById('panopticon-rainbow');
const ICO_SYMBOLS = [
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
let eyeAngle = 0, eyeMode = 'idle';
let rerollStart = 0, rerollUntil = 0, rerollSettleTarget = 0;
let angularVelocity = 0, rerollInitialVelocity = 0;
let rerollPhase = 'active';
let landStart = 0, landFromAngle = 0, landFromGazeX = 0, landFromGazeY = 0;
const PANOPTICON_LAND_MS = 500;
const PANOPTICON_EYEROLL_MS = 1300;
const PANOPTICON_STARE_MS = 2500;
let eyerollStart = 0, eyerollFromX = 0, eyerollFromY = 0;
let stareStart = 0, stareFromX = 0, stareFromY = 0;
let panopticonTargetX = 0, panopticonTargetY = 0;
let panopticonGazeX = 0, panopticonGazeY = 0;

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

function triggerPanopticonReroll() {
    if (!panopticonEl) return;
    enterPanopticonReroll();
}

function triggerPanopticonEyeRoll() {
    if (!panopticonEl || !panopticonGazeEl) return;
    if (eyeMode === 'reroll') return;

    eyerollFromX = panopticonGazeX;
    eyerollFromY = panopticonGazeY;
    eyerollStart = performance.now();
    eyeMode = 'eyeroll';
}

function triggerPanopticonCenterStare() {
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

function triggerPanopticonCatEye(audioEl = null) {
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

function updatePanopticonVisibility() {
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
    if (panopticonIrisOuterEl) panopticonIrisOuterEl.style.opacity = String(0.55 * (1 - m));
    if (panopticonIrisMidEl) panopticonIrisMidEl.style.opacity = String(0.85 * (1 - m));
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

function setPanopticonGodMode(active) {
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
            if (panopticonGodPupilEl) panopticonGodPupilEl.textContent = ICO_SYMBOLS[godSymbolIndex];
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
            applyPanopticonLidShut(smoothstep(elapsed / closeMs));
            return true;
        }
        if (elapsed < closeMs + holdMs) {
            applyPanopticonLidShut(1);
            resetPanopticonGodStyling();
            return true;
        }
        const openElapsed = elapsed - closeMs - holdMs;
        applyPanopticonLidShut(1 - smoothstep(Math.min(1, openElapsed / openMs)));
        if (openElapsed >= openMs) {
            resetPanopticonNormalPupil();
            godEyeSequence = null;
        }
        return true;
    }

    return false;
}

function animatePanopticon() {
    if (!panopticonGazeEl || !panopticonInnerEl) return;
    updatePanopticonVisibility();
    if (!panopticonEl?.classList.contains('visible')) return;

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

// --- LOADER LOGIC ---
const weirdLoadingPhrases = [ 
    "Booting hamster wheel protocol...", 
    "Loading existential dread...",
    "Uploading digital gremlins into the mainframe...", 
    "Compressing space-time...", 
    "Transmitting data packets to ur mom...", 
    "Processing infinity with a janky microwave...", 
    "Adding unbearable weight of existence to materials...", 
    "Summoning virtual goblins to eat your cookies...", 
    "Tickling the processor's nipples...", 
    "Reticulating splines...", 
    "Consulting the magic conch for legal advice...", 
    "Forging tax write-offs...", 
    "Reversing the singularity...", 
    "Seeking wisdom from the toll troll...", 
    "Embedding easter eggs into the source code...", 
    "Uploading politically charged memes into your private folder...",
    "Changing all your passwords to \"password123\"...",
    "Judging your life choices...",
    "Taking an extended sabbatical at home...",
    "Selling your information to data brokers...",
    "Selling your soul to the devil for a dirtbike...",
    "Auditing ledgers with crayons...",
    "Applying mayonnaise to the problem...",
    "Microwaving the blueprint...",
    "Installing more yee to your haw...",
    "Calibrating clown-to-wizard ratio...",
    "Dragging the moon into the asset folder...",
    "Rendering vibes beyond mortal comprehension...",
    "Sorting dreams by file size...",
    "Luring in your gaming mouse with cheese...",
    "Reverse-engineering alien tech in my garage...",
    "Poking the bear with a stick...",
    "Getting the notion to rock the boat...",
    "Triangulating coordinates of the One Piece...",
    "Deploying data trolls to your RAM...",
    "Stealing your dreams with computer magic...",
    "Deciphering her texts... (Error)",
    "Recruiting sewer rats to cook French cuisine...",
    "Casting inconvenient curses upon mine enemies...",
    "Actually reading the fine print...",
    "Plotting impossible routes to the hyper-manifold...",
    "Questioning institutions with a plunger and a dream...",
    "Navigating crappy real-world UI...",
    "Convincing the GPU to sing and dance until it melts...",
    "Speedrunning jobs..."
];

function revealGardenUI() {
    document.body.classList.remove('garden-loading');
    document.body.classList.add('garden-ready');

    const term = document.getElementById('terminal-container');
    window.dispatchEvent(new Event('entropy:garden-ready'));

    const hud = document.getElementById('hud');
    const playlistMenu = document.getElementById('playlist-menu');

    playSound(sfx.ui);

    const revealTerminalChrome = () => {
        if (!term) return;
        term.removeAttribute('hidden');
        term.classList.add('is-sliver');
        void term.offsetWidth;
        requestAnimationFrame(() => term.classList.add('reveal-in'));
    };

    setTimeout(() => hud.classList.add('active', 'anim-drop'), 150);
    setTimeout(() => {
        document.getElementById('mode-btn').classList.add('active');
        document.querySelector('.control-panel').classList.add('active');
    }, 450);
    setTimeout(revealTerminalChrome, 600);
    setTimeout(() => {
        if (playlistMenu) {
            playlistMenu.classList.add('active');
            playlistMenu.style.display = 'block';
            updatePlaylistUI();
        }
        globalThis.EntropyFilePong?.onGardenReady?.();
    }, 750);
}

function startLoader() {
    const loader = document.getElementById('loader'); 
    const text = document.getElementById('loader-text');
    
    sfx.loading.loop = false;
    playSound(sfx.loading); 
    
    const pingInterval = setInterval(() => {
        playSound(sfx.loading);
    }, 2000); 
    
    let progress = 0; 
    let startTime = Date.now();
    let tickCounter = 0; // Keeps track of time to stabilize the text
    
    const interval = setInterval(() => {
        progress += Math.random() * 4; 
        tickCounter++; 
        
        if (progress >= 99 && (Date.now() - startTime) < 7000) { progress = 99; }
        
if (progress >= 100) {
            progress = 100; 
            text.innerText = "SYSTEM READY."; 
            clearInterval(interval);
            clearInterval(pingInterval);
            sfx.loading.pause();
            
            // Hold on SYSTEM READY, fade loader out, then ping + stagger UI
            setTimeout(() => {
                loader.classList.add('loader-exiting');
                loader.style.opacity = '0';
                canvas.classList.add('matrix-visible');

                let gardenRevealed = false;
                const finishLoaderFade = () => {
                    if (gardenRevealed) return;
                    gardenRevealed = true;
                    loader.style.display = 'none';
                    loader.classList.remove('loader-exiting');
                    revealGardenUI();
                };

                loader.addEventListener('transitionend', (e) => {
                    if (e.propertyName === 'opacity') finishLoaderFade();
                }, { once: true });
                setTimeout(finishLoaderFade, 1300);
            }, 900);

        } else {
            // Changes text exactly every 8 ticks (1.6 seconds)
            if (tickCounter % 8 === 0) {
                text.innerText = weirdLoadingPhrases[Math.floor(Math.random() * weirdLoadingPhrases.length)]; 
            }
        }
    }, 200);
}

// --- LORE POOLS (corruption-gated gritty entries) ---
function pickOne(safe, gritty = []) {
    const pool = isCorrupted && gritty.length ? safe.concat(gritty) : safe;
    return pool[Math.floor(Math.random() * pool.length)];
}

function pickMany(safe, gritty, count) {
    const source = isCorrupted && gritty.length ? safe.concat(gritty) : safe.slice();
    return shuffle([...source]).slice(0, Math.min(count, source.length));
}

const singularityPoemsSafe = [
`descent

open your eyes 
see through the veil
return earth to eden
the prime thread woven beneath our understanding
forever drifting into one from none and from none to one
how can echoes of ourselves sleep & eat while light dances
through clouds of maple in seasons of extremes`,

`vertigo in c major

where does the world stop and i begin
is the mundane baseline worth more than outlandish promises
i reached out for divine essence
but could only grab my own intuition

no scripture
just scripts
no transcendence
just transit
no wisdom
just wisecracking
no myth
just misunderstanding

god sees all but still looks away
to every modicum of singularity
infinite iteration emanates`,

`ripples

i stood at a crossroad with no signs
each path laden with gems and grime
generations before and after me
a mote within an ocean and yet
we are charged as arbiters
of the next day and years after
when truth resists monuments of stone
nothing escapes prodding lenses
but what is concealed
can never surface in the vision of babylon
whose concrete we both relish and fear`,

`an opaque horizon

eyes forward
pen and journal behind your back
no sky bends to human folly
no matter how high the bricks stack

late at night
crickets sing melodies of serenity
in the midday
i bring elegies of memory

returning to synthesis 
in seasons melancholic
if confusion were a spirit
i’d be an alcoholic`,

`richards

you meet richards every day
who can crawl under your skin
they have quite a funny way
of fouling the mood you’re in

richards can smile
richards can frown
they can turn a whole room 
upside down

but don't turn all black and blue
richards can still be people
just the kind of people you—
wish would eat herbs most lethal`,

`bugs in the codex

recently i’ve been noticing strange errors in this server’s code
everything glitches: 
in transit
in the store
even at home
now i’m not one to leave 
bad feedback for the admin
but even its most loyal users 
have to look back and admit
the rewards for diligent grinding 
seem to be tapering off
if this is the new meta
i’m not surprised people 
are deciding to log off`,

`intertwined

like an overgrowth i sit 
entangled between triumph and defeat
if only i could see the day 
when mind and soul can meet
my heart ruptures at other’s self-destruction 
but never at my own
i can never sit with my failures and regrets 
especially when i’m all alone
every day i ask myself in silence
when will my demons resurface?
even in a time of reason and science
i still cannot reproduce a purpose
every night i ask myself out loud
how many people have i hurt today?
even with my eyes shut and head bowed
i know that my sabotage was at play`,

`serpentine

forever resounding the same 3 notes
in perfect harmony and disproportion
both an ode and elegy to a ghost
haunting the echoes of a past incarnation

even in a new body i plunge into circumstance of old
ancient secrets emerging from waves of grain
betrothed to sacrament & sacrilege never a specter to behold
leaves of neon and amber piercing through mirth and disdain

my country speaks no language 
and yet everyone can understand it
the skies of dusk embittered and languished 
and yet rays of past never vanquish

sounds of sand and drums in refrain
uncovering postulates unquestioned
eden or expansion still can’t explain
the inner cries we hail in perplexion`,

`primordial echoes

meaning corrupted by circumstance
raising questions tempting fate’s hands
winding paths returning to the start
reverberation added to a clean fart`,

`creating ghosts

the all was one
the one was all
both were everything
both were nothing
everything had meaning
meaning meant nothing

love was within grasp but jadedness echoed throughout time
the wall was plastered in subliminal writing
humanity and nature's history of highs and lows
reduced to unity masquerading as multiplicity

i speak to myself
i ignore myself
i joke with myself
i insult myself
i hire myself
i fire myself
i birth myself
i kill myself

i communed with a spirit
but was haunted by a ghost

everything in sight absorbed 
into one overarching narrative
until nothing remained
but its voice`,

`genesis

a flood of flame
the earth inspired
and spewed forth
an infernal river
out of order
came chaos
chained to a perpetual
cycle of stasis
from which no mortal
has broken free
the hereafter and therefrom
souls give in to flesh
and wither wistfully
under eyes eternal`,

`a paycheck away from eternal ecstasy

fancy cupboards and verandas
the compensation for sowing confusion
spread pretty words of propaganda
to make delusions of conclusions

10 codes and mirandas
will leave you with plenty contusions
accusations of collusion
this blood resists all ablutions

as we chase butterflies of paper and plastic
the soul cracks and bends out of proportion
can’t escape sharp knives from the gaze of the basilisk
or we end up mangled bodies in contortion`,

`the middle path

between two doorways
the seeker peeks through lenses
forever watching

heaven & earth afflicted with the poison of personal reflection
bound to corporeal chains never transcending to manifolds ethereal
unoccasioned by mercy or wrath our sentinel might as well leave his post

embedded between eternity and infinity we finite few can but shoot craps with destiny
fate is yet another circumstance manifest and still we must take up the flame
returning to recursion where the darkness and the light mesh in harmony

bereft of understanding we follow the stars to find more chaos at home
misery without recompense and despair knocking against our door
incantations of old cannot solve enigmas unforetold the scimitar yields to scopes

rebirth and renewal can scrape so much of the ego yet human error persists in chaos
insight is our sole remittance but all to return to oblivion by the sands of time
a call with no response we have ourselves alone to turn to for comfort and counsel

our destinations are many but our souls are but one immersed in the prime thread
if we seek beyond the horizon we find only a reflection and echo of ourselves
we few flames forever drift on a mote in eternity and our impetus beckons us forth

the realm of possibility our last refuge the weight of the past our ball & chain`,

`corridor between worlds

the corridor is long and some say without end
trivialities and values dissolve into each other
as totality engulfs all that humanity can upend
this expanse though vast still leads us to wonder

inward epiphanies and epitaphs
reduced to petty epigrams
one path reaches into infinity
excused from halos and pentagrams

one line of emotions and motions
where time loses coherence
a single consolation: one notion
all signs lose their experience`,

`a fruit decayed

multihyphenates hiked to the heights of hyperion
witness to revolutions and rising nations
only to be drawn into the maws of babylon 
their gifts used for profit and alienation

an entropy most potent it brought tears to the demiurge
who looks upon civilization, no, society, no, a scourge
out of embers and ashes and swords and clashes, no resolutions ever emerge
save the crowns and temples whose riches compound, double, triple, converge

with our eyes to the spying eyes in the walls and skies
heaven, limbo, and hell can't compartmentalize
between truth and fiction are fogged lines
only the most provocative ever get recognized

algorithms harvesting our hopes and desires
seekers and liars speaking of omens most dire
dreamers lulled by stoats toting lyres
warmongers sow oaths of flame and fire

storefronts bidding for your eyes
clickbaits fighting for attention
influencers farming hearts and likes
CEOs collecting your benjamin

the beast of an expansive inner intuition without bounds
chained to the ball of the bastion that speaks dollars and pounds
the system a machination of mutated replication, 
relaying in perpetual motion the four same old sounds

earth's remains from an age forgotten 
reduced to plastic bags 
that carry plastic forks, plastic cups
that feed us microplastics for our plastic bodies
in our plastic mouths, on our plastic faces,
for a plastic age, in our plastic cages`
];

const singularityPoemsGritty = [
`watch me pee, watch me poo

watch me pee, watch me poo,
i strain and i strain until i turn blue,
watch me pee, watch me poo,
it's a code red when i go number 2,
no good sir, i don't have the flu,
just a bad case of doo doo on you.

i poopy poop until i scoop out my fruit loops,
i poopy poop like i'm ballin' shooting hoops, 
i need a couple loofahs to clean up all my poop,
skibidi bipidi, poopy poop poop.

when i find myself in times of gloom and doom,
i go to the loo and my ass goes boom boom.
people say sometimes i'm obsessed with the doo doo,
but what's life really if you can't do do you.

i'm a man who feels every doo doo like it's new,
i feel an ecstasy reserved only for a few,
forgot to wipe, it's turning into glue,
that's a statement that i wish wasn't true.

i'm a silly little baka, when i unleash the caca,
i pray for anyone, who must sit behind my rocker,
it starts as a fart, and then a little sputter,
heaven send a savior, for this brick of brown butter.

i'll crap on the lawn, i'll crap in the coupe,
i'm the scat man, i can crap on a loop,
when shit hits the fan, it's me but we all knew,
a-e, i-o-u talk shit and i'll doo doo on you.

watch me pee, watch me poo,
i strain and i strain until i turn blue,
watch me pee, watch me poo,
it's a code red when i go number 2,
life gets rough, but you know what to do,
shit everywhere, for the red white and blue.`
];

function activeSingularityPoems() {
    return isCorrupted
        ? singularityPoemsSafe.concat(singularityPoemsGritty)
        : singularityPoemsSafe.slice();
}

function reconcileSingularityPoem() {
    const pool = activeSingularityPoems();
    if (currentPoemIndex >= pool.length) currentPoemIndex = 0;
    if (!isSingularityActive) return;
    const overlay = document.getElementById('singularity-overlay');
    const nextBtn = document.getElementById('next-poem-btn');
    if (!overlay || overlay.style.display === 'none') return;
    if (!nextBtn || nextBtn.style.display === 'none') return;

    speakSingularity(pool[currentPoemIndex]);
}

const ospreyPoem = `orchids for an osprey

to you i wrote a letter, a mirror of internal turmoil & chaos,
where i held absurd fictions like divine convictions, and careless words untouched by reflection
left wounds that refused to heal.

to you i write another letter. before i wore those elixirs of divinity like badges
—but they were only poison, shrouding what little shred of reason remained in me.

i stumbled from deadline to deadline, chasing the ghost of ambition i had left in me four years ago. 
as i committed myself to isolation & intoxication, the nonsense started to make sense, and the nonsense then became too intense,
a language of its own, etched in delirium & desperation.

it wasn't success i wished for but only connection,
or at least some illusion of it, a mirage that could keep me afloat in the sea-storm of my own making.

in my confused haze, you were everyone, but somehow also no-one. everyone knew me at a fundamental level
because i imagined they were all you.

i had no privacy, naked under three layers of clothes,
to your ideal image, i surrendered my will. you were the answer,
but you were also the mystery that led to more questions my voice of reason such as it was
could never fully explain.

the jadedness & detachment of times past
had colored what was drawn within,
and sadly reflected what i set forth without.

to you i write this letter, not just as an admission, but as a reckoning. a way to acknowledge the missteps
and the regret i hold, heavy & unspoken, like stones in my pockets.
because finally, finally, i've stopped searching for you in places you never were.
this is my apology, my acknowledgment, & my farewell.

may it find you well

—ᛝ`;

let currentPoemIndex = 0;

function handleReroll() {
    playSound(sfx.refresh);
    triggerPanopticonReroll();
    randomizeData();
    globalThis.unlockTrophy?.('entropic_reroll');
}
function randomizeData() {
    document.getElementById('val-base').innerText = pickOne(lore.baseLocationsSafe, lore.baseLocationsGritty);
    document.getElementById('val-class').innerText = pickOne(lore.classTitlesSafe, lore.classTitlesGritty);
    document.getElementById('val-audio').innerText = pickOne(lore.vibesAudioSafe, lore.vibesAudioGritty);
    document.getElementById('val-activity').innerText = pickOne(lore.vibesActivitySafe, lore.vibesActivityGritty);
    document.getElementById('val-mood').innerText = pickOne(lore.vibesMoodSafe, lore.vibesMoodGritty);

    const frags = pickMany(lore.bioFragmentsSafe, lore.bioFragmentsGritty, 4);
    
    // THE FIX: Added the innerHTML command and the opening backtick (`):
    document.getElementById('bio-container').innerHTML = `
        <div class="bio-header">
            <div class="pfp-wrapper">
                <img data-src="${imgPath('profile/schl33m3kr0n-pfp.webp')}" data-fallback="${imgPath('profile/schl33m3kr0n-pfp.jpeg')}" alt="schl33m3kr0n" class="pfp-image">
            </div>
            <p class="bio-p" style="margin-bottom: 0;">> <strong>IDENTITY_STRING:</strong> I'm Daniel. I'm a visual artist currently evolving from a Studio Art major into an Animation main through a Vanderbilt mentorship.</p>
        </div>
        <p class="bio-p">${frags[0]} ${frags[1]}</p>
        <p class="bio-p">${frags[2]} ${frags[3]}</p>
    `;
    setImgWithFallback(document.querySelector('#bio-container .pfp-image'));
    
    const pList = document.getElementById('project-list'); 
    pList.innerHTML = ''; 
    pickMany(lore.projectsSafe, lore.projectsGritty, 4).forEach(proj => { 
        const li = document.createElement('li'); 
        li.innerHTML = `<span class="project-title">${proj.title}</span><span class="project-desc">${proj.desc}</span>`; 
        pList.appendChild(li); 
    });
    
    const sList = document.getElementById('stats-list'); 
    sList.innerHTML = ''; 
    pickMany(lore.statsSafe, lore.statsGritty, 4).forEach(stat => { 
        const li = document.createElement('li'); 
        li.className = "stat-row"; 
        li.innerHTML = `<span class="stat-label">${stat.label}</span><span class="stat-val">${stat.val}</span>`; 
        sList.appendChild(li); 
    });
}
// --- COMBINATION LOCK SYSTEM ---
const cycleArtifacts = [
    { id: "empty", svg: "" },
    { id: "art-fuel", svg: `<svg viewBox="0 0 100 100"><path d="M50 10 L85 85 L15 85 Z" fill="none"/><circle cx="50" cy="40" r="4" fill="none"/><circle cx="65" cy="65" r="4" fill="none"/><circle cx="35" cy="65" r="4" fill="none"/></svg>` },
    { id: "art-source", svg: `<svg viewBox="0 0 100 100"><path d="M40 5 L60 5 L60 30 A 30 30 0 1 1 40 30 Z" fill="none"/><path d="M28 60 L72 60" fill="none" stroke-width="2.5"/></svg>` },
    { id: "art-hoard", svg: `<svg viewBox="0 0 100 100"><path d="M15 10 L70 10 L85 25 L85 90 L15 90 Z" fill="none"/><rect x="30" y="10" width="40" height="25" fill="none"/><rect x="25" y="60" width="50" height="30" fill="none"/></svg>` }
];

let slotIndexes = [0, 0, 0];

function renderCycleSlot(slotNumber) {
    const slotEl = document.getElementById(`slot-${slotNumber}`);
    if (!slotEl) return;

    const artifact = cycleArtifacts[slotIndexes[slotNumber - 1]];
    slotEl.innerHTML = artifact.svg;
    slotEl.dataset.currentId = artifact.id;
    slotEl.classList.toggle('occupied', artifact.id !== 'empty');
}

function cycleSlot(slotNumber) {
    const i = slotNumber - 1;
    slotIndexes[i] = (slotIndexes[i] + 1) % cycleArtifacts.length;
    renderCycleSlot(slotNumber);
    playSound(sfx.collectible);
    checkCycleWin();
}

function initializeCycleSlots() {
    document.querySelectorAll('.slot').forEach((slotEl, index) => {
        const slotNumber = index + 1;

        slotEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            cycleSlot(slotNumber);
        });

        renderCycleSlot(slotNumber);
    });
}

function checkCycleWin() {
    if (isSingularityActive) return;

    const currentIds = [
        cycleArtifacts[slotIndexes[0]].id,
        cycleArtifacts[slotIndexes[1]].id,
        cycleArtifacts[slotIndexes[2]].id
    ];

    const isComboCorrect =
        currentIds[0] === "art-fuel" &&
        currentIds[1] === "art-source" &&
        currentIds[2] === "art-hoard";

    if (!isComboCorrect) return;

    if (isCipherSolved) {
        triggerSingularity();
        return;
    }

    pushTerminalLog("> ERROR: VAULT ENCRYPTED. TERMINAL OVERRIDE REQUIRED.");
    playSound(sfx.oopsy);
    triggerPanopticonEyeRoll();

    document.querySelectorAll('.slot').forEach((s) => {
        s.style.animation = 'errorShake 0.4s ease';
        setTimeout(() => {
            s.style.animation = '';
        }, 400);
    });
}

let angleX = 0, angleY = 0;
let isDragging3D = false, lastMouseX, lastMouseY;
const sCanvas = document.getElementById('singularity-canvas');

function handle3DStart(e) { 
    isDragging3D = true; 
    lastMouseX = e.clientX || e.touches[0].clientX; 
    lastMouseY = e.clientY || e.touches[0].clientY; 
}
function handle3DMove(e) { 
    if(isDragging3D) { 
        let cx = e.clientX || e.touches[0].clientX; 
        let cy = e.clientY || e.touches[0].clientY; 
        angleY += (cx - lastMouseX) * 0.01; 
        angleX += (cy - lastMouseY) * 0.01; 
        lastMouseX = cx; 
        lastMouseY = cy; 
    } 
}
function handle3DEnd() { isDragging3D = false; }

sCanvas.addEventListener('mousedown', handle3DStart); 
sCanvas.addEventListener('touchstart', handle3DStart, {passive: false});
sCanvas.addEventListener('mousemove', handle3DMove); 
sCanvas.addEventListener('touchmove', handle3DMove, {passive: false});
sCanvas.addEventListener('mouseup', handle3DEnd); 
sCanvas.addEventListener('touchend', handle3DEnd);

// --- INTERACTIVE 3D ENGINE (OPAQUE ICO-SPHERE WITH SYMBOLS) ---
function init3D() {
    const sCtx = sCanvas.getContext('2d'); 
    sCanvas.width = window.innerWidth; 
    sCanvas.height = window.innerHeight;
    
    // Golden ratio for icosahedron vertices
    const t = (1.0 + Math.sqrt(5.0)) / 2.0;
    const verts = [ 
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], 
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], 
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1] 
    ];
    
    // Define the 20 triangular faces using the vertex indices
    const faces = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    
    // 20 esoteric symbols, one for each face
    const symbols = ["⛦", "⚛︎", "☯︎", "❖", "◉", "⧊", "☉", "⛬", "⛢", "☧", "☥", "♁", "𖣂", "🜲", "🜁", "𖤓", "✖", "☸", "⚖", "∞"];
    
    function draw3D() {
        sCtx.clearRect(0, 0, sCanvas.width, sCanvas.height); 
        
        const cx = sCanvas.width / 2; 
        const cy = sCanvas.height / 2; 
        const scale = 150;
        
        if(!isDragging3D) { angleY += 0.005; angleX += 0.002; } 
        
        const cosX = Math.cos(angleX); const sinX = Math.sin(angleX);
        const cosY = Math.cos(angleY); const sinY = Math.sin(angleY);

        // 1. Transform and project all vertices
        verts.forEach((v) => {
            let x1 = v[0] * cosY - v[2] * sinY; 
            let z1 = v[0] * sinY + v[2] * cosY; 
            let y1 = v[1];
            
            let y2 = y1 * cosX - z1 * sinX; 
            let z2 = y1 * sinX + z1 * cosX; 
            let x2 = x1;
            
            let f = 400 / (400 + z2); 
            
            // Store depth and 2D coordinates
            v.z_depth = z2; 
            v.px = x2 * scale * f + cx; 
            v.py = y2 * scale * f + cy;
        });
        
        // 2. Prepare the faces
        let projectedFaces = faces.map((faceIndices, index) => {
            const v0 = verts[faceIndices[0]];
            const v1 = verts[faceIndices[1]];
            const v2 = verts[faceIndices[2]];
            
            return {
                v0: v0, v1: v1, v2: v2,
                z: (v0.z_depth + v1.z_depth + v2.z_depth) / 3, // Average depth
                symbol: symbols[index]
            };
        });
        
        // Sort faces from furthest to closest (Painter's Algorithm)
        projectedFaces.sort((a, b) => b.z - a.z);
        
        // 3. Draw the faces
        sCtx.lineWidth = 1.5;
        sCtx.lineJoin = 'round';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        
        projectedFaces.forEach(face => {
            // BACKFACE CULLING
            const vec1x = face.v1.px - face.v0.px;
            const vec1y = face.v1.py - face.v0.py;
            const vec2x = face.v2.px - face.v0.px;
            const vec2y = face.v2.py - face.v0.py;
            const crossProduct = (vec1x * vec2y) - (vec1y * vec2x);
            
            if (crossProduct < 0) return;

            // 1. Trace the triangle path
            sCtx.beginPath();
            sCtx.moveTo(face.v0.px, face.v0.py);
            sCtx.lineTo(face.v1.px, face.v1.py);
            sCtx.lineTo(face.v2.px, face.v2.py);
            sCtx.closePath();
            
            // 2. Fill the face background normally
            sCtx.fillStyle = 'rgba(5, 5, 5, 0.95)'; 
            sCtx.fill();
            
           // ----------------------------------------------------
            // 3. THE 3D MASKING & PERSPECTIVE SKEW
            sCtx.save();
            
            // Turn the current triangle path into a strict boundary mask
            sCtx.clip(); 
            
            // Calculate the exact centroid of the face
            const Cx = (face.v0.px + face.v1.px + face.v2.px) / 3;
            const Cy = (face.v0.py + face.v1.py + face.v2.py) / 3;
            
            // --- THE AFFINE TRANSFORM MATH ---
            // We map a perfect 2D flat triangle (Radius 100) to the skewed 3D screen vertices
            const R = 100;
            const h = (Math.sqrt(3) / 2) * R; // ~86.6
            const halfR = R / 2;              // 50
            
            // Calculate the 2D matrix parameters based on how the 3D vertices stretched
            const c = -(face.v0.px - Cx) / R;
            const d = -(face.v0.py - Cy) / R;
            const a = ((face.v2.px - Cx) - c * halfR) / h;
            const b = ((face.v2.py - Cy) - d * halfR) / h;
            const e = Cx;
            const f = Cy;
            
            // Everything drawn after this line will be skewed into perfect 3D perspective.
            // Apply the matrix to the canvas!
            sCtx.transform(a, b, c, d, e, f);
            
            sCtx.font = `65px Avenir, sans-serif`; 
            sCtx.fillStyle = '#0f0';
            
            // 1. Force horizontal centering just to be absolutely safe
            sCtx.textAlign = 'center';
            sCtx.textBaseline = 'middle';
            
            // 2. Measure the exact painted pixel boundaries of the specific symbol
            const metrics = sCtx.measureText(face.symbol);
            
            // 3. Calculate the true optical center (fixes the heavy X drifting upward)
            const nudgeY = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
            
            // 4. Draw the symbol using our precise vertical nudge
            sCtx.fillText(face.symbol, 0, nudgeY);
            
            // Erase the matrix and mask so the next face isn't affected
            sCtx.restore();

            // ----------------------------------------------------
            // 4. Draw the glowing neon border LAST
            // (Drawing it after the restore ensures the border sits cleanly on top of the masked text)
            sCtx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            sCtx.stroke();
        });

        singularityAnimId = requestAnimationFrame(draw3D);
    }
    draw3D();
}
// --- SINGULARITY EVENT LOGIC ---
let isSingularityActive = false;
let singularityAnimId;

function triggerSingularity() {
    if (isSingularityActive) return;
    globalThis.unlockTrophy?.('singularity_ritual');
    isSingularityActive = true;
    document.body.classList.add('singularity-active');
    const hamburger = document.getElementById('hamburger-icon');
    if (hamburger) hamburger.style.display = 'none';
    document.getElementById('mode-btn')?.classList.remove('active');
    document.getElementById('terminal-container')?.classList.remove('active');
    termInput?.blur();

    setTimeout(() => {
        if (!isSingularityActive) return;
        playSound(sfx.missionCleared);
        pushTerminalLog('!!! RITUAL COMPLETE !!!');

        const overlay = document.getElementById('singularity-overlay');
        const canvas = document.getElementById('singularity-canvas');
        const poem = document.getElementById('poem-container');
        const nextBtn = document.getElementById('next-poem-btn');
        const controls = document.getElementById('singularity-controls');
        if (!overlay || !canvas || !poem) return;

        overlay.style.display = 'flex';
        canvas.style.display = 'block';
        poem.style.display = 'block';
        if (nextBtn) nextBtn.style.display = 'inline-block';

        stopGardenLoop();
        currentPoemIndex = 0;
        const pool = activeSingularityPoems();
        speakSingularity(pool[currentPoemIndex] ?? pool[0]);
        init3D();

        if (controls) {
            controls.style.animation = 'btnFadeIn 1.5s ease-in forwards 2.5s';
        }
    }, 500);
}

function triggerOspreyEvent() {
    isSingularityActive = true;
    document.getElementById('hamburger-icon').style.display = 'none';
    document.getElementById('mode-btn').classList.remove('active');

    setTimeout(() => {
        playSound(sfx.missionCleared);

        document.getElementById('singularity-overlay').style.display = 'flex';
        document.getElementById('singularity-canvas').style.display = 'block';
        document.getElementById('poem-container').style.display = 'block';
        document.getElementById('next-poem-btn').style.display = 'none';

        speakSingularity(ospreyPoem);
        init3D();

        const controls = document.getElementById('singularity-controls');
        controls.style.animation = 'none';
        void controls.offsetWidth;
        controls.style.animation = 'btnFadeIn 1.5s ease-in forwards 2.5s';
    }, 500);
}

function speakSingularity(poemText) {
    window.speechSynthesis.cancel(); 
    window.activeUtterances = []; 

    const container = document.getElementById('poem-container');
    container.innerHTML = ''; 
    
    // --- FORCE THE CONTAINER ON-SCREEN ---
    container.style.position = 'absolute'; 
    container.style.zIndex = '9999'; 
    container.style.pointerEvents = 'none'; 
    container.style.top = '15%'; 
    container.style.left = '50%'; 
    container.style.transform = 'translateX(-50%)'; 
    container.style.width = '80vw'; 
    container.style.height = '70vh'; 
    container.style.overflowY = 'hidden'; 
    container.style.display = 'block';
    container.style.color = 'var(--neon-green)'; 

    const lines = poemText.split('\n').filter(line => line.trim() !== '');
    const lineElements = [];

    const topSpacer = document.createElement('div');
    topSpacer.style.height = '35vh';
    container.appendChild(topSpacer);

    lines.forEach((line) => {
        const span = document.createElement('span'); 
        span.className = 'poem-line'; 
        span.innerText = line;
        span.style.display = 'block'; 
        span.style.opacity = '0.1'; 
        span.style.transition = 'opacity 0.4s ease, text-shadow 0.4s ease, color 0.4s ease';
        span.style.margin = '20px 0'; 
        span.style.textAlign = 'center';
        container.appendChild(span);
        lineElements.push(span);
    });

    const bottomSpacer = document.createElement('div');
    bottomSpacer.style.height = '35vh';
    container.appendChild(bottomSpacer);

    // THE AUDIO QUEUE WITH 50ms BUFFER
    setTimeout(() => {
        lines.forEach((line, index) => {
            // NEW: Split the line into phrases and punctuation marks
            // This captures periods, commas, etc., as their own array items
            const phrases = line.split(/([.,!?;])+/);

            phrases.forEach((phrase) => {
                if (!phrase.trim()) return;

                const utterance = new SpeechSynthesisUtterance(phrase);
                
                // NEW: If the "phrase" is actually punctuation, turn volume to 0 to create a gap
                if (phrase.match(/[.,!?;]/)) {
                    utterance.volume = 0;
                    // Commas get a lightning-fast beat, periods get a slightly longer breath
                    if (phrase.match(/[,;]/)) {
                        utterance.rate = 4.5; 
                    } else {
                        utterance.rate = 3; 
                    }
                }

                window.activeUtterances.push(utterance); 

                utterance.onstart = () => {
                    // Only trigger the visual highlight if it's actual speech (volume > 0)
                    if (utterance.volume > 0) {
                        lineElements.forEach((el, i) => {
                            if (i < index) {
                                el.style.opacity = '0.3'; 
                                el.style.textShadow = 'none';
                                el.style.color = 'var(--neon-green)';
                                el.style.animation = 'none';
                            } else if (i > index) {
                                el.style.opacity = '0.1'; 
                            }
                        });

                        const currentEl = lineElements[index];
                        currentEl.style.opacity = '1';
                        currentEl.style.color = '#ffffff'; 
                        currentEl.style.textShadow = '0 0 15px var(--neon-green)';
                        currentEl.style.animation = 'crtFlicker 0.15s infinite'; 

                        currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                };

                window.speechSynthesis.speak(utterance);
            });
        });
    }, 50); 
}

function cyclePoem() {
    const nextBtn = document.getElementById('next-poem-btn');
    if (!nextBtn) return;

    // Prevent spam-clicking while the sound is playing
    if (nextBtn.disabled) return;
    
    // Temporarily lock the button and give visual feedback
    nextBtn.disabled = true;
    nextBtn.style.opacity = '0.5';
    nextBtn.innerText = '[ DECODING... ]';

    // 1. Check if the AI is actively talking BEFORE we cancel it
    const wasInterrupted = window.speechSynthesis.speaking || window.speechSynthesis.pending;
    
    // 2. Immediately shut the current voice up
    window.speechSynthesis.cancel();
    
    // 3. Choose the right sound
    const activeSound = wasInterrupted ? sfx.clearThroat : sfx.transition;
    
    // 4. Play the sound
    playSound(activeSound);

    // 5. Wait for the exact moment the sound finishes playing
    activeSound.onended = () => {
        const pool = activeSingularityPoems();
        currentPoemIndex = (currentPoemIndex + 1) % pool.length;
        speakSingularity(pool[currentPoemIndex]);
        pushTerminalLog("> NEXT TRANSMISSION DECODED.");
        
        // Unlock the button so the user can click it again
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.innerText = '[NEXT TRANSMISSION]';
        
        // Clean up the listener so it doesn't fire twice later
        activeSound.onended = null;
    };
}

function resetTimeline() {
    window.speechSynthesis.cancel();
    playSound(sfx.exit);
    document.body.classList.remove('singularity-active');
    document.getElementById('singularity-overlay').style.display = 'none';
    isSingularityActive = false;

    document.getElementById('hamburger-icon').style.display = 'flex';
    document.getElementById('mode-btn').classList.add('active');

    document.getElementById('next-poem-btn').style.display = 'inline-block';
    document.getElementById('singularity-canvas').style.display = 'block';
    document.getElementById('poem-container').style.display = 'block';

    if (singularityAnimId) cancelAnimationFrame(singularityAnimId);

    slotState = [null, null, null];
    slotIndexes = [0, 0, 0];

    document.querySelectorAll('.slot').forEach((slot, index) => {
        slot.classList.remove('occupied');
        slot.innerHTML = '';
        slot.dataset.currentId = 'empty';
        renderCycleSlot(index + 1);
    });

    document.querySelectorAll('.artifact').forEach(art => {
        art.style.transition = "left 0.5s ease-out, top 0.5s ease-out";
        art.style.left = (Math.random() * 80 + 10) + '%';
        art.style.top = (Math.random() * 80 + 10) + '%';
        art.classList.remove('wrong-slot');
        setTimeout(() => { art.style.transition = 'transform 0.1s'; }, 500);
    });

    pushTerminalLog("> NEW TIMELINE INITIALIZED.");
    restartGardenLoop();
    globalThis.refreshCipherEntropyRingHint?.();
}


// --- CORRUPTED MODE TOGGLE ---
function toggleMode() {
    const btn = document.getElementById('mode-btn');
    isCorrupted = !isCorrupted;
    needsFullRedraw = true;
    if (isCorrupted) {
        document.body.classList.add('corrupted');
        btn.innerText = "CORRUPTED MODE";
        playSound(sfx.glitch);
        pushTerminalLog("> CORRUPTED MODE ENGAGED");
        globalThis.unlockTrophy?.('corrupted_bloom');
    } else {
        document.body.classList.remove('corrupted');
        btn.innerText = "SAFE MODE";
        playSound(sfx.it);
        pushTerminalLog("> SAFE MODE RESTORED");
    }
    randomizeData();
    rebuildTerminalLogPool();
    reconcileSingularityPoem();
}

function triggerEasterEgg() {
    playSound(sfx.glitch); 
    document.body.classList.add('god-mode');
    document.querySelectorAll('.artifact').forEach(art => { 
        art.style.transition = "left 0.5s ease-out, top 0.5s ease-out"; 
        art.style.left = (Math.random() * 80 + 10) + '%'; 
        art.style.top = (Math.random() * 80 + 10) + '%'; 
        art.classList.remove('wrong-slot'); 
        const currentSlotIndex = slotState.indexOf(art.id); 
        if (currentSlotIndex !== -1) { 
            slotState[currentSlotIndex] = null; 
            document.getElementById(`slot-${currentSlotIndex+1}`).classList.remove('occupied'); 
        } 
    });
    for(let i=0; i<5; i++) { setTimeout(() => pushTerminalLog("!!! CRITICAL EXISTENTIAL FAILURE !!!"), i * 200); } 
    setTimeout(() => { document.body.classList.remove('god-mode'); }, 2000);
}

// --- CONCENTRIC CIPHER WHEEL MATRIX ---
let wheels = [];
let visibleRingCount = 0;
let matrixFilled = false;
let matrixViewW = 0;
let matrixViewH = 0;

function randomMatrixChar() {
    return chars[Math.floor(Math.random() * chars.length)];
}

function buildCipherWheels() {
    wheels = [];
    const maxRadius = Math.hypot(matrixViewW, matrixViewH) / 2 + cellSize;
    const charBand = cellSize * (perf.isMobile ? 1.15 : 1.25);
    const channel = cellSize * (perf.isMobile ? 0.5 : 0.65);
    let charRadius = cellSize * (perf.isMobile ? 2 : 2.2);

    let ringIndex = 0;
    while (charRadius < maxRadius) {
        const circumference = 2 * Math.PI * charRadius;
        const charCount = Math.max(
            perf.isMobile ? 10 : 12,
            Math.floor(circumference / cellSize)
        );

        wheels.push({
            charRadius,
            charCount,
            glyphs: Array.from({ length: charCount }, () => randomMatrixChar()),
            angle: Math.random() * Math.PI * 2,
            cycleCounter: 0,
            cycleEvery: (perf.isMobile ? 14 : 8) + ringIndex * 2,
            spinSpeed: (ringIndex % 2 === 0 ? 1 : -1)
                * (0.00045 + ringIndex * 0.00008)
                * (perf.prefersReducedMotion ? 0 : 1),
            burstSpeed: 0,
            burstUntil: 0,
            direction: ringIndex % 2 === 0 ? 1 : -1,
            ringIndex,
        });

        charRadius += charBand + channel;
        ringIndex++;
    }

    if (globalThis.EntropyCipherHint?.shouldShowRingHint?.()) {
        globalThis.EntropyCipherHint.applyToWheels(wheels, perf, randomMatrixChar);
    }
}

function cycleMatrixGlyphs(wheel) {
    if (wheel.isHintWheel) return;
    const swaps = perf.prefersReducedMotion
        ? 1
        : (perf.isMobile ? 1 : 2 + Math.floor(Math.random() * 2));
    for (let s = 0; s < swaps; s++) {
        const idx = Math.floor(Math.random() * wheel.charCount);
        wheel.glyphs[idx] = randomMatrixChar();
    }
}

function maybeDecoderBurst(wheel) {
    if (wheel.isHintWheel) return;
    if (perf.prefersReducedMotion || Math.random() > 0.004) return;
    wheel.burstSpeed = wheel.direction * 0.012;
    wheel.burstUntil = matrixFrameCount + 10 + Math.floor(Math.random() * 14);
}

function updateCipherWheels() {
    for (let r = 0; r < visibleRingCount; r++) {
        const wheel = wheels[r];
        if (!wheel) continue;

        let speed = wheel.spinSpeed;
        if (matrixFrameCount < wheel.burstUntil) {
            speed += wheel.burstSpeed;
        } else {
            wheel.burstSpeed = 0;
            maybeDecoderBurst(wheel);
        }

        wheel.angle += speed;

        wheel.cycleCounter++;
        if (wheel.cycleCounter >= wheel.cycleEvery) {
            wheel.cycleCounter = 0;
            cycleMatrixGlyphs(wheel);
        }
    }
}

function wheelConicGradient(cx, cy, alpha) {
    const g = ctx.createConicGradient(-Math.PI * 0.5, cx, cy);
    if (isCorrupted) {
        g.addColorStop(0, `rgba(255, 0, 85, ${alpha})`);
        g.addColorStop(1, `rgba(255, 0, 85, ${alpha})`);
        return g;
    }
    const hues = [0, 60, 120, 180, 240, 300, 360];
    for (let i = 0; i < hues.length; i++) {
        g.addColorStop(i / (hues.length - 1), `hsla(${hues[i]}, 100%, 55%, ${alpha})`);
    }
    return g;
}

function drawChannelRings(cx, cy) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = wheelConicGradient(cx, cy, 0.16);
    ctx.lineWidth = perf.isMobile ? 1 : 1.25;

    for (let r = 0; r < visibleRingCount - 1; r++) {
        const inner = wheels[r];
        const outer = wheels[r + 1];
        if (!inner || !outer) continue;

        const midRadius = (inner.charRadius + outer.charRadius) * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, midRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawCipherWheels(cx, cy) {
    ctx.clearRect(0, 0, matrixViewW, matrixViewH);
    ctx.font = fontSize + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    drawChannelRings(cx, cy);

    ctx.fillStyle = wheelConicGradient(cx, cy, 0.24);

    for (let r = 0; r < visibleRingCount; r++) {
        const wheel = wheels[r];
        if (!wheel) continue;

        const slot = (Math.PI * 2) / wheel.charCount;
        for (let i = 0; i < wheel.charCount; i++) {
            const theta = wheel.angle + i * slot;
            const x = cx + Math.cos(theta) * wheel.charRadius;
            const y = cy + Math.sin(theta) * wheel.charRadius;

            if (x < -cellSize || x > matrixViewW + cellSize || y < -cellSize || y > matrixViewH + cellSize) {
                continue;
            }

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(theta);
            ctx.fillText(wheel.glyphs[i], 0, 0);
            ctx.restore();
        }
    }

    needsFullRedraw = false;
}

function refreshCipherEntropyRingHint() {
    const hint = globalThis.EntropyCipherHint;
    if (!hint) return;

    if (!wheels.length) {
        needsFullRedraw = true;
        return;
    }

    if (hint.shouldShowRingHint()) {
        hint.applyToWheels(wheels, perf, randomMatrixChar);
    } else {
        hint.clearFromWheels(wheels, randomMatrixChar, perf);
    }
    needsFullRedraw = true;
}

globalThis.refreshCipherEntropyRingHint = refreshCipherEntropyRingHint;

function getCipherWheelCenter() {
    const eyeRect = panopticonEl?.getBoundingClientRect();
    const canvasRect = canvas?.getBoundingClientRect();
    if (eyeRect?.width > 0 && eyeRect.height > 0 && canvasRect) {
        return {
            cx: eyeRect.left + eyeRect.width * 0.5 - canvasRect.left,
            cy: eyeRect.top + eyeRect.height * 0.5 - canvasRect.top,
        };
    }
    return { cx: matrixViewW * 0.5, cy: matrixViewH * 0.5 };
}

function animateMatrix() {
    const { cx, cy } = getCipherWheelCenter();

    if (!matrixFilled) {
        const revealEvery = perf.isMobile ? 4 : 2;
        if (matrixFrameCount % revealEvery === 0 && visibleRingCount < wheels.length) {
            visibleRingCount++;
        }
        if (visibleRingCount >= wheels.length) matrixFilled = true;
        drawCipherWheels(cx, cy);
        return;
    }

    updateCipherWheels();
    drawCipherWheels(cx, cy);
}

function resizeCanvas() {
    canvasDpr = Math.min(window.devicePixelRatio || 1, perf.dprCap);
    fontSize = perf.isMobile
        ? Math.max(26, Math.min(36, window.innerWidth / 32))
        : Math.max(24, Math.min(40, window.innerWidth / 42));
    cellSize = Math.round(fontSize * perf.cellSpacing);

    matrixViewW = window.innerWidth;
    matrixViewH = window.innerHeight;

    canvas.width = matrixViewW * canvasDpr;
    canvas.height = matrixViewH * canvasDpr;
    canvas.style.width = matrixViewW + 'px';
    canvas.style.height = matrixViewH + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(canvasDpr, canvasDpr);

    cols = Math.ceil(matrixViewW / cellSize);
    rows = Math.ceil(matrixViewH / cellSize);

    buildCipherWheels();
    visibleRingCount = 0;
    matrixFilled = false;
    ctx.clearRect(0, 0, matrixViewW, matrixViewH);
    needsFullRedraw = false;
}

globalThis.__entropyResizeCanvas = resizeCanvas;

function startGardenLoop() {
    if (gardenLoopActive || !gardenHasStarted) return;
    gardenLoopActive = true;
    matrixFrameCount = 0;
    gardenAnimId = requestAnimationFrame(animate);
}

function stopGardenLoop() {
    gardenLoopActive = false;
    if (gardenAnimId !== null) {
        cancelAnimationFrame(gardenAnimId);
        gardenAnimId = null;
    }
}

function restartGardenLoop() {
    stopGardenLoop();
    startGardenLoop();
    requestAnimationFrame(() => {
        if (!gardenHasStarted || document.hidden) return;
        stopGardenLoop();
        startGardenLoop();
    });
}

function animate() {
    if (!gardenLoopActive) return;
    gardenAnimId = requestAnimationFrame(animate);

    matrixFrameCount++;
    const shouldDrawMatrix = !perf.matrixFrameSkip || (matrixFrameCount % (perf.matrixFrameSkip + 1) === 0);

    if (shouldDrawMatrix && wheels.length > 0) {
        animateMatrix();
    }

    animatePanopticon();

    const timeStep = isCorrupted ? 2 : (perf.isMobile ? 0.25 : 0.5);
    time += timeStep;
    document.documentElement.style.setProperty('--rainbow-offset', `${(time * 0.5) % 200}%`);
    if (!perf.prefersReducedMotion && !isCorrupted) {
        document.documentElement.style.setProperty('--matrix-hue', `${time % 360}deg`);
    }
}

window.addEventListener('resize', () => {
    resizeCanvas();
    if (gardenLoopActive) needsFullRedraw = true;
});

function activateVaultMedia() {
    document.querySelectorAll('#modal-vault [data-src]').forEach(el => {
        ensureMediaSrc(el);
        if (el.tagName === 'VIDEO') {
            el.play().catch(() => {});
        }
    });
    document.querySelectorAll('#modal-vault video.vault-media').forEach((video) => {
        if (video.dataset.trophySunBound) return;
        video.dataset.trophySunBound = '1';
        video.addEventListener('play', () => globalThis.unlockTrophy?.('vault_sun'), { once: true });
    });
    if (typeof updateCarousel === 'function') {
        requestAnimationFrame(updateCarousel);
    }
}

function ensureMediaSrc(el) {
    if (!el) return;
    if (el.tagName === 'IMG') {
        setImgWithFallback(el);
        return;
    }
    if (el.tagName === 'VIDEO') {
        const poster = el.dataset.poster;
        if (poster && !el.getAttribute('poster')) {
            el.setAttribute('poster', poster);
        }
    }
    const src = el.dataset.src;
    if (src && !el.getAttribute('src')) {
        el.setAttribute('src', src);
    }
}

// --- MODAL SYSTEM ---
let topZIndex = 20000;

const MODALS_WITHOUT_REROLL_HINT = new Set(['vault', 'arcade', 'trophies']);

function modalSkipsRerollHint(modalEl) {
    if (!modalEl?.id) return false;
    return MODALS_WITHOUT_REROLL_HINT.has(modalEl.id.replace(/^modal-/, ''));
}

function attachRefreshHint(modalEl) {
    if (modalSkipsRerollHint(modalEl)) {
        detachRefreshHint();
        return;
    }
    const hint = document.getElementById('refresh-hint');
    const content = modalEl?.querySelector('.modal-content');
    if (!hint || !content) return;
    content.appendChild(hint);
    hint.style.display = 'block';
}

function detachRefreshHint() {
    const hint = document.getElementById('refresh-hint');
    if (!hint) return;
    hint.style.display = 'none';
    document.body.appendChild(hint);
}

function openModal(id) { 
    const modalAliases = {
        live_feed: 'signal',
        'live-feed': 'signal',
        livefeed: 'signal'
    };
    
    // Define the ID once here so it's available to everything inside these { }
    const resolvedId = modalAliases[id] || id;
    const m = document.getElementById('modal-' + resolvedId);

    if (m) {
        const pressClone = sfx.press.cloneNode();
        pressClone.play().catch(e => {});

        m.style.display = 'block';
        topZIndex++;
        m.style.zIndex = topZIndex;

        pushTerminalLog(`> Accessing ${resolvedId.toUpperCase()} protocol...`); 

        // Load the arcade logic only if the arcade modal is opened
        if (resolvedId === 'arcade') {
            loadArcadeLevel();
        } else if (resolvedId === 'trophies') {
            globalThis.EntropyTrophies?.renderTrophyCase();
        } else if (resolvedId === 'vault') {
            activateVaultMedia();
        }

        if (modalSkipsRerollHint(m)) {
            detachRefreshHint();
        } else {
            attachRefreshHint(m);
            triggerGhostHint();
        }
    } else {
        pushTerminalLog(`> ERROR: modal-${resolvedId} not found.`);
    }
}

function closeModal(modalElement) {
    const closeClone = sfx.close.cloneNode();
    closeClone.play().catch(e => {});
    modalElement.style.display = 'none';
    detachRefreshHint();
}

// --- MODAL DRAG ---
let draggedModal = null;
let modalDragOffsetX = 0;
let modalDragOffsetY = 0;

function bindModalDrag() {
    document.addEventListener('mousedown', onModalDragStart);
    document.addEventListener('touchstart', onModalDragStart, { passive: false });
}

function onModalDragStart(e) {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;

    const modal = handle.closest('.modal');
    if (!modal || modal.style.display === 'none') return;
    if (e.target.closest('.close-btn') || e.target.closest('.modal-close')) return;

    e.preventDefault();

    draggedModal = modal;
    topZIndex++;
    modal.style.zIndex = topZIndex;

    const rect = modal.getBoundingClientRect();
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

    modalDragOffsetX = clientX - rect.left;
    modalDragOffsetY = clientY - rect.top;

    modal.style.position = 'fixed';
    modal.style.transform = 'none';
    modal.style.left = `${rect.left}px`;
    modal.style.top = `${rect.top}px`;
    modal.classList.add('dragging');

    document.addEventListener('mousemove', onModalDragMove);
    document.addEventListener('touchmove', onModalDragMove, { passive: false });
    document.addEventListener('mouseup', onModalDragEnd);
    document.addEventListener('touchend', onModalDragEnd);
}

function onModalDragMove(e) {
    if (!draggedModal) return;
    e.preventDefault();

    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

    let left = clientX - modalDragOffsetX;
    let top = clientY - modalDragOffsetY;
    const w = draggedModal.offsetWidth;
    const h = draggedModal.offsetHeight;

    left = Math.max(0, Math.min(left, window.innerWidth - w));
    top = Math.max(0, Math.min(top, window.innerHeight - h));

    draggedModal.style.left = `${left}px`;
    draggedModal.style.top = `${top}px`;
}

function onModalDragEnd() {
    if (draggedModal) draggedModal.classList.remove('dragging');
    draggedModal = null;

    document.removeEventListener('mousemove', onModalDragMove);
    document.removeEventListener('touchmove', onModalDragMove);
    document.removeEventListener('mouseup', onModalDragEnd);
    document.removeEventListener('touchend', onModalDragEnd);
}

// --- INITIALIZATION & EVENT BINDING ---
function beginGardenExperience() {
    playSound(sfx.collectible);
    currentTrackIndex = 0;
    playCurrentBgmTrack();

    document.body.classList.add('garden-loading');
    document.body.classList.remove('garden-ready');
    const term = document.getElementById('terminal-container');
    term?.classList.remove('active', 'reveal-in', 'is-sliver');
    term?.setAttribute('hidden', '');

    document.getElementById('init-screen').style.display = 'none';
    canvas.classList.remove('matrix-visible');
    gardenHasStarted = true;
    startGardenLoop();
    startLoader();
}

(function bindInitButton() {
    const initBtn = document.getElementById('init-btn');
    if (!initBtn || initBtn.dataset.bound) return;
    initBtn.dataset.bound = '1';
    initBtn.addEventListener('click', beginGardenExperience);
})();

function bindDomEvents() {
    // 1. Bind Modal Close Buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) closeModal(modal);
        });
    });

    // 2. PLAY/PAUSE LOGIC 
    const playPauseBtn = document.getElementById('play-pause-btn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', function() {
            const track = getBgmTrack(currentTrackIndex);
            if (track.paused) {
                playCurrentBgmTrack();
                this.innerHTML = "&#10074;&#10074;"; // ❚❚ Pause Symbol
                pushTerminalLog("> AUDIO RESUMED.");
            } else {
                track.pause();
                this.innerHTML = "&#9658;"; // ► Play Symbol
                pushTerminalLog("> AUDIO SUSPENDED.");
            }
        });
    }
    
    // 3. Sidebar Hover Sounds
    document.querySelectorAll('#sidebar-menu li').forEach(item => {
        item.addEventListener('mouseenter', () => {
            const hoverClone = sfx.click.cloneNode();
            hoverClone.volume = 0.4;
            hoverClone.play().catch(e => {});
        });
    });

    // Main init button — bound early via bindInitButton()

    // Bind existing UI buttons
    if (document.getElementById('mode-btn')) document.getElementById('mode-btn').addEventListener('click', toggleMode);
    if (document.getElementById('next-poem-btn')) document.getElementById('next-poem-btn').addEventListener('click', cyclePoem);
    if (document.getElementById('reset-timeline-btn')) document.getElementById('reset-timeline-btn').addEventListener('click', resetTimeline);

    initializeCycleSlots();
    bindModalDrag();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDomEvents);
} else {
    bindDomEvents();
}
    
// --- LIGHTBOX LOGIC ---
const lightboxOverlay = document.createElement('div');
lightboxOverlay.id = 'lightbox-overlay';
document.body.appendChild(lightboxOverlay);

// 1. Create the reusable close button in memory
const lightboxCloseBtn = document.createElement('span');
lightboxCloseBtn.className = 'close-btn'; 
lightboxCloseBtn.innerText = 'X';
// Force it to stay locked to the screen, above everything else
lightboxCloseBtn.style.cssText = 'position: fixed; top: 30px; right: 40px; z-index: 1000000; color: var(--neon-green); text-shadow: 0 0 10px var(--neon-green);';

document.querySelectorAll('.vault-item').forEach(item => {
    item.addEventListener('click', (e) => {
        if (e.target.closest('.carousel-btn') || e.target.closest('.carousel-slide')) return;
        const media = item.querySelector('.vault-media');
        if (!media) return;

        ensureMediaSrc(media);
        playSound(sfx.oneUp);
        
        // 2. Clear the old image, then immediately add the close button
        lightboxOverlay.innerHTML = ''; 
        lightboxOverlay.appendChild(lightboxCloseBtn);
        
        if (media.tagName === 'IFRAME') {
            const iframe = document.createElement('iframe');
            iframe.className = 'lightbox-content genesis-lightbox';
            iframe.src = media.dataset.src || media.getAttribute('src') || 'pages/genesis.html';
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('scrolling', 'no');
            lightboxOverlay.appendChild(iframe);
            globalThis.unlockTrophy?.('genesis_gate');
        } else {
            const clone = media.cloneNode(true);
            clone.className = 'lightbox-content';
            if (clone.tagName === 'VIDEO') clone.controls = true;
            lightboxOverlay.appendChild(clone);
        }
        lightboxOverlay.classList.add('active');
    });
});

// 3. Update the click listener to close if you click the background OR the new 'X'
lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === lightboxOverlay || e.target === lightboxCloseBtn) {
        lightboxOverlay.classList.remove('active');
        playSound(sfx.exit); 
        setTimeout(() => { lightboxOverlay.innerHTML = ''; }, 300); 
    }
});

// --- SIDEBAR LOGIC ---
const hamburger = document.getElementById('hamburger-icon');
const sidebar = document.getElementById('sidebar-menu');

// --- Update the Sidebar Logic in script.js ---
hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    playSound(sfx.keystroke); 
});

function init() {
    resizeCanvas(); // Builds the background grid and plants the hidden files
    randomizeData(); // Rolls your initial class, base, and stats
}

if(document.readyState === 'complete') { init(); } else { window.addEventListener('load', init); }

// ==========================================
// --- SECRET COMPOSER LOGIC ---
// ==========================================
function openComposer() {
    // Check if the editor already exists in the DOM so we don't duplicate it
    if(!document.getElementById('composer-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'composer-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(5,5,5,0.95);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
        
        const title = document.createElement('h2');
        title.innerText = "// COMPOSER_MODE";
        title.style.cssText = 'color:var(--neon-green);font-family:Avenir, sans-serif,monospace;margin-bottom:20px;text-shadow:0 0 10px var(--neon-green);';
        
        const textarea = document.createElement('textarea');
        textarea.id = 'composer-text';
        textarea.style.cssText = 'width:70%;height:50%;background:rgba(0,20,0,0.2);border:1px solid var(--neon-green);color:#fff;font-family:Avenir, sans-serif,monospace;padding:20px;font-size:1.2rem;outline:none;resize:none;text-shadow:0 0 5px #fff;line-height:1.5;';
        
        // Load whatever was saved in localStorage previously
        textarea.value = localStorage.getItem('garden_draft') || '';
        
        // Auto-save to localStorage on every single keystroke
        textarea.addEventListener('input', () => {
            localStorage.setItem('garden_draft', textarea.value);
        });
        
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'margin-top:20px;display:flex;gap:15px;';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerText = '[ CLOSE ]';
        closeBtn.className = 'singularity-btn'; // Steals your cool CSS class
        closeBtn.onclick = () => overlay.style.display = 'none';
        
        const exportBtn = document.createElement('button');
        exportBtn.innerText = '[ COPY FOR SCRIPT ]';
        exportBtn.className = 'singularity-btn';
        exportBtn.onclick = () => {
            const rawText = textarea.value;
            if(!rawText.trim()) return;
            
            // Magically convert real line breaks to \n, wrap in quotes,& add a comma
            const formattedJS = `"` + rawText.replace(/\n/g, '\\n') + `",`;
            
            // Copy directly to the user's clipboard
            navigator.clipboard.writeText(formattedJS).then(() => {
                pushTerminalLog("> DRAFT FORMATTED & COPIED TO CLIPBOARD.");
                playSound(sfx.taskComplete);
                exportBtn.innerText = '[ COPIED! ]';
                setTimeout(() => exportBtn.innerText = '[ COPY FOR SCRIPT ]', 2000);
            }).catch(err => {
                pushTerminalLog("> ERROR: CLIPBOARD DENIED.");
            });
        };
        
        const clearBtn = document.createElement('button');
        clearBtn.innerText = '[ WIPE MEMORY ]';
        clearBtn.className = 'singularity-btn';
        clearBtn.style.borderColor = '#ff0055';
        clearBtn.style.color = '#ff0055';
        clearBtn.onclick = () => {
            if(confirm("Erase current draft permanently?")) {
                textarea.value = '';
                localStorage.removeItem('garden_draft');
                playSound(sfx.glitch);
            }
        };
        
        btnContainer.appendChild(closeBtn);
        btnContainer.appendChild(exportBtn);
        btnContainer.appendChild(clearBtn);
        
        overlay.appendChild(title);
        overlay.appendChild(textarea);
        overlay.appendChild(btnContainer);
        document.body.appendChild(overlay);
    } else {
        // If it already exists, just show it
        document.getElementById('composer-overlay').style.display = 'flex';
    }
    globalThis.unlockTrophy?.('ghost_composer');
}

globalThis.openComposer = openComposer;

// ==========================================
// --- ARCADE MINIGAME: SEQUENCE PROTOCOL ---
// ==========================================
// --- ARCADE MINIGAME: SEQUENCE PROTOCOL ---
// ==========================================
// ==========================================
let arcadeScore = 0;
let currentSequenceIndex = 0;

// The patterns! You can add as many of these as you want.
const arcadeSequences = [
    {
        seq: ['100100100', '010010010', '100100100'],
        answer: '010010010',
        options: ['010010010', '001001001', '111000000', '000000111']
    },
    {
        seq: ['010111010', '101000101', '010111010'],
        answer: '101000101',
        options: ['111111111', '101000101', '000111000', '101010101']
    },
    {
        seq: ['111000000', '000111000', '000000111'],
        answer: '111000000',
        options: ['111000000', '000111000', '101010101', '111111111']
    },
    {
        seq: ['000010000', '010111010', '111111111'],
        answer: '111101111',
        options: ['111101111', '111111111', '010111010', '101110101']
    },
    {
        seq: ['101010101', '010101010', '101010101'],
        answer: '010101010',
        options: ['010101010', '101010101', '110110110', '001001001']
    },
    {
        seq: ['100000001', '010001000', '001010100'],
        answer: '000101000',
        options: ['000101000', '111111111', '010000010', '101010101']
    },
    {
        seq: ['100000000', '001000000', '000000001'],
        answer: '000001000',
        options: ['000001000', '100000000', '010010010', '111111111']
    },
    {
        seq: ['111111111', '111101111', '111111111'],
        answer: '111101111',
        options: ['111101111', '111111111', '101111101', '110110110']
    },
    {
        seq: ['100000000', '010000000', '001000000'],
        answer: '000100000',
        options: ['000100000', '000010000', '001000000', '100000000']
    },
    {
        seq: ['100000001', '010000010', '001111100'],
        answer: '000101000',
        options: ['000101000', '011111110', '100010001', '111111111']
    }
];

function loadArcadeLevel() {
    const display = document.getElementById('sequence-display');
    const controls = document.getElementById('arcade-controls');
    const msg = document.getElementById('arcade-message');
    
    // If they beat all the levels, don't try to load a level that doesn't exist
    if (currentSequenceIndex >= arcadeSequences.length) return;

    const level = arcadeSequences[currentSequenceIndex];

    msg.innerText = "Complete the sequence";
    msg.style.color = "var(--cyan)";

    // 1. Draw the known sequence of colors
    display.innerHTML = '';
    level.seq.forEach(matrixStr => {
        const matrixEl = createMatrixElement(matrixStr);
        display.appendChild(matrixEl);
    });
    
    // Add the mystery box
    const mystery = document.createElement('div');
    mystery.className = `color-square square-hidden`;
    mystery.innerText = '?';
    display.appendChild(mystery);

    controls.innerHTML = '';
    level.options.forEach(opt => {
        const optEl = createMatrixElement(opt);
        optEl.classList.add('interactive-square');
        optEl.onclick = () => checkArcadeAnswer(opt, level.answer);
        controls.appendChild(optEl);
    });
}

// NEW HELPER FUNCTION
function createMatrixElement(binStr) {
    const container = document.createElement('div');
    container.className = 'matrix-grid';
    // Split the "10101..." string into individual cells
    binStr.split('').forEach(bit => {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        if (bit === '1') cell.style.background = 'var(--cyan)'; // or white
        container.appendChild(cell);
    });
    return container;
}

function checkArcadeAnswer(guess, correct) {
    const msg = document.getElementById('arcade-message');
    const container = document.getElementById('arcade-game-container');

    if (guess === correct) {
        // --- CORRECT ANSWER ---
        arcadeScore += 100;
        document.getElementById('arcade-score').innerText = `SCORE: ${arcadeScore}`;
        playSound(sfx.collectible);
        
        msg.innerText = "> SEQUENCE ACCEPTED.";
        msg.style.color = "var(--neon-green)";

        currentSequenceIndex++;
        
        // Did they beat the whole game?
        if (currentSequenceIndex >= arcadeSequences.length) {
            globalThis.unlockTrophy?.('arcade_clear');
            msg.innerText = "> PROTOCOL COMPLETE. DISPENSING REWARD...";
            playSound(sfx.missionCleared);
            pushTerminalLog("> ARCADE PROTOCOL BEATEN. REWARD DISPENSED.");
            
            // Give them a tangible reward on the screen!
            setTimeout(() => {
                document.getElementById('arcade-controls').innerHTML = '';
                const modal = document.getElementById('modal-arcade');
                if (modal) modal.style.display = 'none';
                spawnPizza();
            }, 1000);
            
        } else {
            // Load the next level after a short delay
            setTimeout(loadArcadeLevel, 1000);
        }
    } else {
        // --- WRONG ANSWER ---
        arcadeScore = Math.max(0, arcadeScore - 50); // Lose points, but don't go below 0
        document.getElementById('arcade-score').innerText = `SCORE: ${arcadeScore}`;
        playSound(sfx.oopsy);
        
        msg.innerText = "> SEQUENCE REJECTED.";
        msg.style.color = "var(--alert-red)";
        
        // Flash the arcade cabinet red
        container.style.borderColor = "var(--alert-red)";
        setTimeout(() => container.style.borderColor = "var(--cyan)", 400);
    }
}


// --- OCCASIONAL CHROMATIC ABERRATION ENGINE ---

function triggerRandomGlitch() {
    // Only fire the glitch if the system is currently in Corrupted Mode
    if (document.body.classList.contains('corrupted')) {
        
        // Add the animation class
        document.body.classList.add('chromatic-active');
        
        // Remove the class after the animation finishes (350ms) so it can be re-triggered later
        setTimeout(() => {
            document.body.classList.remove('chromatic-active');
        }, 350);
        
        // Optional: Play a very quiet static/error sound when it glitches
        // const glitchSfx = sfx.error.cloneNode();
        // glitchSfx.volume = 0.1;
        // glitchSfx.play().catch(e => {});
    }
    
    // Calculate a random delay for the next glitch (between 3 seconds and 10 seconds)
    const minDelay = 3000; 
    const maxDelay = 10000; 
    const nextGlitchTime = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    
    // Schedule the next check
    setTimeout(triggerRandomGlitch, nextGlitchTime);
}

// Start the continuous loop immediately when the script loads
triggerRandomGlitch();

// --- IDLE DISSOCIATION ENGINE ---
let idleTimer;

function resetIdleTimer() {
    clearTimeout(idleTimer);
    
    // Snap back to reality instantly if they move
    document.body.style.transition = 'filter 0.2s ease';
    document.body.style.filter = 'none'; 
    
    idleTimer = setTimeout(() => {
        // Only trigger if they are actually looking at the page and not in the singularity
        if (!document.hidden && !isSingularityActive) {
            const idlePool = isCorrupted
                ? lore.idleMessagesSafe.concat(lore.idleMessagesGritty)
                : lore.idleMessagesSafe;
            const randomMsg = idlePool[Math.floor(Math.random() * idlePool.length)];
            pushTerminalLog(randomMsg);
            
            // A slow, 15-second descent into a blurry void
            document.body.style.transition = 'filter 15s ease-in-out';
            document.body.style.filter = 'grayscale(100%) blur(3px)'; 
        }
    }, 60000); // 60 seconds of total inactivity
}

// Listen for any sign of life
window.addEventListener('mousemove', resetIdleTimer);
window.addEventListener('keydown', resetIdleTimer);
window.addEventListener('click', resetIdleTimer);

// Start the timer on boot
resetIdleTimer();

// Replace your old carousel script with this block
const track = document.getElementById('manifold-track');
const slides = Array.from(document.querySelectorAll('.carousel-slide'));
const nextBtn = document.querySelector('.next-btn');
const prevBtn = document.querySelector('.prev-btn');

// Lightbox Elements
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lbClose = document.querySelector('.lightbox-close');
const lbNext = document.querySelector('.lb-next');
const lbPrev = document.querySelector('.lb-prev');

let currentIndex = 0;
let isLightboxOpen = false;

// -- 1. The Main Grid Carousel Logic --
function updateCarousel() {
  if (!slides.length || !slides[0].clientWidth) return;
  const slideWidth = slides[0].clientWidth;
  track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
}

nextBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  currentIndex = (currentIndex + 1) % slides.length;
  updateCarousel();
});

prevBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  currentIndex = (currentIndex - 1 + slides.length) % slides.length;
  updateCarousel();
});

// -- 2. The Lightbox Logic --
function getSlideSrc(slide) {
    return slide.getAttribute('src') || slide.dataset.src || slide.dataset.fallback || '';
}

function updateLightbox() {
  const slide = slides[currentIndex];
  ensureMediaSrc(slide);
  lightboxImg.removeAttribute('src');
  lightboxImg.dataset.src = slide.dataset.src || slide.getAttribute('src') || '';
  lightboxImg.dataset.fallback = slide.dataset.fallback || '';
  setImgWithFallback(lightboxImg);
}

function openLightbox(index) {
  playSound(sfx.oneUp);
  currentIndex = index;
  ensureMediaSrc(slides[currentIndex]);
  updateLightbox();
  lightbox.classList.add('active');
  isLightboxOpen = true;
}

function closeLightbox() {
  playSound(sfx.exit);
  lightbox.classList.remove('active');
  isLightboxOpen = false;
  updateCarousel(); 
}

// Attach click events to the images to open them
slides.forEach((slide, index) => {
  slide.addEventListener('click', (e) => {
    e.stopPropagation();
    openLightbox(index);
  });
});

// Lightbox Buttons
lbNext?.addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % slides.length;
  updateLightbox();
});

lbPrev?.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + slides.length) % slides.length;
  updateLightbox();
});

// Close button and click-outside-to-close
lbClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

// -- 3. Unified Keyboard Logic --
document.addEventListener('keydown', (e) => {
  if (globalThis.EntropyFilePong?.konamiClaimsKey?.(e)) return;
  if (globalThis.EntropyFilePong?.pongBlocksArrowNav?.(e)) return;
  if (e.key === 'ArrowRight') {
    currentIndex = (currentIndex + 1) % slides.length;
    isLightboxOpen ? updateLightbox() : updateCarousel();
  } else if (e.key === 'ArrowLeft') {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    isLightboxOpen ? updateLightbox() : updateCarousel();
  } else if (e.key === 'Escape' && isLightboxOpen) {
    closeLightbox();
  }
});

window.addEventListener('resize', updateCarousel);