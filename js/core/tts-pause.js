/** Shared spoken-punctuation pause preferences (eye Spellophone + singularity Web Speech). */

export const TTS_COMMA_BREAK_MS = 90;
export const TTS_PERIOD_BREAK_MS = 320;

/** Protect decimals / titles; leave . vs , for distinct pauses. */
export function softenTtsPunctuation(text) {
    return String(text || '')
        .replace(/(\d)\.(\d)/g, '$1\u2024$2')
        .replace(/\b(mrs|mr|ms|dr|jr|sr|prof|st|vs)\./gi, '$1')
        .replace(/\b([A-Za-z])\.(?=\s+[A-Za-z])/g, '$1')
        .replace(/\.{2,}|…/g, '.')
        .replace(/\u2024/g, '.')
        .replace(/,\s*,+/g, ',');
}

/** Spellophone SSML: periods long, commas short. */
export function toSpellophoneSsml(text) {
    const escaped = String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return escaped
        .replace(/\.\s*/g, `<break time="${TTS_PERIOD_BREAK_MS}ms"/>`)
        .replace(/,\s*/g, `<break time="${TTS_COMMA_BREAK_MS}ms"/>`);
}

/**
 * Web Speech can't take SSML breaks — use silent newlines after periods
 * (same idea as Firefox poem line gaps) and keep commas as tight clause marks.
 */
export function applyWebSpeechPausePreferences(text) {
    return softenTtsPunctuation(text)
        .replace(/\.\s*/g, '.\n\n')
        .replace(/,\s*/g, ', ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
