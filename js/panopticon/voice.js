/** Optional device speech for the eye. No API key or remote service required. */
const synth = globalThis.speechSynthesis;
const supported = Boolean(synth && globalThis.SpeechSynthesisUtterance);
let enabled = false;
let active = null;
let pending = null;
let button;
let failure = '';
let speakRetryTimer = 0;
let startWatchTimer = 0;
let spokenStartedAt = 0;
/** Near-silent bed so macOS is less likely to power-gate the DAC between lines. */
let keepAlive = null;
let keepAliveStopTimer = 0;

export function pickEyeVoice(voices) {
    const english = voices.filter(voice => /^en(?:-|_|$)/i.test(voice.lang));
    // Prefer compact local voices. Enhanced/premium/neural engines often
    // disconnect the audio graph with a loud click when an utterance ends.
    const score = voice => {
        const name = voice.name || '';
        if (/enhanced|premium|neural|superstar|novelty|sapi[rs]/i.test(name)) return 0;
        if (/samantha|ava|serena|karen|moira|daniel|arthur|fred|victoria/i.test(name)) return 5;
        if (/google|microsoft/i.test(name)) return 3;
        if (/natural/i.test(name)) return 2;
        return voice.default ? 1 : 0;
    };
    return english.sort((a, b) => score(b) - score(a))[0] || null;
}

function clearUtteranceHandlers(utterance) {
    if (!utterance) return;
    utterance.onstart = null;
    utterance.onend = null;
    utterance.onerror = null;
    utterance.onboundary = null;
}

function clearSpeakRetry() {
    if (!speakRetryTimer) return;
    clearTimeout(speakRetryTimer);
    speakRetryTimer = 0;
}

function clearStartWatch() {
    if (!startWatchTimer) return;
    clearTimeout(startWatchTimer);
    startWatchTimer = 0;
}

function startKeepAlive() {
    if (keepAliveStopTimer) {
        clearTimeout(keepAliveStopTimer);
        keepAliveStopTimer = 0;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    if (keepAlive) {
        if (keepAlive.ctx.state === 'suspended') keepAlive.ctx.resume().catch(() => {});
        return;
    }
    try {
        const ctx = new AC();
        const seconds = 2;
        const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.00035;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 1;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
        keepAlive = { ctx, source, gain };
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch {
        keepAlive = null;
    }
}

function stopKeepAliveSoon() {
    if (keepAliveStopTimer) clearTimeout(keepAliveStopTimer);
    keepAliveStopTimer = setTimeout(() => {
        keepAliveStopTimer = 0;
        if (!keepAlive) return;
        try { keepAlive.source.stop(); } catch { /* ignore */ }
        try { keepAlive.ctx.close(); } catch { /* ignore */ }
        keepAlive = null;
    }, 280);
}

function synthBusy() {
    return Boolean(synth?.speaking || synth?.pending);
}

/** Wait until Chrome finishes winding down after cancel(), then run fn. */
function whenSynthIdle(fn, attempt = 0) {
    // Poem TTS owns speechSynthesis during singularity — never cancel it from here.
    if (document.body.classList.contains('singularity-active')) {
        clearSpeakRetry();
        return;
    }
    if (!synthBusy()) {
        fn();
        return;
    }
    if (attempt === 0) {
        try { synth.cancel(); } catch { /* ignore */ }
    }
    if (attempt >= 20) {
        fn();
        return;
    }
    clearSpeakRetry();
    speakRetryTimer = setTimeout(() => whenSynthIdle(fn, attempt + 1), 50);
}

/**
 * Stop eye narration only. Do not cancel speechSynthesis unless this module
 * owns the current utterance — otherwise poem TTS gets killed.
 */
export function stopEyeVoice() {
    pending = null;
    clearSpeakRetry();
    clearStartWatch();
    spokenStartedAt = 0;
    const current = active;
    active = null;
    clearUtteranceHandlers(current);
    if (!synth) {
        stopKeepAliveSoon();
        return;
    }
    if (current && synthBusy()) {
        try {
            synth.cancel();
        } catch {
            /* ignore */
        }
    }
    stopKeepAliveSoon();
}

function flushPending() {
    const next = pending;
    pending = null;
    if (next && enabled) speakEyeComment(next);
}

function beginSpeak(text, attempt = 0) {
    if (!supported || !enabled || document.hidden) return;
    if (document.body.classList.contains('singularity-active')) return;

    if (active) {
        pending = { text };
        return;
    }

    if (synthBusy()) {
        // Another narrator (poems) may own the synth — wait, don't steal it.
        if (attempt < 20) {
            clearSpeakRetry();
            speakRetryTimer = setTimeout(() => beginSpeak(text, attempt + 1), 50);
            return;
        }
        return;
    }

    startKeepAlive();
    clearStartWatch();
    spokenStartedAt = 0;

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickEyeVoice(synth.getVoices());
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.volume = 0.7;

    const done = () => {
        clearStartWatch();
        spokenStartedAt = 0;
        if (active === utterance) active = null;
        clearUtteranceHandlers(utterance);
    };

    utterance.onstart = () => {
        failure = '';
        spokenStartedAt = performance.now();
        clearStartWatch();
        startKeepAlive();
    };

    utterance.onend = () => {
        done();
        if (enabled) startKeepAlive();
        whenSynthIdle(() => flushPending());
    };

    utterance.onerror = event => {
        done();
        if (event.error === 'canceled' || event.error === 'interrupted') return;
        pending = null;
        failure = event.error || 'speech-failed';
        enabled = false;
        syncButton();
        stopKeepAliveSoon();
    };

    active = utterance;

    // Chrome sometimes swallows the first speak until cancel + retry.
    startWatchTimer = setTimeout(() => {
        startWatchTimer = 0;
        if (active !== utterance || spokenStartedAt) return;
        clearUtteranceHandlers(utterance);
        active = null;
        try { synth.cancel(); } catch { /* ignore */ }
        if (attempt < 2 && enabled) {
            whenSynthIdle(() => beginSpeak(text, attempt + 1));
            return;
        }
        failure = 'speech-failed';
        enabled = false;
        syncButton();
    }, 1400);

    try {
        if (synth.paused) synth.resume();
        synth.speak(utterance);
    } catch {
        done();
        pending = null;
        enabled = false;
        failure = 'speech-failed';
        syncButton();
        stopKeepAliveSoon();
    }
}

export function speakEyeComment(payload) {
    if (!supported || !enabled || document.hidden || payload.pre) return;
    if (document.body.classList.contains('singularity-active')) return;
    const text = String(payload.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    // Newer line while one is active/queued — keep only the latest.
    if (active || speakRetryTimer || synthBusy()) {
        pending = { text };
        if (!active && !speakRetryTimer) whenSynthIdle(() => flushPending());
        return;
    }
    beginSpeak(text);
}

function syncButton() {
    if (!button) return;
    button.textContent = supported ? (enabled ? 'EYE VOICE ON' : failure ? 'RETRY EYE VOICE' : 'EYE VOICE OFF') : 'EYE VOICE UNAVAILABLE';
    button.setAttribute('aria-pressed', String(enabled));
    button.disabled = !supported;
}

export function initEyeVoice() {
    button = document.getElementById('panopticon-voice-btn');
    if (!button || button.dataset.voiceBound) return;
    button.dataset.voiceBound = 'true';
    syncButton();
    if (!supported) return;
    synth.getVoices();
    synth.addEventListener?.('voiceschanged', () => { synth.getVoices(); });
    const bubble = document.getElementById('panopticon-comment');
    let lastComment = '';
    const readVisibleComment = () => {
        if (!enabled || !bubble || bubble.getAttribute('aria-hidden') === 'true'
            || !bubble.classList.contains('visible')) return false;
        const text = bubble.querySelector('.panopticon-comment-text')?.textContent?.trim();
        if (!text || bubble.classList.contains('has-pre')) return false;
        if (text === lastComment) return true;
        lastComment = text;
        speakEyeComment({text});
        return true;
    };
    if (bubble) {
        const observer = new MutationObserver(readVisibleComment);
        observer.observe(bubble, {childList: true, subtree: true, characterData: true,
            attributes: true, attributeFilter: ['class', 'aria-hidden']});
    }
    let sawSingularity = document.body.classList.contains('singularity-active');
    const modeObserver = new MutationObserver(() => {
        const now = document.body.classList.contains('singularity-active');
        // Only on enter — re-running cancel on every body class tweak kills poem TTS.
        if (now && !sawSingularity) stopEyeVoice();
        sawSingularity = now;
    });
    modeObserver.observe(document.body, {attributes: true, attributeFilter: ['class']});
    button.addEventListener('click', () => {
        enabled = !enabled;
        failure = '';
        syncButton();
        if (enabled) {
            if (document.body.classList.contains('singularity-active')) {
                // Don't fight poem voiceover for the synthesizer.
                return;
            }
            startKeepAlive();
            lastComment = '';
            try { synth.cancel(); } catch { /* ignore */ }
            whenSynthIdle(() => {
                if (!enabled || document.body.classList.contains('singularity-active')) return;
                if (!readVisibleComment()) speakEyeComment({ text: 'Eye voice enabled.' });
            });
        }
        else stopEyeVoice();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopEyeVoice(); });
    window.addEventListener('pagehide', stopEyeVoice);
}
