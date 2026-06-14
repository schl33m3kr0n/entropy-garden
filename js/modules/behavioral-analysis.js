/**
 * Session behavioral analysis — local counters only, no localStorage / no external analytics.
 * Surfaces diegetic panopticon + terminal observations.
 */
import { gardenHasStarted } from '../core/state.js';
import { resetPanopticonIdleCommentTimer } from '../core/shared.js';

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
    const labels = [];
    const mins = sessionMinutes();

    if (metrics.rerolls >= 4) labels.push('entropy-addict');
    else if (metrics.rerolls >= 2) labels.push('timeline-tinkerer');

    if (metrics.corruptEngagements >= 2) labels.push('chaos-seeker');
    else if (metrics.corruptEngagements === 1) labels.push('chaos-curious');

    const modalTotal = Object.values(metrics.modalOpens).reduce((a, b) => a + b, 0);
    if (modalTotal >= 5) labels.push('archivist');
    if (metrics.terminalCommands >= 6) labels.push('operator');
    if (metrics.terminalOpens >= 3 && metrics.terminalCommands < 2) labels.push('peeker');

    if (metrics.idleDissociations >= 2) labels.push('dissociator');
    if (metrics.pointerBursts >= 8 && mins <= 12) labels.push('restless-cursor');
    if (metrics.pointerBursts <= 2 && mins >= 5) labels.push('statue');

    if (metrics.godModeToggles >= 1) labels.push('override-curious');
    if (metrics.slotFails >= 2) labels.push('vault-guesser');
    if (metrics.dockingCycles >= 6) labels.push('bay-tinkerer');

    if (!labels.length) labels.push('baseline-observer');
    return labels;
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

function checkMilestones() {
    if (metrics.rerolls >= 3) emitInsight('behaviorReroll');
    if (metrics.corruptEngagements >= 1) emitInsight('behaviorChaos');
    if (metrics.idleDissociations >= 1) emitInsight('behaviorIdle');
    if (metrics.terminalCommands >= 5) emitInsight('behaviorOperator');

    const modalTotal = Object.values(metrics.modalOpens).reduce((a, b) => a + b, 0);
    if (modalTotal >= 4) emitInsight('behaviorArchivist');

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
    pushLog('> NOTE: analysis is local to this session. the eye forgets nothing.');
}

function runPeriodicAnalysis() {
    if (!gardenHasStarted) return;
    const snap = getBehaviorSnapshot();
    if (snap.sessionMinutes < 4) return;

    if (snap.rerolls >= 5) emitInsight('behaviorEntropy');
    else if (snap.labels.includes('statue')) emitInsight('behaviorStatue');
    else if (snap.labels.includes('archivist')) emitInsight('behaviorArchivist');
    else emitInsight('behaviorPeriodic');
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
