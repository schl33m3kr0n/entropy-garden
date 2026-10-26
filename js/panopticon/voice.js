/** Optional device speech for the eye. No API key or remote service required. */
const synth = globalThis.speechSynthesis;
const supported = Boolean(synth && globalThis.SpeechSynthesisUtterance);
let enabled = false;
let active = null;
let button;
let status;
let failure = '';

export function pickEyeVoice(voices) {
    const english = voices.filter(voice => /^en(?:-|_|$)/i.test(voice.lang));
    const score = voice => /natural|enhanced|premium|neural/i.test(voice.name) ? 4
        : /samantha|ava|serena/i.test(voice.name) ? 3
        : /google|microsoft/i.test(voice.name) ? 2 : voice.default ? 1 : 0;
    return english.sort((a, b) => score(b) - score(a))[0] || null;
}

export function stopEyeVoice() {
    if (!active) return;
    active = null;
    synth.cancel();
}

export function speakEyeComment(payload) {
    if (!supported || !enabled || document.hidden || payload.pre) return;
    if (document.body.classList.contains('singularity-active')) return;
    const text = String(payload.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    // Replace this eye's previous line, but do not interrupt another narrator.
    if (active) stopEyeVoice();
    else if (synth.speaking || synth.pending) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickEyeVoice(synth.getVoices());
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.volume = 0.85;
    const done = () => { if (active === utterance) active = null; };
    utterance.onstart = () => {
        failure = '';
        if (status) status.textContent = 'Reading: “' + text + '”';
    };
    utterance.onend = () => {
        done();
        if (status && enabled) status.textContent = 'Eye voice is ready.';
    };
    utterance.onerror = event => {
        done();
        if (event.error === 'canceled' || event.error === 'interrupted') return;
        failure = event.error || 'speech-failed';
        enabled = false;
        syncButton();
        if (status) status.textContent = failure === 'not-allowed'
            ? 'This browser blocked speech. Try opening this page in Safari or Chrome, then enable Eye Voice.'
            : 'Speech could not start (' + failure + '). Check that an English system voice is installed, then try again.';
    };
    active = utterance;
    try {
        synth.resume();
        synth.speak(utterance);
    } catch {
        done();
        enabled = false;
        failure = 'speech-failed';
        syncButton();
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
            lastComment = '';
            if (!readVisibleComment()) speakEyeComment({text: 'Eye voice enabled.'});
        }
        else stopEyeVoice();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopEyeVoice(); });
    window.addEventListener('pagehide', stopEyeVoice);
}
