/**
 * Easter egg trophy case — persists unlocks in localStorage, works on file:// and module paths.
 */
(function (global) {
    const STORAGE_KEY = 'entropy-garden-trophies-v1';
    const TROPHY_ICON_URL = 'assets/icons/trophy.svg';

    const TROPHY_DEFS = [
        { id: 'panopticon_pong', title: 'Socket League', desc: 'The eye learned to rally.' },
        { id: 'konami_god', title: 'Pondery Argent', desc: 'Override accepted. Title seized.' },
        { id: 'maya_crash', title: 'Topology Anxiety', desc: 'Desktop.exe has stopped.' },
        { id: 'cipher_vault', title: 'Korzamuron Key', desc: 'Docking bay decryption sequence.' },
        { id: 'singularity_ritual', title: 'Event Horizon', desc: 'Fuel, source, hoard — ritual complete.' },
        { id: 'scatter_breach', title: 'Containment Breach', desc: 'Icons escaped the desktop.' },
        { id: 'ghost_composer', title: 'Void Editor', desc: 'Compose in the margins.' },
        { id: 'pizza_protocol', title: 'Fuel Deployed', desc: 'Caloric redundancy achieved.' },
        { id: 'entropic_reroll', title: 'Entropic Reroll', desc: 'Identity string re-shuffled.' },
        { id: 'corrupted_bloom', title: 'Corrupted Bloom', desc: 'Safe mode abandoned.' },
        { id: 'arcade_clear', title: 'Cabinet Cleared', desc: 'All sequences accepted.' },
        { id: 'feline_freq', title: 'Meow!', desc: 'Panopticon narrowed to cat eye.' },
        { id: 'genesis_gate', title: 'Genesis Gate', desc: 'Vault iframe opened the prequel.' },
        { id: 'vault_sun', title: 'Solar Uncapped', desc: 'The sun played in the vault.' },
    ];

    const defById = Object.fromEntries(TROPHY_DEFS.map((d) => [d.id, d]));
    let unlocked = new Set();
    let loaded = false;
    let flashEl = null;

    function load() {
        if (loaded) return;
        loaded = true;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
                unlocked = new Set(arr.filter((id) => defById[id]));
            }
        } catch {
            unlocked = new Set();
        }
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
        } catch {
            /* private mode / quota */
        }
    }

    function trophyIconMarkup(className) {
        return `<img class="${className}" src="${TROPHY_ICON_URL}" alt="" width="32" height="32" decoding="async" aria-hidden="true">`;
    }

    function notifyUnlock(def) {
        if (typeof global.pushTerminalLog === 'function') {
            global.pushTerminalLog(`> TROPHY: ${def.title.toUpperCase()}`);
        }
    }

    function playUnlockFlash() {
        if (flashEl) {
            flashEl.remove();
            flashEl = null;
        }
        const el = document.createElement('div');
        el.className = 'trophy-unlock-flash';
        el.innerHTML = `<img class="trophy-unlock-flash-icon" src="${TROPHY_ICON_URL}" alt="" width="56" height="56" decoding="async" aria-hidden="true">`;
        document.body.appendChild(el);
        flashEl = el;

        const done = () => {
            el.remove();
            if (flashEl === el) flashEl = null;
        };
        el.addEventListener('animationend', done, { once: true });
        setTimeout(done, 1600);
    }

    function unlockTrophy(id) {
        if (!defById[id]) return false;
        load();
        if (unlocked.has(id)) return false;
        unlocked.add(id);
        save();
        const def = defById[id];
        notifyUnlock(def);
        playUnlockFlash();
        return true;
    }

    function renderTrophyCase() {
        const grid = document.getElementById('trophy-grid');
        if (!grid) return;
        load();
        grid.innerHTML = '';
        TROPHY_DEFS.forEach((def) => {
            const on = unlocked.has(def.id);
            const card = document.createElement('div');
            card.className = `trophy-card${on ? ' unlocked' : ' locked'}`;
            const visual = on
                ? trophyIconMarkup('trophy-icon')
                : '<span class="trophy-mystery" aria-label="Locked trophy">?</span>';
            const meta = on
                ? `<span class="trophy-title">${def.title}</span><span class="trophy-desc">${def.desc}</span>`
                : '';
            card.innerHTML = `
                <div class="trophy-visual">${visual}</div>
                <div class="trophy-meta">${meta}</div>`;
            grid.appendChild(card);
        });
        const countEl = document.getElementById('trophy-count');
        if (countEl) {
            countEl.textContent = `${unlocked.size} / ${TROPHY_DEFS.length}`;
        }
    }

    function getUnlockedCount() {
        load();
        return unlocked.size;
    }

    function resetTrophies() {
        load();
        unlocked = new Set();
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            /* private mode */
        }
        renderTrophyCase();
        return true;
    }

    global.EntropyTrophies = {
        unlockTrophy,
        renderTrophyCase,
        getUnlockedCount,
        resetTrophies,
        list: TROPHY_DEFS,
    };

    global.unlockTrophy = unlockTrophy;
    global.resetTrophies = resetTrophies;
    load();
})(typeof globalThis !== 'undefined' ? globalThis : window);
