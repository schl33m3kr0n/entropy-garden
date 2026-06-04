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

    let reloadOnControllerChange = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloadOnControllerChange) return;
        reloadOnControllerChange = false;
        window.location.reload();
    });

    navigator.serviceWorker
        .register('./sw.js', { updateViaCache: 'none' })
        .then((reg) => {
            const promptReload = (worker) => {
                if (!worker || !navigator.serviceWorker.controller) return;
                reloadOnControllerChange = true;
                worker.postMessage({ type: 'SKIP_WAITING' });
            };

            if (reg.waiting) promptReload(reg.waiting);

            reg.addEventListener('updatefound', () => {
                const worker = reg.installing;
                if (!worker) return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed') promptReload(worker);
                });
            });

            reg.update().catch(() => {});
        })
        .catch(() => {});
}
