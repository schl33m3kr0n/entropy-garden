import { isIOS, shouldRegisterServiceWorker } from './environment.js';

let registered = false;

export function registerServiceWorkerAfterInit() {
    if (registered || !('serviceWorker' in navigator)) return;
    registered = true;

    if (!shouldRegisterServiceWorker()) {
        navigator.serviceWorker.getRegistrations()
            .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
            .catch(() => {});
        return;
    }

    // FORCE CACHE CLEAR FOR STUCK CLIENTS
    caches.keys().then(keys => {
        Promise.all(keys.map(key => caches.delete(key)));
    });

    navigator.serviceWorker
        .register('./sw.js', { updateViaCache: 'none' })
        .then((reg) => {
            // Install updates in the background; avoid skipWaiting + reload mid-session
            // (that was interrupting boot audio and pong init on the custom domain).
            reg.update().catch(() => {});
        })
        .catch(() => {});
}
