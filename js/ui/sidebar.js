/** Sidebar navigation — modal open targets (replaces inline onclick). */

const MODAL_TARGETS = {
    identity: 'identity',
    stats: 'stats',
    about: 'about',
    projects: 'projects',
    signal: 'signal',
    vault: 'vault',
    arcade: 'arcade',
    cards: 'cards',
    poems: 'poems',
    trophies: 'trophies',
};

/**
 * @param {(id: string) => void} openModal
 * @param {{ playHoverSound?: boolean }} [options]
 */
export function bindSidebarNavigation(openModal, { playHoverSound = false } = {}) {
    const menu = document.getElementById('sidebar-menu');
    if (!menu || menu.dataset.sidebarBound) return;
    menu.dataset.sidebarBound = '1';

    menu.querySelectorAll('li[data-modal]').forEach((item) => {
        const modalId = item.dataset.modal;
        if (!modalId || !MODAL_TARGETS[modalId]) return;

        item.addEventListener('click', () => openModal(modalId));

        if (playHoverSound) {
            item.addEventListener('mouseenter', () => {
                import('../core/shared.js').then(({ sfx }) => {
                    const hoverClone = sfx.click.cloneNode();
                    hoverClone.volume = 0.4;
                    hoverClone.play().catch(() => {});
                }).catch(() => {});
            });
        }
    });
}
