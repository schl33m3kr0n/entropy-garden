/**
 * Optional panopticon eye voice via in-browser espeak-ng (Spellophone WASM).
 * Plays PCM through Web Audio with a short fade-out so macOS system-TTS
 * teardown clicks never happen. GPL-3.0 library loaded from jsDelivr on demand.
 */
const SPELL_MOD =
    'https://cdn.jsdelivr.net/npm/@spelling-creator/spellophone@0.2.1/+esm';
const FADE_OUT_SEC = 0.07;
/** Prefer American English — default espeak `en` is British RP. */
const VOICE_CANDIDATES = [
    'en-us',
    'English (America)',
    'gmw/en-US',
    { language: 'en-us' },
];
const EYE_VOICE_PREF_KEY = 'entropy-garden-eye-voice-v1';

function loadEyeVoicePref() {
    try {
        const raw = localStorage.getItem(EYE_VOICE_PREF_KEY);
        // Default ON for first visit; remember explicit off/on after that.
        if (raw === null) return true;
        return raw === '1';
    } catch {
        return true;
    }
}

function saveEyeVoicePref(on) {
    try {
        localStorage.setItem(EYE_VOICE_PREF_KEY, on ? '1' : '0');
    } catch {
        /* private mode / quota */
    }
}

let enabled = loadEyeVoicePref();
let button;
let failure = '';
/** @type {'idle'|'loading'|'speaking'} */
let playerState = 'idle';
/** @type {{ text: string }|null} */
let pending = null;
let speakGeneration = 0;

/** @type {import('@spelling-creator/spellophone').Espeak|null} */
let espeak = null;
/** @type {Promise<import('@spelling-creator/spellophone').Espeak>|null} */
let espeakLoading = null;
/** @type {typeof import('@spelling-creator/spellophone').toFloat32|null} */
let toFloat32 = null;

/** @type {AudioContext|null} */
let audioCtx = null;
/** @type {AudioBufferSourceNode|null} */
let activeSource = null;
/** @type {GainNode|null} */
let activeGain = null;

const supported = typeof WebAssembly !== 'undefined'
    && typeof AudioContext !== 'undefined';

function getAudioCtx() {
    if (!audioCtx) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
}

async function ensureEspeak() {
    if (espeak) return espeak;
    if (espeakLoading) return espeakLoading;
    espeakLoading = (async () => {
        const mod = await import(SPELL_MOD);
        toFloat32 = mod.toFloat32;
        const engine = await mod.createEspeak({
            cdn: 'jsdelivr',
            languages: ['en'],
        });
        let selected = null;
        for (const candidate of VOICE_CANDIDATES) {
            try {
                if (typeof engine.loadVoice === 'function') {
                    await engine.loadVoice(candidate);
                } else {
                    engine.setVoice(candidate);
                }
                selected = engine.voice || candidate;
                break;
            } catch {
                try {
                    engine.setVoice(candidate);
                    selected = engine.voice || candidate;
                    break;
                } catch {
                    /* try next */
                }
            }
        }
        if (!selected) {
            console.warn('[eye voice] American en-us voice unavailable; using espeak default');
        } else {
            const label = selected?.name || selected?.identifier || String(selected);
            if (!/america|en-us|en_us/i.test(label) && !/america|en-us/i.test(JSON.stringify(selected))) {
                console.warn('[eye voice] expected American voice, got', selected);
            }
        }
        try { engine.setParameter('rate', 155); } catch { /* optional */ }
        try { engine.setParameter('pitch', 42); } catch { /* optional */ }
        espeak = engine;
        return engine;
    })().catch((err) => {
        espeakLoading = null;
        throw err;
    });
    return espeakLoading;
}

function stopPlayback() {
    speakGeneration += 1;
    const src = activeSource;
    const gain = activeGain;
    activeSource = null;
    activeGain = null;
    if (gain && audioCtx) {
        try {
            const t = audioCtx.currentTime;
            gain.gain.cancelScheduledValues(t);
            gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
            gain.gain.linearRampToValueAtTime(0.0001, t + 0.03);
        } catch { /* ignore */ }
    }
    if (src) {
        try { src.stop(audioCtx ? audioCtx.currentTime + 0.035 : undefined); } catch { /* ignore */ }
        try { src.disconnect(); } catch { /* ignore */ }
    }
    if (gain) {
        try { gain.disconnect(); } catch { /* ignore */ }
    }
    playerState = 'idle';
    syncButton();
}

export function stopEyeVoice() {
    pending = null;
    stopPlayback();
}

function flushPending() {
    const next = pending;
    pending = null;
    if (next && enabled) speakEyeComment(next);
}

function playSamples(samples, sampleRate, generation) {
    return new Promise((resolve, reject) => {
        if (generation !== speakGeneration || !enabled) {
            resolve();
            return;
        }
        if (!toFloat32) {
            reject(new Error('TTS float converter missing'));
            return;
        }
        const ctx = getAudioCtx();
        const float = toFloat32(samples);
        const buffer = ctx.createBuffer(1, float.length, sampleRate);
        buffer.copyToChannel(float, 0);

        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        const dur = buffer.duration;
        const fade = Math.min(FADE_OUT_SEC, Math.max(0.02, dur * 0.12));
        gain.gain.setValueAtTime(1, now);
        if (dur > fade + 0.02) {
            gain.gain.setValueAtTime(1, now + dur - fade);
            gain.gain.linearRampToValueAtTime(0.0001, now + dur);
        } else {
            gain.gain.linearRampToValueAtTime(0.0001, now + dur);
        }

        activeSource = source;
        activeGain = gain;
        playerState = 'speaking';
        syncButton();

        const finish = () => {
            if (activeSource === source) {
                activeSource = null;
                activeGain = null;
            }
            try { source.disconnect(); } catch { /* ignore */ }
            try { gain.disconnect(); } catch { /* ignore */ }
            resolve();
        };

        source.onended = finish;
        try {
            source.start(now);
        } catch (err) {
            finish();
            reject(err);
        }
    });
}

async function beginSpeak(text) {
    if (!supported || !enabled || document.hidden) return;
    if (document.body.classList.contains('singularity-active')) return;

    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return;

    if (playerState === 'speaking' || playerState === 'loading') {
        pending = { text: clean };
        return;
    }

    const generation = ++speakGeneration;
    playerState = 'loading';
    syncButton();

    try {
        const engine = await ensureEspeak();
        if (generation !== speakGeneration || !enabled) return;

        const result = engine.synthesize(clean, {
            rate: 155,
            pitch: 42,
            endPause: true,
        });
        if (!result?.samples?.length) throw new Error('Empty synthesis');

        await playSamples(result.samples, result.sampleRate, generation);
        if (generation !== speakGeneration) return;
        playerState = 'idle';
        syncButton();
        flushPending();
    } catch (err) {
        if (generation !== speakGeneration) return;
        console.warn('[Entropy Garden] eye voice failed', err);
        stopPlayback();
        failure = 'speech-failed';
        enabled = false;
        syncButton();
    }
}

/** Respelling / phoneme hints so espeak hits the intended pronunciation. */
const EYE_PRONUNCIATIONS = [
    // Stress on first syllable: KAHN-yay (espeak phoneme ' marks stress)
    [/\bkanye\s+west\b/gi, "[[k'A:njeI]] west"],
    [/\bkanye('s)?\b/gi, "[[k'A:njeI]]$1"],
    [/\bbodhi\b/gi, 'bo dee'],
    [/\bfrutiger\s+aero\b/gi, 'froo tih gur air oh'],
    [/\bfrutiger\b/gi, 'froo tih gur'],
    // Verb live/lives = short i; adjective live only before "feed"
    [/\blive\s+feed\b/gi, 'liev feed'],
    [/\blives\b/gi, 'livz'],
    [/\blive\b/gi, 'liv'],
];

function applyEyePronunciations(text) {
    let out = text;
    for (const [pattern, replacement] of EYE_PRONUNCIATIONS) {
        out = out.replace(pattern, replacement);
    }
    return out;
}

/** Softer clause breaks for espeak — keep decimals, turn sentence stops into commas. */
function softenEyePunctuation(text) {
    return text
        .replace(/(\d)\.(\d)/g, '$1\u2024$2')
        .replace(/\.{2,}|…/g, ',')
        .replace(/\./g, ',')
        .replace(/\u2024/g, '.')
        .replace(/,\s*,+/g, ',');
}

/** Drop symbols espeak would name aloud (e.g. *sigh* → sigh). */
function stripEyeSpeakNoise(text) {
    return text.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

/** God-mode bubbles are ALL CAPS on screen; espeak spells "IT" unless spoken lowercase. */
function spokenEyeText(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    const god = document.body.classList.contains('god-mode')
        || document.getElementById('panopticon-comment')?.classList.contains('panopticon-comment-god');
    const cased = god ? clean.toLowerCase() : clean;
    return applyEyePronunciations(softenEyePunctuation(stripEyeSpeakNoise(cased)));
}

export function speakEyeComment(payload) {
    if (!supported || !enabled || document.hidden || payload?.pre) return;
    if (document.body.classList.contains('singularity-active')) return;
    const text = spokenEyeText(payload?.text);
    if (!text) return;
    if (playerState === 'speaking' || playerState === 'loading') {
        pending = { text };
        return;
    }
    beginSpeak(text);
}

function syncButton() {
    if (!button) return;
    if (!supported) {
        button.textContent = 'EYE VOICE UNAVAILABLE';
        button.disabled = true;
        button.setAttribute('aria-pressed', 'false');
        return;
    }
    if (!enabled) {
        button.textContent = failure ? 'RETRY EYE VOICE' : 'EYE VOICE OFF';
    } else if (playerState === 'loading') {
        button.textContent = 'EYE VOICE…';
    } else if (playerState === 'speaking') {
        button.textContent = 'EYE VOICE ■';
    } else {
        button.textContent = 'EYE VOICE ON';
    }
    button.setAttribute('aria-pressed', String(enabled));
    button.disabled = false;
}

export function initEyeVoice() {
    button = document.getElementById('panopticon-voice-btn');
    if (!button || button.dataset.voiceBound) return;
    button.dataset.voiceBound = 'true';
    syncButton();
    if (!supported) return;

    const bubble = document.getElementById('panopticon-comment');
    let lastComment = '';
    const readVisibleComment = () => {
        if (!enabled || !bubble || bubble.getAttribute('aria-hidden') === 'true'
            || !bubble.classList.contains('visible')) return false;
        const text = bubble.querySelector('.panopticon-comment-text')?.textContent?.trim();
        if (!text || bubble.classList.contains('has-pre')) return false;
        if (text === lastComment) return true;
        lastComment = text;
        speakEyeComment({ text });
        return true;
    };

    if (bubble) {
        const observer = new MutationObserver(readVisibleComment);
        observer.observe(bubble, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class', 'aria-hidden'],
        });
    }

    let sawSingularity = document.body.classList.contains('singularity-active');
    const modeObserver = new MutationObserver(() => {
        const now = document.body.classList.contains('singularity-active');
        if (now && !sawSingularity) stopEyeVoice();
        sawSingularity = now;
    });
    modeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const unlockAudio = () => {
        if (!enabled || !supported) return;
        getAudioCtx();
        ensureEspeak().catch(() => {
            failure = 'speech-failed';
            syncButton();
        });
    };

    // Browsers need a gesture before AudioContext / WASM playback.
    if (enabled) {
        const unlockOnce = () => unlockAudio();
        window.addEventListener('pointerdown', unlockOnce, { once: true, passive: true });
        window.addEventListener('keydown', unlockOnce, { once: true });
        window.addEventListener('touchstart', unlockOnce, { once: true, passive: true });
    }

    button.addEventListener('click', () => {
        // Click while speaking → stop current line, stay enabled.
        if (enabled && playerState === 'speaking') {
            stopPlayback();
            return;
        }
        enabled = !enabled;
        failure = '';
        saveEyeVoicePref(enabled);
        syncButton();
        if (enabled) {
            if (document.body.classList.contains('singularity-active')) return;
            unlockAudio();
            lastComment = '';
            ensureEspeak().catch(() => {
                failure = 'speech-failed';
                enabled = false;
                saveEyeVoicePref(false);
                syncButton();
            });
            if (!readVisibleComment()) speakEyeComment({ text: 'Eye voice enabled.' });
        } else {
            stopEyeVoice();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopEyeVoice();
    });
    window.addEventListener('pagehide', stopEyeVoice);
}
