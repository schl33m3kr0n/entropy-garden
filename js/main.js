// Entropy Garden — main entry (lazy-loads terminal, matrix, singularity, arcade)
import {
    sfx,
    playSound,
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
    playPrevTrack,
    playNextTrack,
    resetBgmToStart,
    prefetchLargeBgmTracks,
    getBgmTrack,
    getBgmTrackTitle,
    applyTrackTitleMarquee,
    panopticonEl,
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
    loadTerminal,
    getTerminalContainer,
    getTermInput,
    rebuildTerminalLogPool,
    reconcileSingularityPoem,
    stopSingularity3D,
    bootGameAddons,
} from './lazy.js';
import { registerServiceWorkerAfterInit } from './core/sw-register.js';
import { initIosUi, scrollIosHudHome, showIosScrollHints } from './ios/ios-ui.js';
import { setGodTitleArrangement } from './core/god-title.js';
import {
    firePanopticonComment,
    initPanopticonComments,
    panopticonCommentForModal,
} from './modules/panopticon-comments.js';

// Bind init immediately so a later module error cannot block the gatekeeper.
function prefetchGardenBoot() {
    warmSound(sfx.collectible);
    warmSound(sfx.loading);
    warmSound(sfx.boop);
}

function beginGardenExperience() {
    try {
        // Show loader before audio decode / BGM load (those can block the main thread).
        document.body.classList.add('garden-loading');
        document.body.classList.remove('garden-ready');

        const term = document.getElementById('terminal-container');
        term?.classList.remove('active', 'reveal-in', 'is-sliver');
        term?.setAttribute('hidden', '');
        document.getElementById('ios-terminal-toggle')?.setAttribute('hidden', '');

        const initScreen = document.getElementById('init-screen');
        if (initScreen) initScreen.style.display = 'none';
        canvas?.classList.remove('matrix-visible');
        setGardenHasStarted(true);
        updatePanopticonVisibility();
        prefetchLargeBgmTracks();
        startLoader();

        if (perf.isIOS) loadTerminal();

        ensureMatrix().then((mod) => {
            mod.resizeCanvas();
            mod.startGardenLoop();
            updatePanopticonVisibility();
            if (document.body.classList.contains('ios-ui')) {
                setTimeout(() => mod.resizeCanvas(), 300);
            }
        }).catch((err) => console.error('[Entropy Garden] matrix failed to load', err));

        registerServiceWorkerAfterInit();

        bootGameAddons(activateGodMode).catch((err) => {
            console.error('[Entropy Garden] game addons prefetch failed', err);
        });

        panopticonEl?.addEventListener('pointerdown', () => {
            bootGameAddons(activateGodMode).catch(() => {});
        }, { once: true, passive: true });

        requestAnimationFrame(() => {
            warmSound(sfx.collectible);
            playSound(sfx.collectible);
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
    initBtn.addEventListener('click', beginGardenExperience);
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
        setPanopticonGodMode(false);
        firePanopticonComment('godModeOff');
        globalThis.EntropyCipherHint?.onGodModeOff?.();
        pushTerminalLog("> SYSTEM OVERRIDE TERMINATED. RETURNING TO NORMALCY.");
        playSound(sfx.glitch);
        setGodTitleArrangement(h1, false).then(() => {
            body.classList.remove('god-mode');
        });
    }
    // IF NOT ACTIVE, TURN IT ON
    else {
        body.classList.add('god-mode');
        setPanopticonGodMode(true);
        firePanopticonComment('godModeOn', { force: true });
        setGodTitleArrangement(h1, true);
        pushTerminalLog("!!! OVERRIDE ACCEPTED !!!");
        playSound(sfx.missionCleared);
        globalThis.unlockTrophy?.('konami_god');
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
        draggedElement.style.zIndex = draggedElement.id.includes('pizza') ? 10010 : 10;
    }

    draggedElement = null;
    
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchend', handleDragEnd);
}


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

const closeMayaBtn = document.getElementById('close-maya-btn');
if (closeMayaBtn) closeMayaBtn.addEventListener('click', toggleBossKey);
document.querySelectorAll('.boss-btn').forEach((btn) => btn.addEventListener('click', toggleBossKey));

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
    "Reducing the irreducible... (Error)",
    "Settling scores with my imaginary friends...",
    "Experimenting with unstable isotopes... (and women)",
    "Deferring legal decisions to my clown lawyer...",
    "Beep boop bop beep boop boop bop..."
];

function revealGardenUI() {
    document.body.classList.remove('garden-loading');
    document.body.classList.add('garden-ready');
    updatePanopticonVisibility();
    startGlitchLoop();
    startIdleDissociation();
    startPanopticonIdleComments();
    initPanopticonComments();
    setTimeout(() => firePanopticonComment('init', { force: true }), 1400);

    const term = document.getElementById('terminal-container');

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

    playSound(sfx.ui);

    const iosTerminalToggle = document.getElementById('ios-terminal-toggle');

    const revealTerminalChrome = () => {
        if (isIosLayout) {
            iosTerminalToggle?.removeAttribute('hidden');
            return;
        }
        if (!term) return;
        term.removeAttribute('hidden');
        term.classList.add('is-sliver');
        void term.offsetWidth;
        requestAnimationFrame(() => term.classList.add('reveal-in'));
    };

    if (isIosLayout) {
        hud?.classList.add('active');
        document.getElementById('mode-btn')?.classList.add('active');
        document.querySelector('.control-panel')?.classList.add('active');
        if (playlistMenu) {
            playlistMenu.classList.add('active');
            updatePlaylistUI();
        }
        setTimeout(revealTerminalChrome, 450);
        scrollIosHudHome('smooth');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => showIosScrollHints());
        });
        return;
    }

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
    }, 750);
}

const LOADER_MIN_MS = 4000;
const LOADER_FADE_HOLD_MS = 500;
const LOADER_FADE_MAX_MS = 900;

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
    let tickCounter = 0; // Keeps track of time to stabilize the text
    
    const interval = setInterval(() => {
        progress += Math.random() * 5 + 1.5; 
        tickCounter++; 
        
        if (progress >= 99 && (Date.now() - startTime) < LOADER_MIN_MS) { progress = 99; }
        
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
    firePanopticonComment('dockingSlot');
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
    firePanopticonComment('slotFail');

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
    document.getElementById('mode-btn').classList.add('active');

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
function toggleMode() {
    const btn = document.getElementById('mode-btn');
    toggleIsCorrupted();
    setNeedsFullRedraw(true);
    if (isCorrupted) {
        document.body.classList.add('corrupted');
        btn.innerText = "CORRUPTED MODE";
        playSound(sfx.glitch);
        pushTerminalLog("> CORRUPTED MODE ENGAGED");
        firePanopticonComment('corruptOn', { force: true });
        globalThis.unlockTrophy?.('corrupted_bloom');
    } else {
        document.body.classList.remove('corrupted');
        btn.innerText = "SAFE MODE";
        playSound(sfx.it);
        pushTerminalLog("> SAFE MODE RESTORED");
        firePanopticonComment('corruptOff');
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

const MODALS_WITHOUT_REROLL_HINT = new Set(['vault', 'arcade', 'trophies', 'poems']);

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
        if (resolvedId === 'arcade') {
            loadArcadeLevel().catch((err) => {
                console.error('[Entropy Garden] arcade failed to load', err);
                pushTerminalLog('> ARCADE MODULE OFFLINE.');
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
function bindDomEvents() {
    initIosUi();
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
        const setPlayPauseLabel = (btn, playing) => {
            if (perf.isIOS) {
                btn.textContent = playing
                    ? (btn.dataset.label || 'PAUSE')
                    : (btn.dataset.playLabel || 'PLAY');
                return;
            }
            btn.innerHTML = playing ? '&#10074;&#10074;' : '&#9658;';
        };

        playPauseBtn.addEventListener('click', function() {
            const track = getBgmTrack(currentTrackIndex);
            if (track.paused) {
                playCurrentBgmTrack();
                setPlayPauseLabel(this, true);
                pushTerminalLog("> AUDIO RESUMED.");
                firePanopticonComment('playlistPlay');
            } else {
                track.pause();
                setPlayPauseLabel(this, false);
                pushTerminalLog("> AUDIO SUSPENDED.");
                firePanopticonComment('playlistPause');
            }
        });
    }
    
    // 3. Sidebar hover sounds (desktop only; iOS taps use press in openModal)
    if (!perf.isIOS) {
        document.querySelectorAll('#sidebar-menu li').forEach(item => {
            item.addEventListener('mouseenter', () => {
                const hoverClone = sfx.click.cloneNode();
                hoverClone.volume = 0.4;
                hoverClone.play().catch(e => {});
            });
        });
    }

    // 4. Main Initialization Button — bound early via bindInitButton()

    // Bind existing UI buttons
    const modeBtn = document.getElementById('mode-btn');
    if (modeBtn) {
        modeBtn.addEventListener('click', toggleMode);
    }
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
            if (clone.tagName === 'IMG') ensureMediaSrc(clone);
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

let glitchLoopStarted = false;

function startGlitchLoop() {
    if (glitchLoopStarted) return;
    glitchLoopStarted = true;
    triggerRandomGlitch();
}

// --- IDLE DISSOCIATION ENGINE ---
let idleTimer;

function resetIdleTimer() {
    if (!gardenHasStarted) return;
    clearTimeout(idleTimer);

    // Only touch styles when dissociation blur is active (avoid main-thread churn on every mousemove).
    if (document.body.style.filter) {
        document.body.style.transition = 'filter 0.2s ease';
        document.body.style.filter = 'none';
        triggerPanopticonWake();
    }

    if (document.body.classList.contains('pong-playing')) return;
    
    idleTimer = setTimeout(() => {
        // Only trigger if they are actually looking at the page and not in the singularity
        if (!document.hidden && !isSingularityActive && !document.body.classList.contains('pong-playing')) {
            const idlePool = isCorrupted
                ? lore.idleMessagesSafe.concat(lore.idleMessagesGritty)
                : lore.idleMessagesSafe;
            const randomMsg = idlePool[Math.floor(Math.random() * idlePool.length)];
            pushTerminalLog(randomMsg);
            
            // A slow, 15-second descent into a blurry void
            document.body.style.transition = 'filter 15s ease-in-out';
            document.body.style.filter = 'grayscale(100%) blur(3px)';
            triggerPanopticonSleep();
        }
    }, 60000); // 60 seconds of total inactivity
}

// Listen for any sign of life
window.addEventListener('mousemove', resetIdleTimer);
window.addEventListener('keydown', resetIdleTimer);
window.addEventListener('click', resetIdleTimer);
window.addEventListener('touchstart', resetIdleTimer, { passive: true });
window.addEventListener('touchmove', resetIdleTimer, { passive: true });

function startIdleDissociation() {
    resetIdleTimer();
}

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
let carouselMeasureRetries = 0;
const MAX_CAROUSEL_MEASURE_RETRIES = 16;

function measureCarouselSlideWidth() {
  const wrapper = document.querySelector('#modal-vault .carousel-wrapper')
    || document.querySelector('.carousel-wrapper');
  const stage = wrapper?.closest('.carousel-stage')
    || document.querySelector('#modal-vault .carousel-stage')
    || document.querySelector('.carousel-stage');
  const carouselItem = wrapper?.closest('.vault-item.carousel-container')
    || document.querySelector('.vault-item.carousel-container');
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
lbClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

function pongBlocksArrowNav(e) {
    return globalThis.gardenHooks?.pongBlocksArrowNav?.(e) ?? false;
}

function konamiClaimsKey(e) {
    const isPongActive = globalThis.gardenHooks?.isPongSessionActive ?? (() => false);
    return globalThis.gardenHooks?.konamiClaimsKey?.(e, isPongActive) ?? false;
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

globalThis.gardenHooks = {
    ...globalThis.gardenHooks,
    toggleBossKey,
    handleReroll,
    toggleMode,
    resetTimeline,
    resetIdleTimer,
    firePanopticonComment,
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
};

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
