/**
 * Cross-module hook registry and optional event bus.
 * Replaces ad-hoc globalThis.gardenHooks assignments.
 */

/** @type {Map<string, Function>} */
const registry = new Map();

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

export function registerHook(name, fn) {
    if (typeof fn !== 'function') {
        throw new TypeError(`registerHook("${String(name)}") expects a function`);
    }
    registry.set(name, fn);
}

export function registerHooks(hooks) {
    for (const [name, fn] of Object.entries(hooks)) {
        registerHook(name, fn);
    }
}

export function getHook(name) {
    return registry.get(name);
}

export function callHook(name, ...args) {
    return registry.get(name)?.(...args);
}

export function on(event, fn) {
    if (typeof fn !== 'function') {
        throw new TypeError(`on("${String(event)}") expects a function`);
    }
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event)?.delete(fn);
}

export function emit(event, detail) {
    for (const fn of listeners.get(event) ?? []) {
        try {
            fn(detail);
        } catch (err) {
            console.error('[garden hooks]', event, err);
        }
    }
}

/**
 * Classic scripts (terminal-boot.js) read globalThis.gardenHooks.
 * ES modules should prefer registerHook / callHook imports.
 */
export function installGardenHooksGlobal() {
    if (globalThis.gardenHooks?.__entropyHookRegistry) {
        return globalThis.gardenHooks;
    }

    const proxy = new Proxy(Object.create(null), {
        get(_target, prop) {
            if (prop === '__entropyHookRegistry') return true;
            return registry.get(prop);
        },
        set(_target, prop, value) {
            if (typeof value === 'function') registry.set(prop, value);
            return true;
        },
        has(_target, prop) {
            return registry.has(prop);
        },
    });

    globalThis.gardenHooks = proxy;
    return proxy;
}

installGardenHooksGlobal();

/**
 * Documented hook names (registry keys):
 * - toggleTerminal, openTerminal
 * - toggleBossKey, handleReroll, toggleMode, resetTimeline, resetIdleTimer
 * - firePanopticonComment, syncPanopticonCodeSequenceComments
 * - recordBehavior, printBehaviorReport, getBehaviorSnapshot
 * - stopGardenLoop, resumeGardenLoop, setCorrupted
 * - konamiBlocksPongArming, isKonamiInProgress, isKonamiActivelyEntering
 * - isPongArmingActive, isPongSessionActive, pongBlocksArrowNav
 * - konamiClaimsKey, cancelPongArming, cancelKonamiArming, resetKonamiSequence
 */
