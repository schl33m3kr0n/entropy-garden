/** Derive session profile labels from metrics (pure — used by tests + behavioral-analysis). */
export function deriveProfileLabels(metrics, mins = 1) {
    const labels = [];

    if (metrics.rerolls >= 4) labels.push('entropy-addict');
    else if (metrics.rerolls >= 2) labels.push('timeline-tinkerer');

    if (metrics.corruptEngagements >= 2) labels.push('chaos-seeker');
    else if (metrics.corruptEngagements === 1) labels.push('chaos-curious');

    const modalTotal = Object.values(metrics.modalOpens || {}).reduce((a, b) => a + b, 0);
    if (modalTotal >= 5) labels.push('archivist');
    if (metrics.terminalCommands >= 6) labels.push('operator');
    if (metrics.terminalOpens >= 3 && metrics.terminalCommands < 2) labels.push('peeker');

    if (metrics.idleDissociations >= 2) labels.push('dissociator');
    if (metrics.pointerBursts >= 8 && mins <= 12) labels.push('restless-cursor');
    if (metrics.pointerBursts <= 2 && mins >= 5) labels.push('statue');

    if (metrics.godModeToggles >= 1) labels.push('override-curious');
    if (metrics.slotFails >= 2) labels.push('vault-guesser');
    if (metrics.dockingCycles >= 6) labels.push('bay-tinkerer');

    if (metrics.pongSessions >= 1) labels.push('pong-player');
    if (metrics.cardsRounds >= 2) labels.push('cards-dealer');
    if (metrics.trophyUnlocks >= 2) labels.push('trophy-hunter');
    if (metrics.cipherStages >= 1) labels.push('cipher-solver');
    if (metrics.scatterBreaches >= 1) labels.push('scatter-agent');
    if (metrics.pizzaDeploys >= 1) labels.push('pizza-dealer');
    if (metrics.playlistToggles >= 5) labels.push('playlist-fidget');
    if (metrics.tabReturns >= 3) labels.push('tab-ghost');

    if (!labels.length) labels.push('baseline-observer');
    return labels;
}

/** Map profile labels → panopticonTriggerComments behavior keys (priority order). */
export const BEHAVIOR_LABEL_TRIGGERS = {
    'entropy-addict': 'behaviorEntropy',
    'timeline-tinkerer': 'behaviorReroll',
    'chaos-seeker': 'behaviorChaos',
    'chaos-curious': 'behaviorChaos',
    archivist: 'behaviorArchivist',
    operator: 'behaviorOperator',
    peeker: 'behaviorPeeker',
    dissociator: 'behaviorIdle',
    'restless-cursor': 'behaviorWanderer',
    statue: 'behaviorStatue',
    'override-curious': 'behaviorOverride',
    'vault-guesser': 'behaviorVault',
    'bay-tinkerer': 'behaviorBay',
    'pong-player': 'behaviorPong',
    'cards-dealer': 'behaviorCards',
    'trophy-hunter': 'behaviorTrophy',
    'cipher-solver': 'behaviorCipher',
    'scatter-agent': 'behaviorScatter',
    'pizza-dealer': 'behaviorPizza',
    'playlist-fidget': 'behaviorPlaylist',
    'tab-ghost': 'behaviorTabGhost',
};

/**
 * Prefer the most specific non-baseline label for idle / periodic commentary.
 * @param {string[]} labels
 * @returns {string|null} trigger id
 */
export function resolveBehaviorTrigger(labels = []) {
    for (const label of labels) {
        if (label === 'baseline-observer') continue;
        const trigger = BEHAVIOR_LABEL_TRIGGERS[label];
        if (trigger) return trigger;
    }
    return null;
}
