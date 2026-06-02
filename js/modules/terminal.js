import {
    sfx,
    playSound,
    playMeow,
    createBag,
    shuffle,
    triggerPanopticonCenterStare,
    triggerPanopticonCatEye,
    perf,
} from '../shared.js';
import {
    cipherStage,
    isCipherSolved,
    incrementExtraPizzas,
    isCorrupted,
} from '../state.js';
import { triggerSingularity, triggerOspreyEvent, resizeCanvas } from '../lazy.js';

export let terminalContainer;
export let termInput;
let lastTerminalOpenTime = 0;
let terminalPokes = 0;
let pokeResetTimer;

export function getCipherStage() {
    return cipherStage;
}

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

export function pushTerminalLog(msg) {
    const term = document.getElementById('terminal-output');
    const finalMsg = msg || drawTerminalLog();
    
    // 1. Check if the user is currently looking at the bottom BEFORE adding the new message.
    // We add a 50px buffer so it's forgiving if they are just slightly off the exact bottom pixel.
    const isScrolledToBottom = term.scrollHeight - term.clientHeight <= term.scrollTop + 50;

    const p = document.createElement('div'); 
    p.className = 'term-entry'; 
    p.innerText = finalMsg;
    term.appendChild(p); 
    
    if(term.children.length > 50) term.removeChild(term.firstChild); 
    
    // 2. Only force the scrollbar down if they were already at the bottom
    if (isScrolledToBottom) {
        term.scrollTop = term.scrollHeight; 
    }
}
if (perf.isIOS) {
    const scheduleTerminalLog = () => {
        setTimeout(() => {
            if (!document.hidden) pushTerminalLog();
            scheduleTerminalLog();
        }, 12000 + Math.random() * 8000);
    };
    scheduleTerminalLog();
} else {
    setInterval(() => {
        if (!document.hidden) pushTerminalLog();
    }, 3000 + Math.random() * 4000);
}

termInput = document.getElementById('term-input');

termInput.addEventListener('input', () => {
    const soundClone = sfx.keystroke.cloneNode(); // Creates a "fresh" copy for every tap
    soundClone.volume = 0.5; // Lower volume so it isn't deafening
    soundClone.play().catch(e => {});
});

termInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') {
        let val = termInput.value.toLowerCase().trim();
        if(val) { 
            pushTerminalLog(`> ${val}`); 
            termInput.value = ''; 
            processCommand(val); 
        }
    }
});

termInput.addEventListener('blur', () => {
    if (!perf.isIOS) setTimeout(resizeCanvas, 120);
});

// --- COMMAND PROCESSING & SCATTER LOGIC ---
const fakeFiles = [
    "Render_Final_FINAL.mp4", "topology_nightmare.obj", "donut_tutorial_failed.blend", 
    "Untitled_042.psd", "why_is_this_crashing.ma", "hubba_bubba_cache.db", 
    "Korzamuron_grammar_v2.txt", "woop.mp3", "do_not_delete.sys", 
    "skate_footage_raw.mov", "resume_draft_v7.pdf"
];

// --- CIPHER HELPERS & REWARDS ---
function printLexicon() {
    pushTerminalLog("> KORZAMURON DATABANK FRAGMENT:");
    pushTerminalLog("> ves = as | yon = above");
    pushTerminalLog("> kol = so | vel = below");
    pushTerminalLog("> bran = earth | sjum = fire");
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
    
    // Turn terminal Cyan for the hack effect
    term.style.borderColor = 'var(--cyan)';
    term.style.color = 'var(--cyan)';
    term.style.textShadow = '0 0 10px var(--cyan)';
    termInputLine.style.display = 'none'; 

    setTimeout(() => pushTerminalLog("> TRANSLATION LOGIC VERIFIED."), 500);
    setTimeout(() => pushTerminalLog("> KORZAMURON ARCHIVE UNLOCKED."), 1500);
    setTimeout(() => pushTerminalLog("> 'The vowels are entirely too many, but the prime thread remains.'"), 2500);
    
    // The Docking Bay Hint
    setTimeout(() => pushTerminalLog("> DECRYPTING DOCKING BAY OVERRIDE..."), 4500);
    setTimeout(() => pushTerminalLog("> SEQUENCE: [ 1. FUEL | 2. SOURCE | 3. HOARD ]"), 6000);
    
    // THE CRITICAL MOMENT: Flip the switch
    setTimeout(() => {
        isCipherSolved = true; 
        pushTerminalLog("> DOCKING BAY UNLOCKED. AWAITING MANUAL OVERRIDE.");
        playSound(sfx.collectible);
    }, 8000);
    
    // Reset Terminal Appearance
    setTimeout(() => {
        term.style.borderColor = 'var(--neon-green)';
        term.style.color = 'var(--neon-green)';
        term.style.textShadow = '0 0 3px var(--neon-green)';
        termInputLine.style.display = 'flex';
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
        } else if (cleanCmd === 'codex') {
            pushTerminalLog("> KEYWORD ACCEPTED. DECRYPTING...");
            playSound(sfx.taskComplete);
            setTimeout(() => {
                pushTerminalLog("> DECRYPTED FRAGMENT: 'ves yon, kol vel'");
                pushTerminalLog("> AWAITING ENGLISH TRANSLATION...");
                cipherStage = 2; // Move to the translation phase
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
        } else if (cleanCmd === 'lexicon') {
            printLexicon(); // Print the dictionary without failing the puzzle
        } else if (cleanCmd === 'as above so below') {
            pushTerminalLog("> TRANSLATION ACCEPTED. DATA UNLOCKED.");
            playSound(sfx.missionCleared);
            cipherStage = 0; // Reset the puzzle state
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
    else if(cmd === 'meow') {
        pushTerminalLog("Synthesizing feline frequency in G Major...");
        playMeow();
        triggerPanopticonCatEye();
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
        globalThis.openModal('signal');
    }
    else if(cmd === 'arcade' || cmd === 'play' || cmd === 'game') {
        pushTerminalLog("> BOOTING EMULATOR...");
        globalThis.openModal('arcade');
    }
    else if(cmd === 'lexicon') {
        printLexicon();
    }
    // THE NEW MULTI-STAGE CIPHER COMMAND
    else if(cmd === 'cipher') {
        pushTerminalLog("> INITIATING VIGENÈRE DECRYPTION PROTOCOL...");
        playSound(sfx.loading);
        setTimeout(() => {
            pushTerminalLog("> CIPHERTEXT: 'xef bwq, oql iht'");
            pushTerminalLog("> AWAITING DECRYPTION KEY...");
            pushTerminalLog("> (HINT: 'Dresden ..., Aleppo ..., ... Gigas')");
            cipherStage = 1;
        }, 2000);
    }

// --- THE SECRET BACKDOOR ---
    else if(cmd === 'express') {
        pushTerminalLog("> EXPRESS OVERRIDE ACCEPTED. BYPASSING SECURITY PROTOCOLS...");
        
        // If the terminal is currently open, we should probably close it so they can see the event!
        document.getElementById('terminal-container').classList.remove('active');
        document.getElementById('term-input').blur();
        
        // Fire the singularity event directly
        triggerSingularity();
    }
    else {
    pushTerminalLog(`Unknown command: ${cmd}`);
    playSound(sfx.unknown); // <-- PLAYS YOUR NEW SOUND
    }
}

function triggerScatter() {
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
    const id = incrementExtraPizzas();
    const newPizza = document.createElement('div'); 
    newPizza.className = 'artifact'; 
    newPizza.id = 'art-pizza-clone-' + id;
    newPizza.style.top = '-100px'; 
    newPizza.style.left = (Math.random() * 80 + 10) + '%'; 
    newPizza.style.zIndex = '10001';
    newPizza.style.transition = 'transform 0.1s';
    newPizza.innerHTML = `<svg viewBox="0 0 100 100"><path d="M50 10 L85 85 L15 85 Z" fill="none"/><circle cx="50" cy="40" r="4" fill="none"/><circle cx="65" cy="65" r="4" fill="none"/><circle cx="35" cy="65" r="4" fill="none"/></svg>`;
    document.body.appendChild(newPizza);
    setTimeout(() => { newPizza.style.transition = 'top 0.5s ease-out, left 0.5s ease-out'; newPizza.style.top = (Math.random() * 60 + 10) + '%'; }, 50);
    setTimeout(() => { newPizza.style.transition = 'transform 0.1s'; }, 600); 
    playSound(sfx.collectible);
}
// --- TERMINAL INTERACTION LOGIC ---
terminalContainer = document.getElementById('terminal-container');


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
        termInput.focus({ preventScroll: true });
        if (!perf.isIOS) window.scrollTo(0, 0);
    }, 420);
});

// Close terminal when clicking anywhere else on the screen
window.addEventListener('click', (e) => {
    // FIX: If the terminal was opened less than 150 milliseconds ago, ignore this click!
    if (Date.now() - lastTerminalOpenTime < 150) return;

    if(!e.target.closest('#terminal-container') && terminalContainer.classList.contains('active')) {
        terminalContainer.classList.remove('active');
        termInput.blur();
    }
});

let tabSpamCount = 0;
let tabSpamTimer;

// --- MASTER KEYBOARD CONTROLLER ---
window.addEventListener('keydown', (e) => {
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
        termInput.focus({ preventScroll: true });
        window.scrollTo(0, 0); // Slams the camera back to the top instantly
    }, 420);        }
    }
    
   // 2. Pressing TAB toggles the terminal open/closed
    if (e.key === 'Tab') {
        e.preventDefault();
        
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
                termInput.focus({ preventScroll: true });
                window.scrollTo(0, 0); // Slams the camera back to the top instantly
            }, 420);        
        }
    }

   // 3. Pressing the TILDE (`) key triggers the Maya Screen (Boss Key)
    if (e.key === '`' || e.key === '~') {
        e.preventDefault(); 
        globalThis.gardenHooks.toggleBossKey(); // Fires the existing function on line 363
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
            globalThis.gardenHooks.toggleMode(); // Fires your existing corruption toggle function
        }
    }
    
});


export function initTerminal() {
    initLateNightLogs();
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
