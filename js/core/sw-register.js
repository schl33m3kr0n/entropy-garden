import { isIOS, shouldRegisterServiceWorker } from './environment.js';

let registered = false;

export function registerServiceWorkerAfterInit() {
    if (registered || !('serviceWorker' in navigator)) return;
    registered = true;

    if (!shouldRegisterServiceWorker()) {
        if (isIOS) {
            navigator.serviceWorker.getRegistrations()
                .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
                .catch(() => {});
        }
        return;
    }

    navigator.serviceWorker
        .register('./sw.js', { updateViaCache: 'none' })
        .then((reg) => {
            // Install updates in the background; avoid skipWaiting + reload mid-session
            // (that was interrupting boot audio and pong init on the custom domain).
            reg.update().catch(() => {});
        })
        .catch(() => {});
}
