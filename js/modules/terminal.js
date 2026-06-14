import {
    sfx,
    playSound,
    playMeow,
    createBag,
    shuffle,
    triggerPanopticonCenterStare,
    perf,
} from '../core/shared.js';
import {
    cipherStage,
    setCipherStage,
    setIsCipherSolved,
    setIsSingularityActive,
    incrementExtraPizzas,
    isCorrupted,
} from '../core/state.js';
import { resizeCanvas, triggerSingularity } from '../lazy.js';

export function getCipherStage() {
    return cipherStage;
}

globalThis.getCipherStage = getCipherStage;

export let terminalContainer;
export let termInput;

function setTermInputFocusable(focusable) {
    if (!termInput) return;
    termInput.tabIndex = focusable ? 0 : -1;
}

function gardenBlocksTerminalKeys() {
    if (!document.body.classList.contains('garden-ready')) return true;
    if (document.getElementById('lightbox')?.classList.contains('active')) return true;
    for (const modal of document.querySelectorAll('.modal')) {
        if (getComputedStyle(modal).display === 'flex') return true;
    }
    return false;
}

/** One open beep — EntropyTerminalSfx.open() returns undefined, so never use ?? with playSound. */
function playTerminalOpenSound() {
    if (globalThis.EntropyTerminalSfx?.open) {
        globalThis.EntropyTerminalSfx.open();
    } else if (sfx.radio) {
        playSound(sfx.radio);
    }
}

function ensureTerminalChromeVisible() {
    if (!terminalContainer) return;
    terminalContainer.removeAttribute('hidden');
    terminalContainer.classList.add('reveal-in', 'is-sliver');
    document.getElementById('ios-terminal-toggle')?.removeAttribute('hidden');
}

function collapseTerminalToSliver() {
    if (!terminalContainer) return;
    terminalContainer.classList.remove('active');
    terminalContainer.classList.add('is-sliver', 'reveal-in');
}

export function toggleTerminal() {
    if (!terminalContainer || gardenBlocksTerminalKeys()) return;
    ensureTerminalChromeVisible();

    if (terminalContainer.classList.contains('active')) {
        collapseTerminalToSliver();
        setTermInputFocusable(false);
        termInput?.blur();
        if (sfx.burp) playSound(sfx.burp);
        globalThis.gardenHooks?.firePanopticonComment?.('terminalClose');
        if (cipherStage > 0) {
            setCipherStage(0);
            globalThis.EntropyCipherHint?.resetCipherHints?.();
            pushTerminalLog('> CIPHER SEQUENCE ABORTED.');
        }
        return;
    }

    if (document.activeElement) document.activeElement.blur();
    playTerminalOpenSound();
    terminalContainer.classList.add('active');
    globalThis.gardenHooks?.firePanopticonComment?.('terminalOpen');
    globalThis.gardenHooks?.recordBehavior?.('terminal_open');
    setTermInputFocusable(true);
    lastTerminalOpenTime = Date.now();
    setTimeout(() => {
        termInput?.focus({ preventScroll: true });
    }, 420);
}

function openTerminalFromClick(options = {}) {
    if (!terminalContainer || gardenBlocksTerminalKeys()) return;
    ensureTerminalChromeVisible();
    const wasOpen = terminalContainer.classList.contains('active');
    if (!wasOpen && options.playOpenSound !== false) {
        playTerminalOpenSound();
        lastTerminalOpenTime = Date.now();
    }
    terminalContainer.classList.add('active');
    if (!wasOpen) globalThis.gardenHooks?.recordBehavior?.('terminal_open');
    setTermInputFocusable(true);
    setTimeout(() => {
        termInput?.focus({ preventScroll: true });
    }, 420);
}

/** Focus terminal without replaying open SFX (iOS bootstrap / lazy shell). */
export function focusTerminal() {
    resolveTerminalElements();
    openTerminalFromClick({ playOpenSound: false });
}

/** Programmatic open (iOS toggle button, gardenHooks). */
export function openTerminal() {
    resolveTerminalElements();
    openTerminalFromClick({ playOpenSound: true });
}
let lastTerminalOpenTime = 0;

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

export function rebuildTerminalLogPool() {
    drawTerminalLog = createBag(activeTerminalPool());
}

/** How long after Enter to keep following output (covers delayed cipher/log lines). */
const TERMINAL_SCROLL_PIN_MS = 12000;

let terminalScrollPinnedUntil = 0;

export function scrollTerminalOutputToBottom() {
    const term = document.getElementById('terminal-output');
    if (!term) return;
    term.scrollTop = term.scrollHeight;
}

function pinTerminalScroll(ms = TERMINAL_SCROLL_PIN_MS) {
    terminalScrollPinnedUntil = performance.now() + ms;
    scrollTerminalOutputToBottom();
}

function terminalOutputShouldFollow() {
    const term = document.getElementById('terminal-output');
    if (!term) return false;
    if (performance.now() < terminalScrollPinnedUntil) return true;
    return term.scrollHeight - term.clientHeight <= term.scrollTop + 50;
}

export function pushTerminalLog(msg, options) {
    const term = document.getElementById('terminal-output');
    if (!term) return;
    const finalMsg = msg || drawTerminalLog();

    const p = document.createElement('div');
    p.className = 'term-entry';
    if (options?.html) {
        p.innerHTML = finalMsg;
    } else {
        p.innerText = finalMsg;
    }
    term.appendChild(p);

    if (term.children.length > 50) term.removeChild(term.firstChild);

    if (options?.scroll === false) return;
    if (terminalOutputShouldFollow()) {
        scrollTerminalOutputToBottom();
    }
}
function startTerminalLogFeed() {
    if (startTerminalLogFeed.started) return;
    startTerminalLogFeed.started = true;

    if (perf.isIOS) {
        const scheduleTerminalLog = () => {
            setTimeout(() => {
                if (!document.hidden && document.body.classList.contains('garden-ready')) {
                    pushTerminalLog();
                }
                scheduleTerminalLog();
            }, 12000 + Math.random() * 8000);
        };
        scheduleTerminalLog();
    } else {
        setInterval(() => {
            if (!document.hidden && document.body.classList.contains('garden-ready')) {
                pushTerminalLog();
            }
        }, 3000 + Math.random() * 4000);
    }
}

if (document.body.classList.contains('garden-ready')) {
    startTerminalLogFeed();
} else {
    window.addEventListener('entropy:garden-ready', startTerminalLogFeed, { once: true });
}

let termInputHandlersBound = false;
let terminalInteractionsBound = false;
let terminalGlobalHandlersBound = false;

const TERMINAL_CLOSE_GUARD_MS = perf.isIOS ? 500 : 150;

function resolveTerminalElements() {
    terminalContainer = document.getElementById('terminal-container');
    termInput = document.getElementById('term-input');
    return Boolean(terminalContainer);
}

function isTerminalSubmitKey(e) {
    return e.key === 'Enter' || e.keyCode === 13 || e.which === 13;
}

function submitTerminalCommand() {
    if (!termInput) return;
    const val = termInput.value.trim();
    if (!val) return;
    const normalized = val.toLowerCase();
    pinTerminalScroll();
    pushTerminalLog(`> ${val}`);
    termInput.value = '';
    processCommand(normalized);
    scrollTerminalOutputToBottom();
    requestAnimationFrame(scrollTerminalOutputToBottom);
}

function bindTermInputHandlers() {
    if (termInputHandlersBound || !termInput) return;
    termInputHandlersBound = true;

    termInput.addEventListener('input', () => {
        const soundClone = sfx.keystroke.cloneNode();
        soundClone.volume = 0.5;
        soundClone.play().catch(() => {});
    });

    termInput.addEventListener('keydown', (e) => {
        if (!isTerminalSubmitKey(e)) return;
        e.preventDefault();
        submitTerminalCommand();
    });

    termInput.addEventListener('blur', () => {
        if (!perf.isIOS) setTimeout(resizeCanvas, 120);
    });
}

// --- COMMAND PROCESSING & SCATTER LOGIC ---
const fakeFiles = [
    "Render_Final_FINAL.mp4", "topology_nightmare.obj", "donut_tutorial_failed.blend", 
    "Untitled_042.psd", "why_is_this_crashing.ma", "hubba_bubba_cache.db", 
    "Korzamuron_grammar_v2.txt", "woop.mp3", "do_not_delete.sys", 
    "skate_footage_raw.mov", "resume_draft_v7.pdf"
];

// --- CIPHER HELPERS & REWARDS ---
const korzamuronCipherPlain =
    () => globalThis.EntropyCipher?.plaintext || 'hun nuresk';

const CIPHER_FALLBACK_CT = 'jiq rrtsvo';

function cipherCiphertext() {
    return globalThis.EntropyCipher?.ciphertext || CIPHER_FALLBACK_CT;
}

/** True when the submitted key decrypts the live ciphertext to the Korzamuron fragment. */
function tryAcceptCipherKey(cleanCmd) {
    const cipher = globalThis.EntropyCipher;
    if (!cipher?.decrypt) return cleanCmd === 'codex';
    const keyNorm = cleanCmd.replace(/[^a-z]/g, '');
    if (!keyNorm) return false;
    const plain = cipher.decrypt(cipherCiphertext(), keyNorm);
    return plain === korzamuronCipherPlain();
}

const CIPHER_TRANSLATION_ANSWERS = new Set(['chaos', 'disorder']);

function printLexicon() {
    pushTerminalLog("> KORZAMURON DATABANK FRAGMENT:");
    pushTerminalLog("> hun = storm | nuresk = vital");
    pushTerminalLog('> hun nuresk <em>/from Korzamuron/</em>', { html: true });
}

// --- NEW: THE SHORTCUTS MENU ---
function printShortcuts() {
    pushTerminalLog("> --- SYSTEM HOTKEYS ---");
    pushTerminalLog("> [ >_ ]    : Open Terminal");
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

    setIsCipherSolved(true);
    import('../ios-poems.js').then((m) => m.syncIosPoemsSidebar?.()).catch(() => {});

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
        globalThis.checkCycleWinAfterCipher?.();
    }, 8000);

    // Reset Terminal Appearance
    setTimeout(() => {
        term.style.borderColor = 'var(--neon-green)';
        term.style.color = 'var(--neon-green)';
        term.style.textShadow = '0 0 3px var(--neon-green)';
        if (termInputLine) termInputLine.style.display = 'flex';
    }, 9500);
}

function runExpressOverride() {
    pushTerminalLog('> EXPRESS OVERRIDE ACCEPTED. BYPASSING SECURITY PROTOCOLS...');
    setCipherStage(0);
    globalThis.EntropyCipherHint?.resetCipherHints?.();
    terminalContainer?.classList.remove('active');
    setTermInputFocusable(false);
    termInput?.blur();

    if (perf.isIOS || document.body.classList.contains('ios-ui')) {
        import('../ios-poems.js')
            .then((m) => {
                m.unlockIosPoems?.();
                triggerSingularity();
            })
            .catch(() => triggerSingularity());
        return;
    }

    setIsSingularityActive(false);
    document.body.classList.remove('singularity-active');
    triggerSingularity();
}

function processCommand(cmd) {
    // Clean the input to ignore capitals and punctuation
    const cleanCmd = cmd.toLowerCase().replace(/[.,]/g, "").trim();
    globalThis.gardenHooks?.recordBehavior?.('terminal_command');

    if (cmd === 'express') {
        runExpressOverride();
        return;
    }

    // ==========================================
    // STAGE 1: Waiting for the Vigenère Key
    // ==========================================
    if (cipherStage === 1) {
        if (cleanCmd === 'abort' || cleanCmd === 'exit' || cleanCmd === 'esc' || cleanCmd === 'quit') {
            pushTerminalLog("> CIPHER SEQUENCE ABORTED.");
            playSound(sfx.glitch);
            setCipherStage(0);
            globalThis.EntropyCipherHint?.resetCipherHints?.();
        } else if (tryAcceptCipherKey(cleanCmd)) {
            pushTerminalLog("> KEYWORD ACCEPTED. DECRYPTING...");
            playSound(sfx.taskComplete);
            const plain = korzamuronCipherPlain();
            setTimeout(() => {
                pushTerminalLog(`> DECRYPTED FRAGMENT: '${plain}'`);
                pushTerminalLog("> AWAITING ENGLISH TRANSLATION...");
                setCipherStage(2);
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
            setCipherStage(0);
            globalThis.EntropyCipherHint?.resetCipherHints?.();
        } else if (cleanCmd === 'lexicon') {
            printLexicon(); // Print the dictionary without failing the puzzle
        } else if (CIPHER_TRANSLATION_ANSWERS.has(cleanCmd)) {
            pushTerminalLog("> TRANSLATION ACCEPTED. DATA UNLOCKED.");
            playSound(sfx.missionCleared);
            setCipherStage(0);
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
    if (isCorrupted && ['hello', 'hi', 'hey', 'sup', 'yo', 'greetings', 'howdy'].includes(cleanCmd)) {
        pushTerminalLog("> shut up. 🖕");
        playSound(sfx.stfu);
        triggerPanopticonCenterStare();
    }
    else if(cmd === 'help') pushTerminalLog("AVAILABLE: help, clear, meow, pizza, render, scatter, time, cipher, lexicon, shortcuts, analyze");
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
    else if(cmd === 'compose') {
        pushTerminalLog("> INITIATING VOID EDITOR...");
        globalThis.openComposer?.();
    }
    else if(cmd === 'time') { 
        pushTerminalLog(`> CURRENT SYSTEM TIME: ${new Date().toLocaleTimeString()}`); 
    }
    else if(cmd === 'signal' || cmd === 'live_feed') {
        globalThis.openModal('signal');
    }
    else if(cmd === 'arcade' || cmd === 'play' || cmd === 'game') {
        pushTerminalLog("> BOOTING EMULATOR...");
        globalThis.openModal('arcade');
    }
    else if(cmd === 'lexicon') {
        printLexicon();
    }
    else if (['analyze', 'behavior', 'behaviour', 'profile'].includes(cleanCmd)) {
        globalThis.gardenHooks?.printBehaviorReport?.();
        playSound(sfx.it);
    }
    // THE NEW MULTI-STAGE CIPHER COMMAND
    else if(cmd === 'cipher') {
        if (cipherStage > 0) {
            pushTerminalLog("> CIPHER PROTOCOL ALREADY ACTIVE.");
            playSound(sfx.oopsy);
            return;
        }
        setCipherStage(1);
        pushTerminalLog("> INITIATING VIGENÈRE DECRYPTION PROTOCOL...");
        playSound(sfx.loading);
        const ct = cipherCiphertext();
        setTimeout(() => {
            pushTerminalLog(`> CIPHERTEXT: '${ct}'`);
            pushTerminalLog("> AWAITING DECRYPTION KEY...");
            pushTerminalLog("> (HINT: 'Dresden ..., Aleppo ..., ... Gigas')");
        }, 2000);
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
    const id = incrementExtraPizzas();
    const newPizza = document.createElement('div'); 
    newPizza.className = 'artifact artifact-pizza'; 
    newPizza.id = 'art-pizza-clone-' + id;
    newPizza.style.top = '-100px'; 
    newPizza.style.left = (Math.random() * 80 + 10) + '%'; 
    newPizza.style.zIndex = '10010';
    newPizza.style.transition = 'transform 0.1s';
    newPizza.innerHTML = `<svg viewBox="0 0 100 100"><path d="M50 10 L85 85 L15 85 Z" fill="none"/><circle cx="50" cy="40" r="4" fill="none"/><circle cx="65" cy="65" r="4" fill="none"/><circle cx="35" cy="65" r="4" fill="none"/></svg>`;
    document.body.appendChild(newPizza);
    setTimeout(() => { newPizza.style.transition = 'top 0.5s ease-out, left 0.5s ease-out'; newPizza.style.top = (Math.random() * 60 + 10) + '%'; }, 50);
    setTimeout(() => { newPizza.style.transition = 'transform 0.1s'; }, 600); 
    playSound(sfx.collectible);
}
// --- TERMINAL INTERACTION LOGIC ---
function shouldIgnoreTerminalOutsideDismiss() {
    return Date.now() - lastTerminalOpenTime < TERMINAL_CLOSE_GUARD_MS;
}

function dismissTerminalIfOutside(target) {
    if (!terminalContainer?.classList.contains('active')) return;
    if (shouldIgnoreTerminalOutsideDismiss()) return;
    if (target?.closest?.('#terminal-container, #ios-terminal-toggle')) return;
    collapseTerminalToSliver();
    setTermInputFocusable(false);
    termInput?.blur();
}

function handleTerminalActivate(e) {
    if (!terminalContainer || gardenBlocksTerminalKeys()) return;
    if (terminalContainer.classList.contains('active')) return;
    if (e.type === 'pointerup' && e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    openTerminalFromClick({ playOpenSound: !terminalContainer.classList.contains('active') });
}

function bindTerminalInteractions() {
    if (!resolveTerminalElements()) {
        console.warn('[Entropy Garden] #terminal-container missing — terminal UI disabled');
        return;
    }
    bindTermInputHandlers();

    if (!terminalInteractionsBound) {
        terminalInteractionsBound = true;
        terminalContainer.addEventListener('pointerup', handleTerminalActivate);
    }

    if (terminalGlobalHandlersBound) return;
    terminalGlobalHandlersBound = true;

    window.addEventListener('click', (e) => {
        dismissTerminalIfOutside(e.target);
    });

    let tabSpamCount = 0;
    let tabSpamTimer;

    window.addEventListener('keydown', (e) => {
    const isTyping = document.activeElement?.tagName === 'INPUT'
        || document.activeElement?.tagName === 'TEXTAREA';

    // 1. Pressing ENTER opens the terminal (if it's closed)
    if (e.key === 'Enter' && !gardenBlocksTerminalKeys() && !isTyping) {
        if (!terminalContainer.classList.contains('active')) {
            e.preventDefault();
            if (document.activeElement) document.activeElement.blur();
            openTerminalFromClick();
        }
    }

   // 2. Pressing TAB toggles the terminal open/closed
    if (e.key === 'Tab' && !gardenBlocksTerminalKeys()) {
        e.preventDefault();

        tabSpamCount++;
        clearTimeout(tabSpamTimer);
        tabSpamTimer = setTimeout(() => { tabSpamCount = 0; }, 1500);

        if (tabSpamCount === 8) {
            pushTerminalLog('> MAKE UP YOUR MIND.');
            if (sfx.stop) playSound(sfx.stop);
            tabSpamCount = 0;
            return;
        }

        const wasOpen = terminalContainer.classList.contains('active');
        toggleTerminal();
        if (!wasOpen) lastTerminalOpenTime = Date.now();
    }

   // 3. Pressing the TILDE (`) key triggers the Maya Screen (Boss Key)
    if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        const toggle = globalThis.gardenHooks?.toggleBossKey ?? globalThis.toggleBossKey;
        if (typeof toggle === 'function') toggle();
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
            globalThis.gardenHooks.handleReroll(); 
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
                setTermInputFocusable(true);
                lastTerminalOpenTime = Date.now();
                playTerminalOpenSound();
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
            globalThis.gardenHooks.toggleMode(); // Fires your existing corruption toggle function
        }
    }

    }, true);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTerminalInteractions, { once: true });
} else {
    bindTerminalInteractions();
}

globalThis.gardenHooks = globalThis.gardenHooks || {};
globalThis.gardenHooks.toggleTerminal = toggleTerminal;
globalThis.gardenHooks.openTerminal = openTerminal;

window.addEventListener('entropy:garden-ready', () => {
    bindTerminalInteractions();
}, { once: true });

export function initTerminal() {
    initLateNightLogs();
    bindTerminalInteractions();
}

function initLateNightLogs() {
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 5) {
        document.documentElement.style.setProperty('--neon-green', '#ccff00');
        lateNightLogs = [
            "> WHO ARE YOU PERFORMING FOR?",
            "> THE SUN IS COMING UP. HOW EMBARRASSING.",
            "> THE TOPOLOGY CAN WAIT. SLEEP.",
            "> GEOMETRY JUDGES YOU IN THE DARK.",
            "> NOT EVEN THE BOTS ARE AWAKE.",
        ];
        rebuildTerminalLogPool();
    }
}

export { spawnPizza, processCommand, printShortcuts, printLexicon, triggerScatter, triggerCipherReward };
