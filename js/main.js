// Entropy Garden — main entry (lazy-loads terminal, matrix, singularity, arcade)
import { bindPlaylistPlayPause, isPlayPauseShowingPlaying } from './playlist-icons.js';
import { registerHooks, getHook } from './core/hooks.js';
import { bindSidebarNavigation } from './ui/sidebar.js';
import { bindPlaylistTransport, bindBossKeyClose } from './ui/playlist.js';
import {
    onModalOpened,
    onModalClosed,
    bindModalEscapeClose,
    enhanceSidebarItems,
    bindPlaylistTransportLabels,
} from './ui/modal-a11y.js';
import {
    prefetchGardenBirdsAmbience,
    primeGardenBirdsAmbience,
    startGardenBirdsAmbience,
    stopGardenBirdsAmbience,
    toggleGardenBirdsMuted,
    syncGardenBirdsMuteButton,
} from './core/audio/init-ambient.js';
import {
    sfx,
    playSound,
    playGlitchSound,
    warmSound,
    playMeow,
    shuffle,
    pickOne,
    pickMany,
    setImgWithFallback,
    imgPath,
    canvas,
    perf,
    triggerPanopticonReroll,
    triggerPanopticonEyeRoll,
    triggerPanopticonSleep,
    triggerPanopticonWake,
    startPanopticonIdleComments,
    syncPanopticonCodeSequenceComments,
    handlePanopticonVisibilityChange,
    setPanopticonGodMode,
    updatePanopticonVisibility,
    currentTrackIndex,
    playCurrentBgmTrack,
    pauseCurrentBgmTrack,
    playPrevTrack,
    playNextTrack,
    resetBgmToStart,
    prefetchLargeBgmTracks,
    bufferBgmTrack,
    getBgmTrack,
    getBgmTrackTitle,
    applyTrackTitleMarquee,
    panopticonEl,
    togglePanopticonMuted,
    syncPanopticonMuteButton,
} from './core/shared.js';
import {
    time,
    isCorrupted,
    needsFullRedraw,
    gardenHasStarted,
    isSingularityActive,
    singularityAnimId,
    slotState,
    slotIndexes,
    cipherStage,
    isCipherSolved,
    setGardenHasStarted,
    setSingularityAnimId,
    setIsSingularityActive,
    resetArtifactSlots,
    toggleIsCorrupted,
    setIsCorrupted,
    setNeedsFullRedraw,
} from './core/state.js';
import {
    pushTerminalLog,
    triggerSingularity,
    cyclePoem,
    pauseSingularityPresentation,
    resumeSingularityPresentation,
    ensureMatrix,
    stopGardenLoop,
    resumeGardenLoop,
    restartGardenLoop,
    resizeCanvas,
    setMatrixNeedsRedraw,
    loadArcadeLevel,
    initCardsOfChaos,
    loadTerminal,
    getTerminalContainer,
    getTermInput,
    rebuildTerminalLogPool,
    reconcileSingularityPoem,
    stopSingularity3D,
    bootGameAddons,
} from './lazy.js?v=cipher-clock-3';
import { registerServiceWorkerAfterInit } from './core/sw-register.js';
import { initIosUi, scrollIosHudHome, showIosScrollHints } from './ios/ios-ui.js';
import { setGodTitleArrangement, syncGodTitleGradient } from './core/god-title.js';
import {
    firePanopticonComment,
    initPanopticonComments,
    panopticonCommentForModal,
} from './modules/panopticon-comments.js';
import {
    initBehavioralAnalysis,
    recordBehavior,
    printBehaviorReport,
    getBehaviorSnapshot,
} from './modules/behavioral-analysis.js';

// Bind init immediately so a later module error cannot block the gatekeeper.
let loaderBootGate = Promise.resolve();

function prefetchGardenBoot() {
    warmSound(sfx.collectible);
    warmSound(sfx.loading);
    warmSound(sfx.boop);
}

const INIT_PARTNER_ANIM_MS = 1000;
const INIT_PARTNER_SPLASH_MS = 3000;

function playInitPartnerSplash(onComplete) {
    warmSound(sfx.collectible);
    playSound(sfx.collectible);
    primeGardenBirdsAmbience();
    prefetchGardenBirdsAmbience();

    const splash = document.getElementById('init-partner-splash');
    const warning = document.getElementById('epilepsy-warning');
    const initBtn = document.getElementById('init-btn');

    if (!splash || perf.prefersReducedMotion) {
        onComplete();
        return;
    }

    warning?.setAttribute('hidden', '');
    initBtn?.setAttribute('hidden', '');
    splash.hidden = false;
    splash.setAttribute('aria-hidden', 'false');
    splash.classList.add('is-active');

    window.setTimeout(() => {
        splash.classList.remove('is-active');
        splash.classList.add('is-exiting');

        window.setTimeout(() => {
            splash.classList.remove('is-exiting');
            splash.hidden = true;
            splash.setAttribute('aria-hidden', 'true');
            onComplete();
        }, INIT_PARTNER_ANIM_MS);
    }, INIT_PARTNER_SPLASH_MS - INIT_PARTNER_ANIM_MS);
}

function beginGardenExperience() {
    try {
        stopGardenBirdsAmbience();
        prefetchGardenBirdsAmbience();
        // Show loader before audio decode / BGM load (those can block the main thread).
        document.body.classList.add('garden-loading');
        document.body.classList.remove('garden-ready');

        const term = document.getElementById('terminal-container');
        term?.classList.remove('active', 'reveal-in', 'fab-ready');
        term?.setAttribute('hidden', '');

        const initScreen = document.getElementById('init-screen');
        if (initScreen) initScreen.style.display = 'none';
        canvas?.classList.remove('matrix-visible');
        setGardenHasStarted(true);
        updatePanopticonVisibility();
        prefetchLargeBgmTracks();

        const matrixBoot = ensureMatrix().then((mod) => {
            mod.resizeCanvas();
            mod.startGardenLoop();
            updatePanopticonVisibility();
            if (document.body.classList.contains('ios-ui')) {
                setTimeout(() => mod.resizeCanvas(), 300);
            }
        }).catch((err) => console.error('[Entropy Garden] matrix failed to load', err));

        const addonsBoot = bootGameAddons(activateGodMode).catch((err) => {
            console.error('[Entropy Garden] game addons prefetch failed', err);
        });

        const terminalBoot = loadTerminal().catch((err) => {
            console.error('[Entropy Garden] terminal failed to load', err);
        });

        const bgmBoot = bufferBgmTrack(currentTrackIndex).catch(() => {});

        loaderBootGate = Promise.race([
            Promise.all([matrixBoot, addonsBoot, terminalBoot, bgmBoot]),
            new Promise((resolve) => setTimeout(resolve, LOADER_BOOT_MAX_MS)),
        ]);

        startLoader();

        registerServiceWorkerAfterInit();

        panopticonEl?.addEventListener('pointerdown', () => {
            bootGameAddons(activateGodMode).catch(() => {});
        }, { once: true, passive: true });

        requestAnimationFrame(() => {
            warmSound(sfx.boop);
            lastTerminalLoggedTrackIndex = -1;
            resetBgmToStart();
        });
    } catch (err) {
        console.error('[Entropy Garden] initialize failed', err);
        document.body.classList.remove('garden-loading');
        const initScreen = document.getElementById('init-screen');
        if (initScreen) initScreen.style.display = '';
    }
}

function bindInitButton() {
    const initBtn = document.getElementById('init-btn');
    if (!initBtn || initBtn.dataset.bound) return;
    initBtn.dataset.bound = '1';
    initBtn.addEventListener('click', () => playInitPartnerSplash(beginGardenExperience));
    initBtn.addEventListener('pointerenter', prefetchGardenBoot, { once: true });
    initBtn.addEventListener('touchstart', prefetchGardenBoot, { once: true, passive: true });
}

bindInitButton();

// ==========================================
// ENTROPY GARDEN - v24.0 ENGINE
// ==========================================

// --- KONAMI CODE ---
function activateGodMode() {
    const body = document.body;
    const h1 = document.querySelector('h1');

    // CHECK IF ALREADY ACTIVE
    if (body.classList.contains('god-mode')) {
        body.classList.remove('god-mode');
        setPanopticonGodMode(false);
        firePanopticonComment('godModeOff');
        recordBehavior('god_mode');
        globalThis.EntropyCipherHint?.onGodModeOff?.();
        pushTerminalLog("> SYSTEM OVERRIDE TERMINATED. RETURNING TO NORMALCY.");
        playGlitchSound();
        setGodTitleArrangement(h1, false);
    }
    // IF NOT ACTIVE, TURN IT ON
    else {
        body.classList.add('god-mode');
        setPanopticonGodMode(true);
        firePanopticonComment('godModeOn', { force: true });
        recordBehavior('god_mode');
        setGodTitleArrangement(h1, true);
        pushTerminalLog("!!! OVERRIDE ACCEPTED !!!");
        playSound(sfx.missionCleared);
        globalThis.unlockTrophy?.('konami_god');
        recordBehavior('konami_complete');
        globalThis.EntropyCipherHint?.unlock?.();
    }
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
    draggedElement.style.zIndex = 10080;
    
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

    // 2. Get the terminal's current hitbox (may be absent if UI not ready)
    const termEl = document.getElementById('terminal-container');
    const termRect = termEl ? termEl.getBoundingClientRect() : null;

    // 3. Check if the drop coordinates are inside the terminal
    if (
        termRect &&
        clientX >= termRect.left &&
        clientX <= termRect.right &&
        clientY >= termRect.top &&
        clientY <= termRect.bottom
    ) {
        // EAT THE ITEM
        const isPizza = draggedElement.id.includes('pizza') || draggedElement.innerHTML.includes('path'); 
        
        draggedElement.remove(); 

        // Trigger the physical "burp" animation
        getTerminalContainer().classList.add('burp-active');
        setTimeout(() => {
            getTerminalContainer().classList.remove('burp-active');
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
        draggedElement.style.zIndex = 10070;
    }

    draggedElement = null;
    
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchend', handleDragEnd);
}


const winningCombo = ['pizza', 'flask', 'save'];

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
const needyTitles = ["RENDER FAILED...", "WHERE DID YOU GO?", "MEMORY LEAK DETECTED", 
    "CTRL+Z! CTRL+Z!", "PLEASE COME BACK", "I THOUGHT WHAT WE HAD WAS SPECIAL", 
    "OK, FINE. LEAVE.", "AM I NOT ENOUGH FOR YOU?", "THEY ALWAYS LEAVE...", 
    "I MISS U </3", "ARE YOU MAD AT ME?", "AM I TOO MUCH FOR YOU?", 
    "AM I NOT ENOUGH FOR YOU?", "*SILENTLY JUDGES YOU*"];
function resumeGardenAfterReturn() {
    if (!gardenHasStarted || document.hidden) return;
    if (isSingularityActive) {
        resumeSingularityPresentation();
        return;
    }
    resumeGardenLoop();
    requestAnimationFrame(() => resumeGardenLoop());
}

function handlePageReturn(event) {
    if (event?.persisted) {
        pauseSingularityPresentation();
        stopSingularity3D();
        if (isSingularityActive || document.body.classList.contains('singularity-active')) {
            setIsSingularityActive(false);
            document.body.classList.remove('singularity-active');
            const overlay = document.getElementById('singularity-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    }
    resumeGardenAfterReturn();
}

document.addEventListener("visibilitychange", () => {
    document.title = document.hidden ? needyTitles[Math.floor(Math.random() * needyTitles.length)] : originalTitle;
    handlePanopticonVisibilityChange(document.hidden);
    if (document.hidden) {
        stopGardenLoop();
        if (isSingularityActive) pauseSingularityPresentation();
        else if (singularityAnimId) {
            cancelAnimationFrame(singularityAnimId);
            setSingularityAnimId(null);
        }
    } else {
        resumeGardenAfterReturn();
    }
});

window.addEventListener("pageshow", handlePageReturn);
window.addEventListener("pagehide", () => {
    if (!isSingularityActive) return;
    pauseSingularityPresentation();
    stopSingularity3D();
    if (perf.isIOS) {
        setIsSingularityActive(false);
        document.body.classList.remove('singularity-active');
        const overlay = document.getElementById('singularity-overlay');
        if (overlay) overlay.style.display = 'none';
    }
});

window.addEventListener("focus", () => {
    resumeGardenAfterReturn();
});


// --- PLAYLIST CONTROL LOGIC ---

let lastTerminalLoggedTrackIndex = -1;

function updatePlaylistUI() {
    const trackLabel = document.getElementById('track-title');
    const title = getBgmTrackTitle(currentTrackIndex);
    if (trackLabel) {
        applyTrackTitleMarquee(trackLabel, title);
    }
    if (currentTrackIndex === lastTerminalLoggedTrackIndex) return;
    lastTerminalLoggedTrackIndex = currentTrackIndex;
    pushTerminalLog(`> AUDIO_LINK: ${title.toUpperCase()} ACTIVE.`);
}


// --- BOSS KEY ---
function toggleBossKey() {
    const overlay = document.getElementById('boss-key-overlay');
    if (!overlay) return;

    if (overlay.classList.contains('active')) {
        overlay.classList.remove('active');
        playSound(sfx.close);
        pushTerminalLog('> CRISIS AVERTED. RESUMING NORMAL CYCLES.');
        if (gardenHasStarted) resumeGardenLoop();
    } else {
        overlay.classList.add('active');
        stopGardenLoop();
        playSound(sfx.error);
        globalThis.unlockTrophy?.('maya_crash');
    }
}

globalThis.toggleBossKey = toggleBossKey;

document.querySelectorAll('.boss-btn').forEach((btn) => btn.addEventListener('click', toggleBossKey));

// --- FULLSCREEN ---
function isGardenFullscreen() {
    return Boolean(
        document.fullscreenElement
        || document.webkitFullscreenElement
        || document.msFullscreenElement
    );
}

async function toggleFullscreen() {
    try {
        if (isGardenFullscreen()) {
            const exit = document.exitFullscreen
                || document.webkitExitFullscreen
                || document.msExitFullscreen;
            if (exit) await exit.call(document);
            pushTerminalLog('> FULLSCREEN DISENGAGED.');
            return false;
        }

        const root = document.documentElement;
        const enter = root.requestFullscreen
            || root.webkitRequestFullscreen
            || root.msRequestFullscreen;
        if (!enter) {
            pushTerminalLog('> FULLSCREEN UNAVAILABLE IN THIS BROWSER.');
            return null;
        }
        await enter.call(root);
        pushTerminalLog('> FULLSCREEN ENGAGED.');
        recordBehavior('fullscreen_toggle', { active: true });
        return true;
    } catch {
        pushTerminalLog('> FULLSCREEN REQUEST BLOCKED.');
        return null;
    }
}

// --- TIME SENSITIVE LORE ---

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
    "Turning it off and on again...",
    "Downloading a car...",
    "Stealing your bath soaps...",
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
    "Speedrunning jobs...",
    "Introducing jazz hands to the situation...",
    "Reducing the irreducible... (Error)",
    "Settling scores with my imaginary friends...",
    "Experimenting with unstable isotopes... (and women)",
    "Deferring legal decisions to my clown lawyer...",
    "Beep boop bop beep boop boop bop...",
    "Asking loaded questions to elicit a response...",
];

function revealGardenUI() {
    document.body.classList.remove('garden-loading');
    document.body.classList.add('garden-ready');
    startGardenBirdsAmbience();
    updatePanopticonVisibility();
    startGlitchLoop();
    startIdleDissociation();
    startPanopticonIdleComments();
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            initPanopticonComments();
            initBehavioralAnalysis({ firePanopticonComment, pushTerminalLog });
        });
    });
    setTimeout(() => firePanopticonComment('init', { force: true }), 1400);

    bootGameAddons(activateGodMode)
        .then(({ pong }) => {
            pong.notifyGardenReady();
            window.dispatchEvent(new Event('entropy:garden-ready'));
        })
        .catch((err) => {
            console.error('[Entropy Garden] game addons failed at reveal', err);
            window.dispatchEvent(new Event('entropy:garden-ready'));
        });

    const hud = document.getElementById('hud');
    const playlistMenu = document.getElementById('playlist-menu');
    const isIosLayout = document.body.classList.contains('ios-ui');

    scheduleMatrixVisible(isIosLayout);

    playSound(sfx.ui);

    const revealTerminalChrome = () => {
        const term = document.getElementById('terminal-container');
        if (!term) return;
        term.removeAttribute('hidden');
        term.classList.remove('reveal-in', 'active');
        term.classList.add('fab-ready');
        void term.offsetWidth;
        requestAnimationFrame(() => term.classList.add('reveal-in'));
    };

    if (isIosLayout) {
        hud?.classList.add('active');
        document.getElementById('settings-menu')?.classList.add('active');
        document.querySelector('.control-panel')?.classList.add('active');
        if (playlistMenu) {
            playlistMenu.classList.add('active');
            playlistMenu.style.display = 'block';
            updatePlaylistUI();
        }
        requestAnimationFrame(() => revealTerminalChrome());
        scrollIosHudHome('smooth');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => showIosScrollHints());
        });
        return;
    }

    setTimeout(() => hud.classList.add('active', 'anim-drop'), HUD_DROP_DELAY_MS);
    setTimeout(() => {
        document.getElementById('settings-menu')?.classList.add('active');
        document.querySelector('.control-panel').classList.add('active');
    }, 450);
    setTimeout(revealTerminalChrome, 450);
    setTimeout(() => {
        if (playlistMenu) {
            playlistMenu.classList.add('active');
            playlistMenu.style.display = 'block';
            updatePlaylistUI();
        }
    }, 750);
}

const LOADER_MIN_MS = 6000;
const LOADER_BOOT_MAX_MS = 14000;
const LOADER_FADE_HOLD_MS = 500;
const LOADER_FADE_MAX_MS = 900;
const HUD_DROP_DELAY_MS = 150;
const HUD_DROP_ANIM_MS = 1500;
const MATRIX_VISIBLE_IOS_DELAY_MS = 400;

/** Fade matrix in after HUD intro so canvas filters don't compete with UI animations. */
function scheduleMatrixVisible(isIosLayout) {
    if (!canvas) return;
    const delay = isIosLayout
        ? MATRIX_VISIBLE_IOS_DELAY_MS
        : HUD_DROP_DELAY_MS + HUD_DROP_ANIM_MS;
    setTimeout(() => canvas.classList.add('matrix-visible'), delay);
}

function startLoader() {
    const loader = document.getElementById('loader');
    const text = document.getElementById('loader-text');
    if (!loader || !text) return;

    sfx.loading.loop = false;
    playSound(sfx.loading); 
    
    const pingInterval = setInterval(() => {
        playSound(sfx.loading);
    }, 3000); 
    
    let progress = 0;
    let startTime = Date.now();
    let tickCounter = 0;
    let bootReady = false;

    loaderBootGate.then(() => {
        bootReady = true;
    });

    const interval = setInterval(() => {
        progress += Math.random() * 3.5 + 1;
        tickCounter++;

        const minElapsed = (Date.now() - startTime) >= LOADER_MIN_MS;
        if (progress >= 99 && (!minElapsed || !bootReady)) { progress = 99; }

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
                setTimeout(finishLoaderFade, LOADER_FADE_MAX_MS);
            }, LOADER_FADE_HOLD_MS);

        } else {
            // Changes text exactly every 8 ticks (1.6 seconds)
            if (tickCounter % 8 === 0) {
                text.innerText = weirdLoadingPhrases[Math.floor(Math.random() * weirdLoadingPhrases.length)]; 
            }
        }
    }, 200);
}

// --- LORE POOLS (safe vs gritty; gritty only in corrupted mode) ---
const lore = globalThis.lorePools;

let currentPoemIndex = 0;

function handleReroll() {
    playSound(sfx.refresh);
    triggerPanopticonReroll();
    firePanopticonComment('reroll');
    recordBehavior('reroll');
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

    document.getElementById('bio-container').innerHTML = `
        <p class="bio-p" style="margin-top: 0;">> <strong>Identity_String:</strong> Most of the select few who find themselves either blessed or otherwise cursed to have personal acquaintance with me, of which there are truly not very many, know me simply by the name of Daniel. When I’m not busy filing for disability or breaking the world record for number of application rejections (and counting), I like to spend my time in hyperfixation mode on the meaning of the silly little shapes and words I create. My inspiration routine involves staring at a wall for an extended period of time and logging it as meditation time in my digital journal. Most creatives draw from observation whereas I neither have the patience nor willpower to dabble in such nonsense. To brag a little bit more, I can consistently make jokes that make the crickets sing. I haunt the halls of art workshops and get a free psychoanalytical consultation and a cup of coffee in the process.</p>
        <p class="bio-p">${frags[0]} ${frags[1]}</p>
        <p class="bio-p">${frags[2]} ${frags[3]}</p>
    `;
    
    const pList = document.getElementById('project-list'); 
    pList.innerHTML = ''; 
    pickMany(lore.projectsSafe, lore.projectsGritty, 4).forEach(proj => {
        const li = document.createElement('li'); 
        li.innerHTML = `<span class="project-title">${proj.title}</span><span class="project-desc">${proj.desc}</span>`; 
        pList.appendChild(li); 
    });
    
    const sList = document.getElementById('stats-list'); 
    sList.innerHTML = '';
    const statsRows = isCorrupted && lore.statsGritty.length
        ? lore.statsSafe.concat(lore.statsGritty)
        : lore.statsSafe;
    statsRows.forEach((stat) => {
        const pool = stat.vals ?? (stat.val != null ? [stat.val] : []);
        const val = pool.length ? pool[Math.floor(Math.random() * pool.length)] : '???';
        const li = document.createElement('li'); 
        li.className = "stat-row"; 
        li.innerHTML = `<span class="stat-label">${stat.label}</span><span class="stat-val">${val}</span>`; 
        sList.appendChild(li); 
    });
}
// --- COMBINATION LOCK SYSTEM ---
const cycleArtifacts = [
    { id: 'empty', html: '' },
    { id: 'pizza', html: '<span class="mask-icon slot-icon mask-icon--dock-pizza" aria-hidden="true"></span>' },
    { id: 'flask', html: '<span class="mask-icon slot-icon mask-icon--dock-flask" aria-hidden="true"></span>' },
    { id: 'save', html: '<span class="mask-icon slot-icon mask-icon--dock-save" aria-hidden="true"></span>' },
];


function renderCycleSlot(slotNumber) {
    const slotEl = document.getElementById(`slot-${slotNumber}`);
    if (!slotEl) return;

    const artifact = cycleArtifacts[slotIndexes[slotNumber - 1]];
    slotEl.innerHTML = artifact.html;
    slotEl.dataset.currentId = artifact.id;
    slotEl.classList.toggle('occupied', artifact.id !== 'empty');
}

function cycleSlot(slotNumber) {
    const i = slotNumber - 1;
    slotIndexes[i] = (slotIndexes[i] + 1) % cycleArtifacts.length;
    renderCycleSlot(slotNumber);
    playSound(sfx.click2);
    firePanopticonComment('dockingSlot');
    recordBehavior('docking_cycle');
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

    const isComboCorrect = currentIds.every((id, i) => id === winningCombo[i]);

    if (!isComboCorrect) return;

    if (isCipherSolved) {
        triggerSingularity();
        return;
    }

    pushTerminalLog("> ERROR: VAULT ENCRYPTED. TERMINAL OVERRIDE REQUIRED.");
    playSound(sfx.oopsy);
    triggerPanopticonEyeRoll();
    firePanopticonComment('slotFail');
    recordBehavior('slot_fail');

    document.querySelectorAll('.slot').forEach((s) => {
        s.style.animation = 'errorShake 0.4s ease';
        setTimeout(() => {
            s.style.animation = '';
        }, 400);
    });
}

globalThis.checkCycleWinAfterCipher = checkCycleWin;

function resetTimeline() {
    window.speechSynthesis?.cancel();
    stopSingularity3D();
    document.body.classList.remove('singularity-active');
    const overlay = document.getElementById('singularity-overlay');
    overlay?.classList.remove('singularity-ios-simple', 'singularity-ios-layout');
    document.getElementById('singularity-bg')?.style.removeProperty('display');
    playSound(sfx.exit);
    if (overlay) overlay.style.display = 'none';
    const nextBtn = document.getElementById('next-poem-btn');
    const resetBtn = document.getElementById('reset-timeline-btn');
    if (nextBtn) nextBtn.textContent = '[NEXT TRANSMISSION]';
    if (resetBtn) resetBtn.textContent = '[RETURN TO GARDEN]';
    setIsSingularityActive(false);
    setNeedsFullRedraw(true);

    document.getElementById('hamburger-icon').style.display = 'flex';
    document.getElementById('settings-menu')?.classList.add('active');

    document.getElementById('next-poem-btn').style.display = 'inline-block';
    document.getElementById('singularity-canvas').style.display = 'block';
    document.getElementById('poem-container').style.display = 'block';

    resetArtifactSlots();

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
function togglePanopticonMuteSetting() {
    const muted = togglePanopticonMuted();
    playSound(sfx.click);
    pushTerminalLog(muted ? '> PANOPTICON COMMENT SFX MUTED.' : '> PANOPTICON COMMENT SFX ENABLED.');
    recordBehavior('panopticon_mute', { muted });
}

function toggleGardenBirdsMuteSetting() {
    const muted = toggleGardenBirdsMuted();
    playSound(sfx.click);
    pushTerminalLog(muted ? '> RAINFOREST BIRDS MUTED.' : '> RAINFOREST BIRDS ENABLED.');
    recordBehavior('birds_mute', { muted });
}

function setSettingsMenuOpen(open) {
    const menu = document.getElementById('settings-menu');
    const toggle = document.getElementById('settings-toggle');
    const dropdown = document.getElementById('settings-dropdown');
    if (!menu || !toggle || !dropdown) return;
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    dropdown.hidden = !open;
}

function bindSettingsMenu() {
    const menu = document.getElementById('settings-menu');
    const toggle = document.getElementById('settings-toggle');
    if (!menu || !toggle || toggle.dataset.bound === '1') return;
    toggle.dataset.bound = '1';

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle.classList.remove('is-spinning');
        void toggle.offsetWidth;
        toggle.classList.add('is-spinning');
        setSettingsMenuOpen(!menu.classList.contains('is-open'));
        playSound(sfx.click);
    });

    toggle.addEventListener('animationend', (e) => {
        if (e.animationName === 'settings-cog-spin') {
            toggle.classList.remove('is-spinning');
        }
    });

    menu.querySelectorAll('.settings-item').forEach((btn) => {
        btn.addEventListener('click', () => setSettingsMenuOpen(false));
    });

    document.addEventListener('click', (e) => {
        if (!menu.classList.contains('is-open')) return;
        if (e.target.closest?.('#settings-menu')) return;
        setSettingsMenuOpen(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !menu.classList.contains('is-open')) return;
        setSettingsMenuOpen(false);
    });
}

function toggleMode() {
    const btn = document.getElementById('mode-btn');
    toggleIsCorrupted();
    setNeedsFullRedraw(true);
    if (document.body.style.filter) {
        document.body.style.transition = 'filter 0.2s ease';
        document.body.style.filter = 'none';
    }
    if (isCorrupted) {
        document.body.classList.add('corrupted');
        btn.innerText = "CORRUPTED MODE";
        playGlitchSound();
        pushTerminalLog("> CORRUPTED MODE ENGAGED");
        firePanopticonComment('corruptOn', { force: true });
        recordBehavior('corrupt_on');
        globalThis.unlockTrophy?.('corrupted_bloom');
    } else {
        document.body.classList.remove('corrupted');
        clearCorruptFxClasses();
        btn.innerText = "SAFE MODE";
        playSound(sfx.it);
        pushTerminalLog("> SAFE MODE RESTORED");
        firePanopticonComment('corruptOff');
        recordBehavior('corrupt_off');
    }
    syncGodTitleGradient();
    randomizeData();
    rebuildTerminalLogPool();
    reconcileSingularityPoem();
}

function triggerEasterEgg() {
    playGlitchSound(); 
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



function activateVaultMedia() {
    document.querySelectorAll('#modal-vault [data-src]').forEach(el => {
        ensureMediaSrc(el);
        if (el.tagName === 'VIDEO') {
            el.play().catch(() => {});
        }
    });
    primeManifoldCarousel();
}

function primeManifoldCarousel() {
    const carouselSlides = document.querySelectorAll('#modal-vault .carousel-slide');
    const wrapper = document.querySelector('#modal-vault .carousel-wrapper');
    const track = document.getElementById('manifold-track');
    if (!carouselSlides.length || !wrapper || !track) return;

    currentIndex = 0;

    const refresh = () => {
        requestAnimationFrame(() => {
            if (typeof globalThis.updateCarousel === 'function') {
                globalThis.updateCarousel();
            }
        });
    };

    carouselSlides.forEach((slide) => {
        ensureMediaSrc(slide);
        if (!slide.dataset.carouselBound) {
            slide.dataset.carouselBound = '1';
            slide.addEventListener('load', refresh, { passive: true });
            slide.addEventListener('error', refresh, { passive: true });
        }
    });

    const stage = document.querySelector('#modal-vault .carousel-stage');
    if (!wrapper.dataset.carouselObserved) {
        wrapper.dataset.carouselObserved = '1';
        const ro = new ResizeObserver(refresh);
        ro.observe(wrapper);
        if (stage) ro.observe(stage);
    }

    refresh();
    setTimeout(refresh, 80);
    setTimeout(refresh, 350);
    setTimeout(refresh, 900);

    document.querySelectorAll('#modal-vault video.vault-media').forEach((video) => {
        if (video.dataset.trophySunBound) return;
        video.dataset.trophySunBound = '1';
        video.addEventListener('play', () => globalThis.unlockTrophy?.('vault_sun'), { once: true });
    });
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

const MODALS_WITHOUT_REROLL_HINT = new Set(['vault', 'arcade', 'cards', 'trophies', 'poems']);

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
    if (document.body.classList.contains('ios-ui')) {
        hint.style.display = 'none';
        content.querySelector('.ios-modal-reroll')?.classList.add('visible');
        return;
    }
    content.appendChild(hint);
    hint.style.display = 'block';
}

function detachRefreshHint() {
    const hint = document.getElementById('refresh-hint');
    if (!hint) return;
    hint.style.display = 'none';
    document.body.appendChild(hint);
    document.querySelectorAll('.ios-modal-reroll.visible').forEach((btn) => {
        btn.classList.remove('visible');
    });
}

function openModal(id) { 
    const modalAliases = {
        identity: 'about',
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
        panopticonCommentForModal(resolvedId);
        recordBehavior('modal_open', { id: resolvedId });
        if (resolvedId === 'arcade') {
            loadArcadeLevel().catch((err) => {
                console.error('[Entropy Garden] arcade failed to load', err);
                pushTerminalLog('> ARCADE MODULE OFFLINE.');
            });
        }

        if (resolvedId === 'cards') {
            initCardsOfChaos().catch((err) => {
                console.error('[Entropy Garden] cards of chaos failed to load', err);
                pushTerminalLog('> CARDS OF CHAOS OFFLINE.');
            });
        }

        if (resolvedId === 'vault') {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => activateVaultMedia());
            });
        }

        if (resolvedId === 'trophies') {
            globalThis.EntropyTrophies?.renderTrophyCase();
        }

        if (resolvedId === 'poems' && document.body.classList.contains('ios-ui')) {
            import('./ios/ios-poems.js').then((poems) => {
                if (!poems.iosPoemsAllowed?.()) {
                    m.style.display = 'none';
                    pushTerminalLog('> POEMS LOCKED. COMPLETE CIPHER OR USE express.');
                    return;
                }
                poems.initIosPoemArchive();
                poems.refreshIosPoemArchive();
            }).catch((err) => console.error('[Entropy Garden] ios poems failed', err));
        }

        if (modalSkipsRerollHint(m)) {
            detachRefreshHint();
        } else {
            attachRefreshHint(m);
            triggerGhostHint();
        }

        onModalOpened(m);
    } else {
        pushTerminalLog(`> ERROR: modal-${resolvedId} not found.`);
    }
}

function closeModal(modalElement) { 
    const closeClone = sfx.close.cloneNode();
    closeClone.play().catch(e => {});
    onModalClosed(modalElement);
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
    if (e.target.closest('.lightbox-close') || e.target.closest('.modal-close')) return;

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
function bindDomEvents() {
    initIosUi();
    bindSidebarNavigation(openModal, { playHoverSound: !perf.isIOS });
    enhanceSidebarItems();
    bindPlaylistTransport({ onPrev: playPrevTrack, onNext: playNextTrack });
    bindPlaylistTransportLabels();
    bindBossKeyClose(toggleBossKey);
    bindModalEscapeClose(closeModal);

    document.querySelectorAll('.modal').forEach((modal) => {
        modal.setAttribute('aria-hidden', 'true');
    });

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
        const playPauseUi = bindPlaylistPlayPause(playPauseBtn, () => getBgmTrack(currentTrackIndex));
        globalThis.markPlaylistPlayingIntent = () => playPauseUi?.markPlayingIntent();
        globalThis.markPlaylistPausedIntent = () => playPauseUi?.markPausedIntent();

        playPauseBtn.addEventListener('click', function() {
            if (isPlayPauseShowingPlaying(this)) {
                pauseCurrentBgmTrack();
                pushTerminalLog("> AUDIO SUSPENDED.");
                firePanopticonComment('playlistPause');
                recordBehavior('playlist_toggle');
                return;
            }

            playCurrentBgmTrack();
            pushTerminalLog("> AUDIO RESUMED.");
            firePanopticonComment('playlistPlay');
            recordBehavior('playlist_toggle');
        });
    }

    // 4. Main Initialization Button — bound early via bindInitButton()

    // Bind existing UI buttons
    const modeBtn = document.getElementById('mode-btn');
    if (modeBtn) {
        modeBtn.addEventListener('click', toggleMode);
    }
    syncPanopticonMuteButton();
    const panopticonMuteBtn = document.getElementById('panopticon-mute-btn');
    if (panopticonMuteBtn) {
        panopticonMuteBtn.addEventListener('click', togglePanopticonMuteSetting);
    }
    syncGardenBirdsMuteButton();
    const birdsMuteBtn = document.getElementById('birds-mute-btn');
    if (birdsMuteBtn) {
        birdsMuteBtn.addEventListener('click', toggleGardenBirdsMuteSetting);
    }
    bindSettingsMenu();
    /* next-poem / reset-timeline: bound in singularity.js (iOS touchend-safe) */

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

const lightboxCloseBtn = document.createElement('button');
lightboxCloseBtn.type = 'button';
lightboxCloseBtn.className = 'lightbox-close';
lightboxCloseBtn.setAttribute('aria-label', 'Close');
lightboxCloseBtn.innerHTML = '&times;';

document.querySelectorAll('.vault-item').forEach(item => {
    item.addEventListener('click', (e) => {
        if (e.target.closest('.carousel-btn') || e.target.closest('.carousel-slide')) return;

        const media = item.querySelector('.vault-media');
        if (!media) return;

        ensureMediaSrc(media);
        playSound(sfx.oneUp);
        
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
            media.classList.forEach((cls) => {
                if (cls.startsWith('vault-media--')) clone.classList.add(cls);
            });
            if (clone.tagName === 'VIDEO') {
                clone.controls = true;
                ensureMediaSrc(clone);
                clone.play().catch(() => {});
                if (media.classList.contains('vault-media--genesis')) {
                    globalThis.unlockTrophy?.('genesis_gate');
                }
            }
            if (clone.tagName === 'IMG') ensureMediaSrc(clone);
            lightboxOverlay.appendChild(clone);
        }
        
        lightboxOverlay.classList.add('active');
    });
});

function closeVaultLightbox() {
    lightboxOverlay.classList.remove('active');
    playSound(sfx.exit);
    setTimeout(() => { lightboxOverlay.innerHTML = ''; }, 300);
}

// 3. Update the click listener to close if you click the background OR the new 'X'
lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === lightboxOverlay || e.target === lightboxCloseBtn) {
        closeVaultLightbox();
    }
});

// --- SIDEBAR LOGIC ---
const hamburger = document.getElementById('hamburger-icon');
const sidebar = document.getElementById('sidebar-menu');

function resetSidebarText(textEl, label) {
    textEl.classList.remove('is-scrolling');
    textEl.classList.add('is-static');
    textEl.style.removeProperty('--marquee-duration');
    textEl.style.removeProperty('--marquee-offset');
    textEl.innerHTML = `<div class="track-title-scroll"><span class="track-title-content">// ${label}</span></div>`;
}

function initSidebarMarquees() {
    document.querySelectorAll('#sidebar-menu .sidebar-text').forEach((textEl) => {
        const label = (textEl.dataset.sidebarLabel || textEl.textContent.trim()).replace(/^\/\/\s*/, '');
        textEl.dataset.sidebarLabel = label;
        textEl.classList.add('track-title-marquee', 'is-static');
        resetSidebarText(textEl, label);

        const li = textEl.closest('li');
        if (!li) return;

        li.addEventListener('mouseenter', () => {
            window.setTimeout(() => applyTrackTitleMarquee(textEl, label), 280);
        });
        li.addEventListener('mouseleave', () => resetSidebarText(textEl, label));
    });
}

initSidebarMarquees();

// --- Update the Sidebar Logic in script.js ---
hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    playSound(sfx.keystroke); 
});


// --- SECRET COMPOSER LOGIC ---
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
                playGlitchSound();
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


// --- CORRUPTED MODE GLITCH / STATIC ENGINE ---

const CORRUPT_FX_CLASSES = [
    'chromatic-active',
    'corrupt-static',
    'corrupt-tear',
    'corrupt-flicker',
    'corrupt-blocks',
];

function corruptGlitchQuiet() {
    return Boolean(
        perf?.prefersReducedMotion
        || document.body.classList.contains('perf-lite')
        || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    );
}

function clearCorruptFxClasses() {
    for (const cls of CORRUPT_FX_CLASSES) {
        document.body.classList.remove(cls);
    }
}

function pickCorruptFxBurst(quiet) {
    const roll = Math.random();
    if (quiet) {
        // Overlay-only — skip body transform / chromaticFlash on lite devices
        if (roll < 0.55) return { classes: ['corrupt-static'], ms: 220 };
        if (roll < 0.85) return { classes: ['corrupt-flicker'], ms: 280 };
        return { classes: ['corrupt-static', 'corrupt-flicker'], ms: 260 };
    }
    if (roll < 0.28) return { classes: ['chromatic-active'], ms: 380 };
    if (roll < 0.48) return { classes: ['corrupt-static'], ms: 240 };
    if (roll < 0.66) return { classes: ['corrupt-tear'], ms: 200 };
    if (roll < 0.8) return { classes: ['corrupt-flicker'], ms: 320 };
    if (roll < 0.9) return { classes: ['corrupt-blocks'], ms: 220 };
    // Heavy combo
    return { classes: ['chromatic-active', 'corrupt-static', 'corrupt-tear'], ms: 420 };
}

function triggerRandomGlitch() {
    const corrupted = document.body.classList.contains('corrupted')
        && document.body.classList.contains('garden-ready')
        && !document.body.classList.contains('singularity-active');
    const quiet = corruptGlitchQuiet();

    if (corrupted && !perf?.prefersReducedMotion) {
        const burst = pickCorruptFxBurst(quiet);
        const root = document.documentElement;
        root.style.setProperty('--corrupt-tear-y', `${12 + Math.random() * 72}%`);
        root.style.setProperty('--corrupt-tear-x', `${(Math.random() * 36 - 18).toFixed(1)}px`);
        root.style.setProperty('--corrupt-tear-h', `${4 + Math.random() * 14}%`);
        root.style.setProperty('--corrupt-block-x', `${(Math.random() * 70).toFixed(1)}%`);
        root.style.setProperty('--corrupt-block-y', `${(Math.random() * 70).toFixed(1)}%`);

        clearCorruptFxClasses();
        for (const cls of burst.classes) {
            document.body.classList.add(cls);
        }

        window.setTimeout(clearCorruptFxClasses, burst.ms);

        if (Math.random() < (quiet ? 0.12 : 0.28)) {
            try {
                playGlitchSound({ volume: quiet ? 0.08 : 0.14 });
            } catch {
                /* ignore playback failures */
            }
        }
    }

    const minDelay = corrupted ? (quiet ? 5000 : 1400) : 8000;
    const maxDelay = corrupted ? (quiet ? 12000 : 5200) : 16000;
    const nextGlitchTime = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    window.setTimeout(triggerRandomGlitch, nextGlitchTime);
}

let glitchLoopStarted = false;

function startGlitchLoop() {
    if (glitchLoopStarted) return;
    glitchLoopStarted = true;
    triggerRandomGlitch();
}

// --- IDLE DISSOCIATION ENGINE ---
const IDLE_DISSOCIATION_MS_DEFAULT = 120000; // 2 minutes of inactivity
const IDLE_DISSOCIATION_ARM_GRACE_MS = 1200; // ignore filter-induced pointer noise
const IDLE_PTR_RESET_PX = 10; // ignore trackpad/OS jitter when arming the idle timer
const IDLE_PTR_WAKE_PX = 48; // require a real move to wake from sleep
let idleTimer;
let idleDissociationActive = false;
let idleDissociationIgnoreUntil = 0;
let idleLastPtr = null;

function idleDissociationDelayMs() {
    try {
        const raw = new URLSearchParams(globalThis.location?.search || '').get('idle');
        if (raw == null || raw === '') return IDLE_DISSOCIATION_MS_DEFAULT;
        const sec = Number(raw);
        if (!Number.isFinite(sec) || sec <= 0) return IDLE_DISSOCIATION_MS_DEFAULT;
        return Math.max(1, Math.round(sec * 1000));
    } catch {
        return IDLE_DISSOCIATION_MS_DEFAULT;
    }
}

function idlePointerCoords(e) {
    if (!e) return null;
    if (e.touches && e.touches.length) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
        return { x: e.clientX, y: e.clientY };
    }
    return null;
}

const IDLE_BLUR_SKIP_IDS = new Set([
    'panopticon-eye', // keep the sleeping eye sharp
    'grid-canvas', // CSS idle-dissociating handles greyscale/blur + chroma in sync
    'init-screen',
    'loader',
    'boss-key-overlay',
    'singularity-overlay',
    'corrupt-fx',
]);
const IDLE_BLUR_TRANSITION = 'filter 15s ease-in-out';
const IDLE_BLUR_UI_FILTER = 'grayscale(100%) blur(3px)';
const IDLE_BLUR_UI_SEED = 'grayscale(0%) blur(0px)';

function idleBlurTargets() {
    // Blur every top-level UI surface. Never filter ancestors of the eye.
    return Array.from(document.body.children).filter((el) => {
        if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) return false;
        const tag = el.tagName;
        if (tag === 'SCRIPT' || tag === 'LINK' || tag === 'STYLE' || tag === 'TEMPLATE') return false;
        if (IDLE_BLUR_SKIP_IDS.has(el.id)) return false;
        return true;
    });
}

function clearIdleDissociationBlur() {
    document.body.classList.remove('idle-dissociating');
    const marked = document.querySelectorAll('[data-idle-blur]');
    const targets = marked.length ? marked : idleBlurTargets();
    for (const el of targets) {
        // removeProperty (not filter:none) so stylesheet chroma/filters can return
        el.style.transition = 'filter 0.2s ease';
        el.style.removeProperty('filter');
        if (el instanceof HTMLElement || el instanceof SVGElement) {
            delete el.dataset.idleBlur;
        }
        globalThis.setTimeout?.(() => {
            if (!el.isConnected || el.dataset.idleBlur) return;
            el.style.removeProperty('transition');
        }, 220);
    }
    // Scrub any leftover inline canvas filter from older idle sleeps
    const canvas = document.getElementById('grid-canvas');
    if (canvas) {
        canvas.style.removeProperty('filter');
        canvas.style.removeProperty('transition');
        delete canvas.dataset.idleBlur;
    }
    document.body.style.removeProperty('filter');
}

function endIdleDissociation() {
    const hadBodyBlur = Boolean(document.body.style.filter);
    const hadTargetBlur = Boolean(
        document.body.classList.contains('idle-dissociating')
        || document.querySelector('[data-idle-blur]')
        || idleBlurTargets().some((el) => Boolean(el.style.filter))
    );
    if (!idleDissociationActive && !hadBodyBlur && !hadTargetBlur) return;
    idleDissociationActive = false;
    idleDissociationIgnoreUntil = 0;
    clearIdleDissociationBlur();
    triggerPanopticonWake();
}

function beginIdleDissociation() {
    idleDissociationActive = true;
    idleDissociationIgnoreUntil = performance.now() + IDLE_DISSOCIATION_ARM_GRACE_MS;
    idleLastPtr = null; // next pointer sample only anchors; do not wake on first report

    // Eye sleeps first (kept sharp), then the whole UI drifts into a blurry void
    triggerPanopticonSleep();

    const targets = idleBlurTargets();
    const canvas = document.getElementById('grid-canvas');
    for (const el of targets) el.dataset.idleBlur = '1';
    if (canvas) canvas.dataset.idleBlur = '1';

    // Seed UI at grey/blur 0 so it shares the same 15s envelope as the canvas CSS transition.
    for (const el of targets) {
        el.style.transition = 'none';
        el.style.filter = IDLE_BLUR_UI_SEED;
    }
    void document.body.offsetWidth;

    for (const el of targets) {
        el.style.transition = IDLE_BLUR_TRANSITION;
    }
    // Arm canvas transition before flipping the idle class (same 15s ease-in-out).
    if (canvas) {
        canvas.style.transition = IDLE_BLUR_TRANSITION;
    }
    void document.body.offsetWidth;

    document.body.classList.add('idle-dissociating');
    for (const el of targets) {
        el.style.filter = IDLE_BLUR_UI_FILTER;
    }
}

function scheduleIdleDissociation() {
    clearTimeout(idleTimer);
    if (document.body.classList.contains('pong-playing')) return;

    const delayMs = idleDissociationDelayMs();
    idleTimer = setTimeout(() => {
        if (document.hidden || isSingularityActive || document.body.classList.contains('pong-playing')) {
            return;
        }
        // Sleep first — terminal/behavior side effects must not abort dissociation.
        beginIdleDissociation();
        try {
            const idlePool = isCorrupted
                ? (lore?.idleMessagesSafe || []).concat(lore?.idleMessagesGritty || [])
                : (lore?.idleMessagesSafe || []);
            if (idlePool.length) {
                pushTerminalLog(idlePool[Math.floor(Math.random() * idlePool.length)]);
            }
            recordBehavior('idle_dissociation');
        } catch {
            /* keep sleeping even if log/behavior fails */
        }
    }, delayMs);
}

function onIdleActivity(e) {
    if (!gardenHasStarted) return;

    const type = e?.type || '';
    const isPtrMove = type === 'mousemove' || type === 'touchmove';
    const pt = isPtrMove ? idlePointerCoords(e) : null;
    const now = performance.now();

    // While arming sleep, ignore pointer noise entirely (filters can synthesize moves).
    if (now < idleDissociationIgnoreUntil && isPtrMove) return;

    if (idleDissociationActive) {
        if (isPtrMove) {
            if (!pt) return;
            // First sample after sleep only anchors position — do not wake yet.
            if (!idleLastPtr) {
                idleLastPtr = pt;
                return;
            }
            const dist = Math.hypot(pt.x - idleLastPtr.x, pt.y - idleLastPtr.y);
            if (dist < IDLE_PTR_WAKE_PX) return;
            idleLastPtr = pt;
        }
        endIdleDissociation();
        scheduleIdleDissociation();
        return;
    }

    // Not asleep: only meaningful pointer travel resets the AFK timer.
    if (isPtrMove) {
        if (!pt) return;
        if (!idleLastPtr) {
            idleLastPtr = pt;
            return;
        }
        const dist = Math.hypot(pt.x - idleLastPtr.x, pt.y - idleLastPtr.y);
        if (dist < IDLE_PTR_RESET_PX) return;
        idleLastPtr = pt;
    } else if (pt) {
        idleLastPtr = pt;
    }

    scheduleIdleDissociation();
}

window.addEventListener('mousemove', onIdleActivity);
window.addEventListener('keydown', onIdleActivity);
window.addEventListener('click', onIdleActivity);
window.addEventListener('touchstart', onIdleActivity, { passive: true });
window.addEventListener('touchmove', onIdleActivity, { passive: true });

function resetIdleTimer() {
    if (!gardenHasStarted) return;
    endIdleDissociation();
    scheduleIdleDissociation();
}

function startIdleDissociation() {
    scheduleIdleDissociation();
}

// Replace your old carousel script with this block
const track = document.getElementById('manifold-track');
const slides = Array.from(document.querySelectorAll('.carousel-slide'));
const nextBtn = document.querySelector('.next-btn');
const prevBtn = document.querySelector('.prev-btn');

// Lightbox Elements
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lbClose = lightbox?.querySelector('.lightbox-close');
const lbNext = lightbox?.querySelector('.lb-next');
const lbPrev = lightbox?.querySelector('.lb-prev');

let currentIndex = 0;
let isLightboxOpen = false;

// -- 1. The Main Grid Carousel Logic --
let carouselMeasureRetries = 0;
const MAX_CAROUSEL_MEASURE_RETRIES = 16;

function measureCarouselSlideWidth() {
  const wrapper = document.querySelector('#modal-vault .carousel-wrapper')
    || document.querySelector('.carousel-wrapper');
  const stage = wrapper?.closest('.carousel-stage')
    || document.querySelector('#modal-vault .carousel-stage')
    || document.querySelector('.carousel-stage');
  const carouselItem = wrapper?.closest('.carousel-container')
    || document.querySelector('#modal-vault .carousel-container')
    || document.querySelector('.carousel-container');
  const widths = [
    wrapper?.clientWidth,
    stage?.clientWidth,
    carouselItem?.clientWidth,
    wrapper?.getBoundingClientRect().width,
    stage?.getBoundingClientRect().width,
    carouselItem?.getBoundingClientRect().width,
    slides[0]?.getBoundingClientRect().width,
  ];
  return widths.find((w) => w > 0) || 0;
}

function updateCarousel() {
  if (!track || !slides.length) return;
  const slideWidth = measureCarouselSlideWidth();
  if (!slideWidth) {
    if (carouselMeasureRetries < MAX_CAROUSEL_MEASURE_RETRIES) {
      carouselMeasureRetries += 1;
      requestAnimationFrame(updateCarousel);
    }
    return;
  }
  carouselMeasureRetries = 0;

  slides.forEach((slide) => {
    slide.style.flexBasis = `${slideWidth}px`;
    slide.style.width = `${slideWidth}px`;
    slide.style.minWidth = `${slideWidth}px`;
    slide.style.height = '100%';
  });
  track.style.width = `${slideWidth * slides.length}px`;
  track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
}

globalThis.updateCarousel = updateCarousel;

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
  if (!lightboxImg || !slide) return;
  ensureMediaSrc(slide);
  const primary = slide.getAttribute('src') || slide.dataset.src || '';
  const fallback = slide.dataset.fallback || '';
  lightboxImg.onerror = null;
  if (fallback) {
    lightboxImg.onerror = () => {
      lightboxImg.onerror = null;
      lightboxImg.src = fallback;
    };
  }
  lightboxImg.src = primary;
}

function openLightbox(index) {
  if (!lightbox || !lightboxImg) return;
  playSound(sfx.oneUp);
  currentIndex = index;
  ensureMediaSrc(slides[currentIndex]);
  updateLightbox();
  document.body.appendChild(lightbox);
  lightbox.style.zIndex = '1000001';
  lightbox.classList.add('active');
  document.body.classList.add('lightbox-open');
  isLightboxOpen = true;
}

function closeLightbox() {
  playSound(sfx.exit);
  lightbox?.classList.remove('active');
  if (lightbox) lightbox.style.zIndex = '';
  document.body.classList.remove('lightbox-open');
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
lbClose?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeLightbox();
});
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox || e.target.closest('.lightbox-close')) closeLightbox();
});

function pongBlocksArrowNav(e) {
    return getHook('pongBlocksArrowNav')?.(e) ?? false;
}

function konamiClaimsKey(e) {
    const isPongActive = getHook('isPongSessionActive') ?? (() => false);
    return getHook('konamiClaimsKey')?.(e, isPongActive) ?? false;
}

// -- 3. Unified Keyboard Logic --
document.addEventListener('keydown', (e) => {
  if (pongBlocksArrowNav(e)) return;
  if (konamiClaimsKey(e)) return;
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

registerHooks({
    toggleBossKey,
    toggleFullscreen,
    handleReroll,
    toggleMode,
    resetTimeline,
    resetIdleTimer,
    firePanopticonComment,
    recordBehavior,
    printBehaviorReport,
    getBehaviorSnapshot,
    konamiBlocksPongArming: () => false,
    isKonamiInProgress: () => false,
    isKonamiActivelyEntering: () => false,
    isPongArmingActive: () => false,
    isPongSessionActive: () => false,
    konamiClaimsKey: () => false,
    cancelPongArming: () => {},
    cancelKonamiArming: () => {},
    resetKonamiSequence: () => {},
    setCorrupted: setIsCorrupted,
    syncPanopticonCodeSequenceComments,
    stopGardenLoop,
    resumeGardenLoop,
});

// --- GLOBAL HTML HANDLERS ---
window.openModal = openModal;
window.playPrevTrack = playPrevTrack;
window.playNextTrack = playNextTrack;
globalThis.updatePlaylistUI = updatePlaylistUI;

function init() {
    resizeCanvas();
    randomizeData();
}

if (document.readyState === 'complete') {
    init();
} else {
    window.addEventListener('load', init);
}
