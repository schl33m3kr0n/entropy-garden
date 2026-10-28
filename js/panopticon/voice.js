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

/** Retain utterances so Safari/Chrome GC does not drop the audio unit mid-stream. */
const retainedUtterances = [];
function retainUtterance(u) {
    if (!u) return;
    retainedUtterances.push(u);
    setTimeout(() => {
        const idx = retainedUtterances.indexOf(u);
        if (idx !== -1) retainedUtterances.splice(idx, 1);
    }, 20000);
}

let currentEyeVoice = null;

export function pickEyeVoice(voices) {
    if (!voices?.length) return null;
    const english = voices.filter(voice => /^en(?:-|_|$)/i.test(voice.lang));
    const pool = english.length ? english : voices;
    // Compact local voices tear down cleaner than Apple neural/enhanced (loud end click).
    const score = voice => {
        const name = voice.name || '';
        if (/enhanced|premium|neural|superstar|novelty|sapi[rs]|eddy|flo|reed|shelley|sandy/i.test(name)) {
            return 0;
        }
        if (/samantha|ava|serena|karen|moira|daniel|arthur|fred|victoria|alex/i.test(name)) return 8;
        if (/google|microsoft/i.test(name) && !voice.localService) return 6;
        if (voice.default) return 4;
        if (voice.localService) return 3;
        return 1;
    };
    return pool.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

function refreshEyeVoice() {
    if (!synth) return;
    const voices = synth.getVoices();
    if (voices?.length) currentEyeVoice = pickEyeVoice(voices);
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

function synthBusy() {
    return Boolean(synth?.speaking || synth?.pending);
}

function kickSynth() {
    if (!synth) return;
    try { synth.cancel(); } catch { /* ignore */ }
    try { if (synth.paused) synth.resume(); } catch { /* ignore */ }
}

/** Wait until the synthesizer is idle, then run fn. Avoids canceling mid-utterance. */
function whenSynthIdle(fn, attempt = 0) {
    if (document.body.classList.contains('singularity-active')) {
        clearSpeakRetry();
        return;
    }
    if (!synthBusy()) {
        clearSpeakRetry();
        try { if (synth?.paused) synth.resume(); } catch { /* ignore */ }
        fn();
        return;
    }
    if (attempt >= 24) {
        kickSynth();
        clearSpeakRetry();
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
    if (!synth) return;
    if (current && synthBusy()) {
        try {
            synth.cancel();
        } catch {
            /* ignore */
        }
    }
}

function flushPending() {
    const next = pending;
    pending = null;
    if (next && enabled) beginSpeak(next.text);
}

function beginSpeak(text, attempt = 0) {
    if (!supported || !enabled || document.hidden) return;
    if (document.body.classList.contains('singularity-active')) return;

    if (active) {
        pending = { text };
        return;
    }

    if (synthBusy()) {
        pending = { text };
        whenSynthIdle(() => flushPending());
        return;
    }

    clearStartWatch();
    spokenStartedAt = 0;

    const clean = String(text || '').replace(/\s+/g, ' ').trim().replace(/[.!?…\s]+$/, '');
    if (!clean) return;
    const spoken = `${clean}.`;

    const utterance = new SpeechSynthesisUtterance(spoken);
    retainUtterance(utterance);

    if (!currentEyeVoice) refreshEyeVoice();
    if (currentEyeVoice) utterance.voice = currentEyeVoice;
    utterance.lang = currentEyeVoice?.lang || 'en-US';
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.volume = 1;

    const done = () => {
        clearStartWatch();
        spokenStartedAt = 0;
        if (active === utterance) active = null;
    };

    utterance.onstart = () => {
        failure = '';
        spokenStartedAt = performance.now();
        clearStartWatch();
    };

    utterance.onend = () => {
        done();
        whenSynthIdle(() => flushPending());
    };

    utterance.onerror = event => {
        done();
        if (event.error === 'canceled' || event.error === 'interrupted') {
            whenSynthIdle(() => flushPending());
            return;
        }
        pending = null;
        failure = event.error || 'speech-failed';
        enabled = false;
        syncButton();
    };

    active = utterance;

    // Chrome sometimes swallows speak() until cancel + retry.
    startWatchTimer = setTimeout(() => {
        startWatchTimer = 0;
        if (active !== utterance || spokenStartedAt) return;
        active = null;
        kickSynth();
        if (attempt < 2 && enabled) {
            whenSynthIdle(() => beginSpeak(text, attempt + 1));
            return;
        }
        // Keep enabled — leave a retry for the next comment instead of going dark.
        failure = '';
        syncButton();
        whenSynthIdle(() => flushPending());
    }, 1400);

    try {
        if (synth.paused) synth.resume();
        synth.speak(utterance);
    } catch {
        done();
        if (attempt < 2 && enabled) {
            whenSynthIdle(() => beginSpeak(text, attempt + 1));
            return;
        }
        failure = 'speech-failed';
        enabled = false;
        syncButton();
    }
}

export function speakEyeComment(payload) {
    if (!supported || !enabled || document.hidden || payload.pre) return;
    if (document.body.classList.contains('singularity-active')) return;
    const text = String(payload.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (active || speakRetryTimer || synthBusy()) {
        pending = { text };
        if (!active) whenSynthIdle(() => flushPending());
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
    refreshEyeVoice();
    synth.addEventListener?.('voiceschanged', refreshEyeVoice);
    if (typeof synth.onvoiceschanged !== 'undefined') {
        synth.onvoiceschanged = refreshEyeVoice;
    }
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
        if (now && !sawSingularity) stopEyeVoice();
        sawSingularity = now;
    });
    modeObserver.observe(document.body, {attributes: true, attributeFilter: ['class']});
    button.addEventListener('click', () => {
        enabled = !enabled;
        failure = '';
        syncButton();
        if (enabled) {
            if (document.body.classList.contains('singularity-active')) return;
            lastComment = '';
            kickSynth();
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
