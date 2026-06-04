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

    navigator.serviceWorker.register('./sw.js').catch(() => {});
}
