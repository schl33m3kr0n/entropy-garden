/**
 * Contextual panopticon whispers — triggered by navigation and interaction.
 * Reuses #panopticon-comment bubble from shared.js.
 */
import {
    showPanopticonComment,
    hidePanopticonComment,
    perf,
} from '../core/shared.js';
import { isCorrupted, gardenHasStarted } from '../core/state.js';

const HOVER_DEBOUNCE_MS = 900;
const TYPE_DEBOUNCE_MS = 2400;
const MIN_REPEAT_GAP_MS = 48000;
const GLOBAL_COOLDOWN_MS = 2600;

const recentByTrigger = new Map();
let lastShownText = '';
let lastShownAt = 0;
let lastFireAt = 0;

function pickFromPool(safe = [], gritty = []) {
    const useGritty = isCorrupted && gritty.length;
    const primary = useGritty ? gritty : safe;
    const alt = useGritty ? safe : gritty;
    if (!primary.length && !alt.length) return null;
    if (!primary.length) {
        return alt[Math.floor(Math.random() * alt.length)];
    }
    if (!alt.length || Math.random() < 0.82) {
        return primary[Math.floor(Math.random() * primary.length)];
    }
    return alt[Math.floor(Math.random() * alt.length)];
}

function pickComment(triggerId) {
    const entry = globalThis.lorePools?.panopticonTriggerComments?.[triggerId];
    if (!entry) return null;
    return pickFromPool(entry.safe, entry.gritty);
}

/**
 * Show a contextual panopticon comment for a trigger id.
 * @param {string} triggerId
 * @param {{ text?: string, ttlMs?: number, force?: boolean }} [options]
 */
export function firePanopticonComment(triggerId, options = {}) {
    if (!gardenHasStarted || !triggerId) return false;

    const now = Date.now();
    if (!options.force && now - lastFireAt < GLOBAL_COOLDOWN_MS) return false;

    const text = options.text ?? pickComment(triggerId);
    if (!text) return false;

    const recent = recentByTrigger.get(triggerId) || [];
    if (!options.force && recent.includes(text)) return false;
    if (!options.force && text === lastShownText && now - lastShownAt < MIN_REPEAT_GAP_MS) return false;

    const ttlMs = options.ttlMs ?? (perf.prefersReducedMotion ? 3600 : 4200);
    showPanopticonComment(text, ttlMs);

    lastFireAt = now;
    lastShownText = text;
    lastShownAt = now;
    recentByTrigger.set(triggerId, [...recent.slice(-5), text]);
    return true;
}

function bindHoverComment(el, triggerId, { dismissOnLeave = false, beforeFire = null } = {}) {
    if (!el || el.dataset.panCommentBound) return;
    el.dataset.panCommentBound = '1';

    let enterTimer = null;
    let leaveTimer = null;

    const onEnter = () => {
        clearTimeout(leaveTimer);
        clearTimeout(enterTimer);
        enterTimer = setTimeout(() => {
            if (beforeFire && !beforeFire()) return;
            firePanopticonComment(triggerId);
        }, HOVER_DEBOUNCE_MS);
    };

    const onLeave = () => {
        clearTimeout(enterTimer);
        if (dismissOnLeave) {
            leaveTimer = setTimeout(() => hidePanopticonComment(), 140);
        }
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('focusin', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('focusout', onLeave);
}

function bindModalHoverComments() {
    for (const modal of document.querySelectorAll('.modal')) {
        const id = modal.id?.replace(/^modal-/, '');
        if (!id) continue;
        const triggerId = `modal${id.charAt(0).toUpperCase()}${id.slice(1)}`;
        if (!globalThis.lorePools?.panopticonTriggerComments?.[triggerId]) continue;
        bindHoverComment(modal.querySelector('.modal-content') || modal, triggerId);
    }
}

function bindTerminalTypingComment() {
    const input = document.getElementById('term-input');
    if (!input || input.dataset.panCommentBound) return;
    input.dataset.panCommentBound = '1';

    let typeTimer = null;
    input.addEventListener('input', () => {
        if (!input.closest('#terminal-container')?.classList.contains('active')) return;
        clearTimeout(typeTimer);
        typeTimer = setTimeout(() => firePanopticonComment('terminalType'), TYPE_DEBOUNCE_MS);
    });
}

/** Wire hover/focus listeners and passive hooks. Call once after garden-ready. */
export function initPanopticonComments() {
    bindHoverComment(document.getElementById('mode-btn'), 'modeHover', {
        dismissOnLeave: true,
        beforeFire: () => !isCorrupted,
    });
    bindHoverComment(document.getElementById('init-btn'), 'initBtnHover');
    bindHoverComment(document.getElementById('hamburger-icon'), 'hamburgerHover');
    bindHoverComment(document.getElementById('docking-bay'), 'dockingHover');
    bindHoverComment(document.getElementById('ios-terminal-toggle'), 'iosTerminalToggle');

    document.querySelectorAll('#sidebar-menu li').forEach((item) => {
        bindHoverComment(item, 'hamburgerHover');
    });

    document.querySelectorAll('.playlist-btn').forEach((btn) => {
        bindHoverComment(btn, 'playlistPlay');
    });

    bindModalHoverComments();
    bindTerminalTypingComment();

    document.getElementById('hamburger-icon')?.addEventListener('click', () => {
        firePanopticonComment('sidebarOpen');
    });
}

/** Modal id from openModal (e.g. identity, arcade). */
export function panopticonCommentForModal(modalId) {
    const key = `modal${modalId.charAt(0).toUpperCase()}${modalId.slice(1)}`;
    firePanopticonComment(key);
}
