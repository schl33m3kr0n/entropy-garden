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

    if (!labels.length) labels.push('baseline-observer');
    return labels;
}
