import { describe, expect, it } from 'vitest';
import { shouldBlockPullToRefresh } from '../../js/ios/pull-to-refresh.js';

describe('shouldBlockPullToRefresh', () => {
    it('blocks downward pull at the top of a scroller', () => {
        expect(shouldBlockPullToRefresh({ scrollTop: 0, deltaY: 24, touchCount: 1 })).toBe(true);
    });

    it('allows a small epsilon at the top (iOS rubber-band noise)', () => {
        expect(shouldBlockPullToRefresh({ scrollTop: 1, deltaY: 12, touchCount: 1 })).toBe(true);
        expect(shouldBlockPullToRefresh({ scrollTop: 2, deltaY: 12, touchCount: 1 })).toBe(false);
    });

    it('does not block upward pans (scroll content down)', () => {
        expect(shouldBlockPullToRefresh({ scrollTop: 0, deltaY: -18, touchCount: 1 })).toBe(false);
    });

    it('does not block when the scroller is away from the top', () => {
        expect(shouldBlockPullToRefresh({ scrollTop: 80, deltaY: 40, touchCount: 1 })).toBe(false);
    });

    it('ignores multi-touch gestures', () => {
        expect(shouldBlockPullToRefresh({ scrollTop: 0, deltaY: 30, touchCount: 2 })).toBe(false);
    });
});
