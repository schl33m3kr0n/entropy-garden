/**
 * Cipher stage-2 hints (terminal + desktop ring). Konami still calls unlock() to refresh.
 */
(function (global) {
    const RING_WORDS = ['WHAT', 'IS', 'ENTROPY?'];
    /** Circle glyph from the matrix charset — same paint path as neighbors. */
    const RING_SEP = '✵';
    const RING_PHRASE = RING_WORDS.join(RING_SEP);
    const TERMINAL_ENTROPY_HINT = '> RING QUERY: WHAT IS ENTROPY?';
    const TERMINAL_PROVIDENCE_HINT = '> THE ARROWS OF TIME WILL LEAD US TO PROVIDENCE.';
    const TERMINAL_HINTS = [TERMINAL_ENTROPY_HINT, TERMINAL_PROVIDENCE_HINT];

    let terminalEntropyShown = false;
    let terminalProvidenceShown = false;

    function isIosChannel() {
        const ua = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const ipadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        return ua || ipadOs || document.body?.classList.contains('ios-ui');
    }

    function isDesktopRingChannel() {
        return !isIosChannel();
    }

    function cipherStage() {
        return global.getCipherStage?.() ?? 0;
    }

    /** Inner/mid rings render before the outer ring finishes revealing. */
    function pickHintWheel(wheels) {
        if (!wheels?.length) return null;
        const idx = wheels.length >= 3 ? 2 : wheels.length >= 2 ? 1 : 0;
        return wheels[idx];
    }

    function buildHintGlyphs(charCount, randomChar) {
        const glyphs = Array.from({ length: charCount }, () => randomChar());
        const start = Math.floor((charCount - RING_PHRASE.length) / 2);
        for (let i = 0; i < RING_PHRASE.length; i++) {
            glyphs[(start + i + charCount) % charCount] = RING_PHRASE[i];
        }
        return glyphs;
    }

    function applyToWheels(wheels, perf, randomChar) {
        if (typeof randomChar !== 'function') return;
        const wheel = pickHintWheel(wheels);
        if (!wheel) return;

        for (const w of wheels) {
            if (w.isHintWheel && w !== wheel) {
                w.isHintWheel = false;
            }
        }

        const ri = wheel.ringIndex;
        wheel.glyphs = buildHintGlyphs(wheel.charCount, randomChar);
        wheel.isHintWheel = true;
        wheel.spinSpeed =
            (ri % 2 === 0 ? 1 : -1)
            * (0.00045 + ri * 0.00008)
            * (perf?.prefersReducedMotion ? 0 : 1);
        wheel.cycleEvery = 1e9;
        wheel.burstSpeed = 0;
        wheel.burstUntil = 0;
    }

    function clearFromWheels(wheels, randomChar, perf) {
        if (!wheels?.length) return;
        const wheel = wheels.find((w) => w.isHintWheel);
        if (!wheel) return;

        const ri = wheel.ringIndex;
        wheel.isHintWheel = false;
        wheel.glyphs = Array.from({ length: wheel.charCount }, randomChar);
        wheel.cycleEvery = (perf?.isMobile ? 14 : 8) + ri * 2;
        wheel.spinSpeed =
            (ri % 2 === 0 ? 1 : -1)
            * (0.00045 + ri * 0.00008)
            * (perf?.prefersReducedMotion ? 0 : 1);
    }

    function shouldShowRingHint() {
        return isDesktopRingChannel() && cipherStage() === 2;
    }

    function refreshRing() {
        global.refreshCipherEntropyRingHint?.();
    }

    function notifyTerminal() {
        if (cipherStage() !== 2) return;

        const log = global.pushTerminalLog;
        if (typeof log !== 'function') return;

        const queue = [];
        if (isIosChannel() && !terminalEntropyShown) {
            queue.push(TERMINAL_ENTROPY_HINT);
            terminalEntropyShown = true;
        }
        if (!isIosChannel() && !terminalProvidenceShown) {
            queue.push(TERMINAL_PROVIDENCE_HINT);
            terminalProvidenceShown = true;
        }
        if (!queue.length) return;

        queue.forEach((msg, i) => {
            setTimeout(() => log(msg), i * 900);
        });
    }

    function syncCipherHints() {
        if (cipherStage() === 2) {
            notifyTerminal();
            refreshRing();
        } else {
            refreshRing();
        }
    }

    function resetCipherHints() {
        terminalEntropyShown = false;
        terminalProvidenceShown = false;
        refreshRing();
    }

    function unlock() {
        syncCipherHints();
    }

    function clear() {
        resetCipherHints();
    }

    function onGodModeOff() {
        refreshRing();
    }

    global.EntropyCipherHint = {
        unlock,
        clear,
        onGodModeOff,
        notifyTerminal,
        syncCipherHints,
        resetCipherHints,
        shouldShowRingHint,
        applyToWheels,
        clearFromWheels,
        isIosChannel,
        isDesktopRingChannel,
        TERMINAL_HINTS,
        TERMINAL_PROVIDENCE_HINT,
        RING_PHRASE,
    };
})(typeof globalThis !== 'undefined' ? globalThis : window);
