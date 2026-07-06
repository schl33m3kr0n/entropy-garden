import { registerHook } from '../core/hooks.js';
import { terminalLoader } from '../loaders/terminal.js';

const terminalQueue = [];

export function loadTerminal() {
    return terminalLoader.load().then((mod) => {
        mod.initTerminal();
        registerHook('toggleTerminal', mod.toggleTerminal);
        terminalQueue.splice(0).forEach((entry) => {
            if (entry && typeof entry === 'object' && 'msg' in entry) {
                mod.pushTerminalLog(entry.msg, entry.options);
            } else {
                mod.pushTerminalLog(entry);
            }
        });
        return mod;
    });
}

export function rebuildTerminalLogPool() {
    if (terminalLoader.loaded?.rebuildTerminalLogPool) {
        terminalLoader.loaded.rebuildTerminalLogPool();
    }
}

export function pushTerminalLog(msg, options) {
    if (terminalLoader.loaded) {
        terminalLoader.loaded.pushTerminalLog(msg, options);
    } else {
        terminalQueue.push({ msg, options });
        loadTerminal();
    }
}

globalThis.pushTerminalLog = pushTerminalLog;

export function getTerminalContainer() {
    return terminalLoader.loaded?.terminalContainer ?? document.getElementById('terminal-container');
}

export function getTermInput() {
    return terminalLoader.loaded?.termInput ?? document.getElementById('term-input');
}

/** Open terminal UI via DOM (works before terminal.js finishes loading). */
export function revealTerminalShell() {
    if (!document.body.classList.contains('garden-ready')) return false;
    const term = document.getElementById('terminal-container');
    if (!term) return false;

    const wasOpen = term.classList.contains('active');

    const bootReveal = globalThis.EntropyIosTerminalBoot?.revealTerminalShell;
    if (typeof bootReveal === 'function') {
        bootReveal();
    } else {
        const input = document.getElementById('term-input');
        term.removeAttribute('hidden');
        term.classList.add('fab-ready', 'reveal-in', 'active');
        if (input) {
            input.tabIndex = 0;
            setTimeout(() => {
                try {
                    input.focus({ preventScroll: true });
                } catch {
                    input.focus();
                }
            }, 80);
        }
    }

    if (!wasOpen && globalThis.EntropyTerminalSfx?.open) {
        globalThis.EntropyTerminalSfx.open();
    }
    return true;
}

export function openTerminal() {
    const shellOpen = revealTerminalShell();
    return loadTerminal()
        .then((mod) => {
            if (!shellOpen) mod.focusTerminal?.();
            else mod.focusTerminal?.();
            return mod;
        })
        .catch((err) => {
            console.error('[Entropy Garden] terminal module failed to load', err);
            revealTerminalShell();
            throw err;
        });
}

registerHook('openTerminal', () => openTerminal());
