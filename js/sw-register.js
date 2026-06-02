let registered = false;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function registerServiceWorkerAfterInit() {
    if (registered || !('serviceWorker' in navigator)) return;

    const { protocol, hostname } = window.location;
    const local = hostname === 'localhost' || hostname === '127.0.0.1';
    if (protocol !== 'https:' && !local) return;

    registered = true;

    // Local python/http.server: skip SW so JS/CSS edits show on normal refresh.
    if (local) return;

    // iOS Safari: stale SW asset fallbacks and mid-session updates cause reload glitches.
    if (isIOS) {
        navigator.serviceWorker.getRegistrations()
            .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
            .catch(() => {});
        return;
    }

    navigator.serviceWorker.register('./sw.js').catch(() => {});
}
