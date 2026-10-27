/** Optional device speech for the eye. No API key or remote service required. */
const synth = globalThis.speechSynthesis;
const supported = Boolean(synth && globalThis.SpeechSynthesisUtterance);
let enabled = false;
let active = null;
let pending = null;
let button;
let status;
let failure = '';
let softEndTimer = 0;
/** Holds the output device awake — helps some cancel paths; soft-land covers natural ends. */
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

function clearSoftEnd() {
    if (!softEndTimer) return;
    clearTimeout(softEndTimer);
    softEndTimer = 0;
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

/**
 * Cut slightly before the engine's natural teardown. On macOS the loud pop is
 * usually that disconnect, not cancel() itself when we land this late.
 */
function softLand(utterance) {
    softEndTimer = 0;
    if (active !== utterance) return;
    startKeepAlive();
    clearUtteranceHandlers(utterance);
    active = null;
    try {
        if (synth.speaking || synth.pending) synth.cancel();
    } catch {
        /* ignore */
    }
    if (status && enabled && !pending) status.textContent = 'Eye voice is ready.';
    flushPending();
}

function estimateDurationMs(text, rate) {
    const words = text.split(/\s+/).filter(Boolean).length || 1;
    const wordsPerSec = 2.55 * Math.max(0.55, rate || 1);
    return (words / wordsPerSec) * 1000;
}

function armSoftEnd(utterance, text, rate) {
    clearSoftEnd();
    const est = estimateDurationMs(text, rate);
    // Prefer landing just before natural end; boundary events refine this.
    softEndTimer = setTimeout(() => softLand(utterance), Math.max(320, est - 140));
}

/** Forced stop only (toggle off, tab hide, singularity). Prefer queueing over this. */
export function stopEyeVoice() {
    pending = null;
    clearSoftEnd();
    const current = active;
    active = null;
    clearUtteranceHandlers(current);
    if (!synth) {
        stopKeepAliveSoon();
        return;
    }
    if (synth.speaking || synth.pending) {
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

export function speakEyeComment(payload) {
    if (!supported || !enabled || document.hidden || payload.pre) return;
    if (document.body.classList.contains('singularity-active')) return;
    const text = String(payload.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    // Never cancel mid-line for a newer comment — queue the latest instead.
    if (active || synth.speaking || synth.pending) {
        pending = { text };
        return;
    }
    startKeepAlive();
    clearSoftEnd();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickEyeVoice(synth.getVoices());
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.volume = 0.7;
    const done = () => {
        clearSoftEnd();
        if (active === utterance) active = null;
        clearUtteranceHandlers(utterance);
    };
    utterance.onstart = () => {
        failure = '';
        startKeepAlive();
        armSoftEnd(utterance, text, utterance.rate);
        if (status) status.textContent = 'Reading: “' + text + '”';
    };
    utterance.onboundary = (event) => {
        if (active !== utterance) return;
        if (event.name && event.name !== 'word') return;
        const index = typeof event.charIndex === 'number' ? event.charIndex : 0;
        const remaining = text.length - index;
        // Last word / trailing scrap — land shortly after it starts.
        if (remaining <= Math.max(10, Math.ceil(text.length * 0.12))) {
            clearSoftEnd();
            softEndTimer = setTimeout(() => softLand(utterance), 240);
        }
    };
    utterance.onend = () => {
        // Natural end (soft-land missed). Still clear state; pop may have already fired.
        done();
        if (status && enabled && !pending) status.textContent = 'Eye voice is ready.';
        if (enabled) startKeepAlive();
        flushPending();
    };
    utterance.onerror = event => {
        done();
        if (event.error === 'canceled' || event.error === 'interrupted') {
            // softLand already advances the queue; ignore duplicate cancel errors.
            if (!pending || active) flushPending();
            return;
        }
        pending = null;
        failure = event.error || 'speech-failed';
        enabled = false;
        syncButton();
        stopKeepAliveSoon();
        if (status) status.textContent = failure === 'not-allowed'
            ? 'This browser blocked speech. Try opening this page in Safari or Chrome, then enable Eye Voice.'
            : 'Speech could not start (' + failure + '). Check that an English system voice is installed, then try again.';
    };
    active = utterance;
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
        if (status) status.textContent = 'Speech could not start in this browser.';
    }
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
    status = document.createElement('p');
    status.id = 'panopticon-voice-status';
    status.setAttribute('role', 'status');
    status.style.cssText = 'max-width:250px;margin:6px 12px;color:inherit;font-size:12px;line-height:1.5';
    button.after(status);
    syncButton();
    if (!supported) {
        status.textContent = 'Speech is unavailable in this browser. Try Safari or Chrome.';
        return;
    }
    synth.getVoices();
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
    const modeObserver = new MutationObserver(() => {
        if (document.body.classList.contains('singularity-active')) stopEyeVoice();
    });
    modeObserver.observe(document.body, {attributes: true, attributeFilter: ['class']});
    button.addEventListener('click', () => {
        enabled = !enabled;
        failure = '';
        status.textContent = enabled ? 'Starting eye voice…' : 'Eye voice is off.';
        syncButton();
        if (enabled) {
            startKeepAlive();
            lastComment = '';
            if (!readVisibleComment()) speakEyeComment({text: 'Eye voice enabled.'});
        }
        else stopEyeVoice();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopEyeVoice(); });
    window.addEventListener('pagehide', stopEyeVoice);
}
