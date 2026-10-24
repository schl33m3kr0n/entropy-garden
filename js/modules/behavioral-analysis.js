/**
 * Session behavioral analysis — local counters only, no localStorage / no external analytics.
 * Surfaces diegetic panopticon + terminal observations.
 */
import { gardenHasStarted } from '../core/state.js';
import { resetPanopticonIdleCommentTimer } from '../core/shared.js';
import { deriveProfileLabels, resolveBehaviorTrigger } from './behavioral-labels.js';

export { deriveProfileLabels, resolveBehaviorTrigger, BEHAVIOR_LABEL_TRIGGERS } from './behavioral-labels.js';

const ANALYSIS_INTERVAL_MS = 240_000;
const POINTER_SAMPLE_MS = 4000;

const metrics = {
    sessionStart: 0,
    rerolls: 0,
    corruptEngagements: 0,
    safeRestores: 0,
    modalOpens: {},
    terminalOpens: 0,
    terminalCommands: 0,
    godModeToggles: 0,
    singularityStarts: 0,
    idleDissociations: 0,
    tabReturns: 0,
    playlistToggles: 0,
    dockingCycles: 0,
    slotFails: 0,
    pointerBursts: 0,
    keypresses: 0,
    pongSessions: 0,
    konamiCompletes: 0,
    cardsRounds: 0,
    trophyUnlocks: 0,
    cipherStages: 0,
    scatterBreaches: 0,
    pizzaDeploys: 0,
};

const milestones = new Set();
let lastPointerSampleAt = 0;
let pointerMovesSinceSample = 0;
let analysisTimer = null;
let fireComment = null;
let pushLog = null;

function sessionMinutes() {
    if (!metrics.sessionStart) return 0;
    return Math.max(1, Math.round((Date.now() - metrics.sessionStart) / 60_000));
}

function topModal() {
    let best = '';
    let n = 0;
    for (const [id, count] of Object.entries(metrics.modalOpens)) {
        if (count > n) {
            n = count;
            best = id;
        }
    }
    return best ? { id: best, count: n } : null;
}

function deriveLabels() {
    return deriveProfileLabels(metrics, sessionMinutes());
}

function emitInsight(triggerId, options = {}, attempt = 0) {
    if (!gardenHasStarted || !fireComment) return;
    if (milestones.has(triggerId) && !options.force) return;

    const shown = fireComment(triggerId, {
        force: true,
        ttlMs: options.ttlMs,
    });
    if (!shown) {
        if (attempt < 4) {
            setTimeout(() => emitInsight(triggerId, options, attempt + 1), 3200);
        }
        return;
    }

    resetPanopticonIdleCommentTimer();
    milestones.add(triggerId);
}

function emitModalObsession(modalId) {
    const map = {
        about: 'behaviorModalAbout',
        stats: 'behaviorModalStats',
        projects: 'behaviorModalProjects',
        signal: 'behaviorModalSignal',
        vault: 'behaviorModalVault',
        cards: 'behaviorModalCards',
        trophies: 'behaviorModalTrophies',
        poems: 'behaviorModalPoems',
    };
    const trigger = map[modalId];
    if (trigger) emitInsight(trigger);
}

function checkMilestones() {
    if (metrics.rerolls >= 3) emitInsight('behaviorReroll');
    if (metrics.corruptEngagements >= 1) emitInsight('behaviorChaos');
    if (metrics.idleDissociations >= 1) emitInsight('behaviorIdle');
    if (metrics.terminalCommands >= 5) emitInsight('behaviorOperator');
    if (metrics.terminalOpens >= 3 && metrics.terminalCommands < 2) emitInsight('behaviorPeeker');
    if (metrics.godModeToggles >= 1) emitInsight('behaviorOverride');
    if (metrics.slotFails >= 2) emitInsight('behaviorVault');
    if (metrics.dockingCycles >= 6) emitInsight('behaviorBay');
    if (metrics.pongSessions >= 1) emitInsight('behaviorPong');
    if (metrics.cardsRounds >= 2) emitInsight('behaviorCards');
    if (metrics.trophyUnlocks >= 2) emitInsight('behaviorTrophy');
    if (metrics.cipherStages >= 1) emitInsight('behaviorCipher');
    if (metrics.scatterBreaches >= 1) emitInsight('behaviorScatter');
    if (metrics.pizzaDeploys >= 1) emitInsight('behaviorPizza');
    if (metrics.playlistToggles >= 5) emitInsight('behaviorPlaylist');
    if (metrics.tabReturns >= 3) emitInsight('behaviorTabGhost');

    const modalTotal = Object.values(metrics.modalOpens).reduce((a, b) => a + b, 0);
    if (modalTotal >= 4) emitInsight('behaviorArchivist');

    const obsessed = topModal();
    if (obsessed && obsessed.count >= 3) emitModalObsession(obsessed.id);

    if (sessionMinutes() >= 4 && metrics.pointerBursts >= 4) {
        emitInsight('behaviorWanderer');
    }
}

export function recordBehavior(event, detail = {}) {
    if (!gardenHasStarted && event !== 'session_start') return;

    switch (event) {
        case 'reroll':
            metrics.rerolls++;
            break;
        case 'corrupt_on':
            metrics.corruptEngagements++;
            break;
        case 'corrupt_off':
            metrics.safeRestores++;
            break;
        case 'modal_open':
            if (detail.id) {
                metrics.modalOpens[detail.id] = (metrics.modalOpens[detail.id] || 0) + 1;
            }
            break;
        case 'terminal_open':
            metrics.terminalOpens++;
            break;
        case 'terminal_command':
            metrics.terminalCommands++;
            break;
        case 'god_mode':
            metrics.godModeToggles++;
            break;
        case 'singularity':
            metrics.singularityStarts++;
            break;
        case 'idle_dissociation':
            metrics.idleDissociations++;
            break;
        case 'tab_return':
            metrics.tabReturns++;
            break;
        case 'playlist_toggle':
            metrics.playlistToggles++;
            break;
        case 'docking_cycle':
            metrics.dockingCycles++;
            break;
        case 'slot_fail':
            metrics.slotFails++;
            break;
        case 'pong_session':
            metrics.pongSessions++;
            break;
        case 'konami_complete':
            metrics.konamiCompletes++;
            break;
        case 'cards_round':
            metrics.cardsRounds++;
            break;
        case 'trophy_unlock':
            metrics.trophyUnlocks++;
            break;
        case 'cipher_stage':
            metrics.cipherStages++;
            break;
        case 'scatter_breach':
            metrics.scatterBreaches++;
            break;
        case 'pizza_deploy':
            metrics.pizzaDeploys++;
            break;
        default:
            break;
    }

    checkMilestones();
}

export function getBehaviorSnapshot() {
    const labels = deriveLabels();
    const modalTop = topModal();
    return {
        ...metrics,
        sessionMinutes: sessionMinutes(),
        labels,
        modalTop,
        modalTotal: Object.values(metrics.modalOpens).reduce((a, b) => a + b, 0),
    };
}

export function printBehaviorReport() {
    if (!pushLog) return;
    const snap = getBehaviorSnapshot();
    pushLog('> --- BEHAVIORAL ANALYSIS (SESSION) ---');
    pushLog(`> OBSERVATION WINDOW: ${snap.sessionMinutes} MIN`);
    pushLog(`> PROFILE: ${snap.labels.join(' · ').toUpperCase()}`);
    pushLog(`> REROLLS: ${snap.rerolls} | CHAOS TOGGLES: ${snap.corruptEngagements}`);
    pushLog(`> TERMINAL: ${snap.terminalOpens} opens / ${snap.terminalCommands} commands`);
    if (snap.modalTop) {
        pushLog(`> TOP MODAL: ${snap.modalTop.id.toUpperCase()} (${snap.modalTop.count}x)`);
    }
    pushLog(`> IDLE VOIDS: ${snap.idleDissociations} | POINTER BURSTS: ${snap.pointerBursts}`);
    pushLog(`> GAMES: pong ${snap.pongSessions} | konami ${snap.konamiCompletes} | cards ${snap.cardsRounds}`);
    pushLog(`> TROPHIES: ${snap.trophyUnlocks} | CIPHER STAGES: ${snap.cipherStages} | SCATTER: ${snap.scatterBreaches} | PIZZA: ${snap.pizzaDeploys}`);
    pushLog('> NOTE: analysis is local to this session. the eye forgets nothing.');
}

function runPeriodicAnalysis() {
    if (!gardenHasStarted) return;
    const snap = getBehaviorSnapshot();
    if (snap.sessionMinutes < 4) return;

    if (snap.rerolls >= 5) {
        emitInsight('behaviorEntropy');
        return;
    }

    const labeled = resolveBehaviorTrigger(snap.labels);
    if (labeled) {
        emitInsight(labeled);
        return;
    }

    if (snap.modalTop && snap.modalTop.count >= 3) {
        emitModalObsession(snap.modalTop.id);
        return;
    }

    emitInsight('behaviorPeriodic');
}

/**
 * Trigger id for idle panopticon bias, or null if profile is still bland.
 * @returns {string|null}
 */
export function getBehaviorIdleTrigger() {
    if (!gardenHasStarted || !metrics.sessionStart) return null;
    if (sessionMinutes() < 2) return null;
    return resolveBehaviorTrigger(deriveLabels());
}

function onPointerActivity() {
    const now = Date.now();
    pointerMovesSinceSample++;
    if (now - lastPointerSampleAt < POINTER_SAMPLE_MS) return;
    if (pointerMovesSinceSample >= 18) metrics.pointerBursts++;
    pointerMovesSinceSample = 0;
    lastPointerSampleAt = now;
}

function bindPassiveListeners() {
    window.addEventListener('pointermove', onPointerActivity, { passive: true });
    window.addEventListener('keydown', () => {
        if (!gardenHasStarted) return;
        metrics.keypresses++;
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && gardenHasStarted) {
            recordBehavior('tab_return');
        }
    });
}

/**
 * @param {{ firePanopticonComment?: Function, pushTerminalLog?: Function }} hooks
 */
export function initBehavioralAnalysis(hooks = {}) {
    fireComment = hooks.firePanopticonComment ?? null;
    pushLog = hooks.pushTerminalLog ?? null;
    metrics.sessionStart = Date.now();

    bindPassiveListeners();

    if (analysisTimer) clearInterval(analysisTimer);
    analysisTimer = setInterval(runPeriodicAnalysis, ANALYSIS_INTERVAL_MS);
}
