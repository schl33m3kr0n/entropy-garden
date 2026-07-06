import { describe, expect, it } from 'vitest';
import { deriveProfileLabels } from '../../js/modules/behavioral-labels.js';

const base = () => ({
    rerolls: 0,
    corruptEngagements: 0,
    modalOpens: {},
    terminalCommands: 0,
    terminalOpens: 0,
    idleDissociations: 0,
    pointerBursts: 0,
    godModeToggles: 0,
    slotFails: 0,
    dockingCycles: 0,
});

describe('deriveProfileLabels', () => {
    it('defaults to baseline-observer', () => {
        expect(deriveProfileLabels(base())).toEqual(['baseline-observer']);
    });

    it('labels entropy-addict after many rerolls', () => {
        const labels = deriveProfileLabels({ ...base(), rerolls: 4 });
        expect(labels).toContain('entropy-addict');
    });

    it('labels chaos-seeker after repeated corruption', () => {
        const labels = deriveProfileLabels({ ...base(), corruptEngagements: 2 });
        expect(labels).toContain('chaos-seeker');
    });

    it('labels archivist when many modals opened', () => {
        const labels = deriveProfileLabels({
            ...base(),
            modalOpens: { about: 3, stats: 3 },
        });
        expect(labels).toContain('archivist');
    });

    it('labels restless-cursor with high pointer bursts in short session', () => {
        const labels = deriveProfileLabels({ ...base(), pointerBursts: 8 }, 10);
        expect(labels).toContain('restless-cursor');
    });

    it('labels statue with low pointer bursts over long session', () => {
        const labels = deriveProfileLabels({ ...base(), pointerBursts: 2 }, 6);
        expect(labels).toContain('statue');
    });
});
