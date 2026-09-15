/**
 * Safari iOS pull-to-refresh guards.
 * Keep the predicate pure so it can be unit-tested without a touch device.
 */

const TOP_EPSILON_PX = 1;

/** True when a downward pull at the top of a scroller would trigger Safari PTR. */
export function shouldBlockPullToRefresh({
    scrollTop = 0,
    deltaY = 0,
    touchCount = 1,
} = {}) {
    if (touchCount !== 1) return false;
    if (!(deltaY > 0)) return false;
    return scrollTop <= TOP_EPSILON_PX;
}

function isScrollableY(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') return false;
    return el.scrollHeight > el.clientHeight + TOP_EPSILON_PX;
}

/** Nearest vertical scroller for a touch target, else the iOS rail shell / viewport. */
export function resolvePullRefreshScroller(target, shell) {
    let node = target instanceof Element ? target : null;
    while (node && node !== document.body && node !== document.documentElement) {
        if (isScrollableY(node)) return node;
        node = node.parentElement;
    }
    if (shell) return shell;
    return document.scrollingElement || document.documentElement;
}

/**
 * Block Safari's pull-to-refresh while still allowing normal pan-up scrolling.
 * Uses capture + non-passive touchmove so preventDefault sticks on iOS.
 */
export function installPullToRefreshBlocker(getShell = () => document.getElementById('ios-scroll-shell')) {
    let startY = 0;
    let activeTouchId = null;

    const onTouchStart = (e) => {
        if (!e.touches?.length) return;
        const touch = e.touches[0];
        activeTouchId = touch.identifier;
        startY = touch.clientY;
    };

    const onTouchEnd = () => {
        activeTouchId = null;
    };

    const onTouchMove = (e) => {
        if (!e.touches?.length || e.touches.length !== 1) return;
        const touch = e.touches[0];
        if (activeTouchId != null && touch.identifier !== activeTouchId) return;

        const scroller = resolvePullRefreshScroller(e.target, getShell());
        const deltaY = touch.clientY - startY;
        if (!shouldBlockPullToRefresh({
            scrollTop: scroller?.scrollTop ?? 0,
            deltaY,
            touchCount: e.touches.length,
        })) {
            return;
        }

        if (e.cancelable) e.preventDefault();
    };

    const optsStart = { capture: true, passive: true };
    const optsMove = { capture: true, passive: false };
    const optsEnd = { capture: true, passive: true };

    document.addEventListener('touchstart', onTouchStart, optsStart);
    document.addEventListener('touchmove', onTouchMove, optsMove);
    document.addEventListener('touchend', onTouchEnd, optsEnd);
    document.addEventListener('touchcancel', onTouchEnd, optsEnd);

    return () => {
        document.removeEventListener('touchstart', onTouchStart, optsStart);
        document.removeEventListener('touchmove', onTouchMove, optsMove);
        document.removeEventListener('touchend', onTouchEnd, optsEnd);
        document.removeEventListener('touchcancel', onTouchEnd, optsEnd);
    };
}
