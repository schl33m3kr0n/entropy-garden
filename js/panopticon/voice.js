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

/** Retain utterances in memory for 15s so V8/WebKit GC doesn't kill the C++ audio unit mid-stream (end pop). */
const retainedUtterances = [];
function retainUtterance(u) {
    if (!u) return;
    retainedUtterances.push(u);
    setTimeout(() => {
        const idx = retainedUtterances.indexOf(u);
        if (idx !== -1) retainedUtterances.splice(idx, 1);
    }, 15000);
}

let currentEyeVoice = null;

export function pickEyeVoice(voices) {
    if (!voices?.length) return null;
    const english = voices.filter(voice => /^en(?:-|_|$)/i.test(voice.lang));
    const pool = english.length ? english : voices;
    const score = voice => {
        const name = voice.name || '';
        // 1. Google / Microsoft / Natural network voices stream cleanly in software without CoreAudio AUHAL pop
        if (/google|microsoft/i.test(name)) return 10;
        if (/natural/i.test(name)) return 9;
        // 2. Modern Apple neural voices (Eddy, Flo, Reed, Shelley, Ava, Serena, etc.)
        if (/eddy|flo|reed|shelley|sandy|ava|serena|evan|nathan|zoe/i.test(name)) return 8;
        if (/enhanced|premium/i.test(name)) return 7;
        // 3. Known pleasant English voices
        if (/samantha|karen|moira|daniel|victoria/i.test(name)) return 5;
        if (voice.default) return 4;
        if (voice.localService) return 3;
        return 1;
    };
    return pool.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

function refreshEyeVoice() {
    if (!synth) return;
    const voices = synth.getVoices();
    if (voices?.length) {
        currentEyeVoice = pickEyeVoice(voices);
    }
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

/** Wait until the speech synthesizer finishes naturally, then run fn. */
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
    // Only force cancel as a last-resort recovery if hung after 1 second (20 attempts).
    // Never cancel on attempt 0 — that abruptly halts the audio buffer and causes an end-pop.
    if (attempt >= 20) {
        try { synth.cancel(); } catch { /* ignore */ }
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

    clearStartWatch();
    spokenStartedAt = 0;

    // Clean sentence ending with trailing period and paragraph breaks for natural silence decay
    const clean = text.trim().replace(/[.!?…\s]+$/, '');
    const spoken = clean ? `${clean}.\n\n` : '';
    if (!spoken) return;

    const utterance = new SpeechSynthesisUtterance(spoken);
    retainUtterance(utterance);

    if (!currentEyeVoice) refreshEyeVoice();
    if (currentEyeVoice) utterance.voice = currentEyeVoice;
    utterance.lang = currentEyeVoice?.lang || 'en-US';
    utterance.rate = 0.94;
    utterance.pitch = 1;
    // Leave volume at 1 to prevent CoreAudio digital gain scaling pops on stream teardown
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
        if (pending) {
            whenSynthIdle(() => flushPending());
        }
    };

    utterance.onerror = event => {
        done();
        if (event.error === 'canceled' || event.error === 'interrupted') return;
        pending = null;
        failure = event.error || 'speech-failed';
        enabled = false;
        syncButton();
    };

    active = utterance;

    // Chrome sometimes swallows the first speak until cancel + retry.
    startWatchTimer = setTimeout(() => {
        startWatchTimer = 0;
        if (active !== utterance || spokenStartedAt) return;
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
