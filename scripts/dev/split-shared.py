#!/usr/bin/env python3
"""Split js/core/shared.js into focused modules. Run from repo root."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "js" / "core" / "shared.js"
BACKUP = ROOT / "js" / "core" / "shared.js.monolith"


def read_lines() -> list[str]:
    if not BACKUP.exists():
        text = SRC.read_text(encoding="utf-8")
        BACKUP.write_text(text, encoding="utf-8")
    return BACKUP.read_text(encoding="utf-8").splitlines(keepends=True)


def slice_lines(lines: list[str], start: int, end: int) -> str:
    return "".join(lines[start - 1 : end])


def write_core(rel: str, header: str, body: str) -> None:
    out = ROOT / "js" / "core" / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    content = header.rstrip() + "\n\n" + body.strip() + "\n"
    out.write_text(content, encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)} ({len(content.splitlines())} lines)")


def write_js(rel: str, header: str, body: str) -> None:
    out = ROOT / "js" / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    content = header.rstrip() + "\n\n" + body.strip() + "\n"
    out.write_text(content, encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)} ({len(content.splitlines())} lines)")


def main() -> None:
    lines = read_lines()

    write_core(
        "dom/media.js",
        """/** Asset path helpers and lazy image loading. */
export const asset = (path) => `assets/${path}`;
export const sfxPath = (file) => asset(`audio/sfx/${file}`);
export const musicPath = (file) => asset(`audio/music/${encodeURIComponent(file)}`);
export const imgPath = (file) => asset(`img/${file}`);""",
        slice_lines(lines, 37, 49),
    )

    write_core(
        "audio/sfx.js",
        """/** Sound effects pool and playback helpers. */
import { sfxPath } from '../dom/media.js';""",
        slice_lines(lines, 51, 108) + slice_lines(lines, 516, 549),
    )

    write_core(
        "audio/bgm.js",
        """/** BGM playlist, buffering, marquee, and transport controls. */
import { musicPath } from '../dom/media.js';""",
        slice_lines(lines, 58, 63)
        + slice_lines(lines, 110, 514)
        + slice_lines(lines, 2153, 2168),
    )

    write_core(
        "lore/random.js",
        """/** Lore bag shuffle + panopticon comment timing helpers. */
import { isCorrupted } from '../state.js';""",
        slice_lines(lines, 556, 616),
    )

    write_core(
        "canvas-perf.js",
        """/** Matrix canvas refs, cipher glyph pools, perf tuning. */
import {
    FULL_MATRIX_CHARS,
    HEBREW_CIPHER_CHARS,
    CIPHER_ARABIC,
    CIPHER_TIBETAN,
    CIPHER_KANNADA,
    CIPHER_NUMERALS_LITE,
} from '../data/cipher-glyphs.data.js';
import {
    isIOS,
    isSafari,
} from './environment.js';""",
        slice_lines(lines, 618, 705),
    )

    write_js(
        "panopticon/dom.js",
        """/** Panopticon DOM element refs. */""",
        slice_lines(lines, 710, 721),
    )

    runtime_header = """/** Panopticon implementation (gaze, god mode, comments, sleep/wake). */
import {
    gardenHasStarted,
    isCorrupted,
    isSingularityActive,
    getCipherStage,
    fontSize,
    cellSize,
} from '../core/state.js';
import { perf } from '../core/canvas-perf.js';
import { pickOne, createBag, commentTtlMs } from '../core/lore/random.js';
import { sfx, playSound, playSoundOverlap } from '../core/audio/sfx.js';
import {
    panopticonCommentEl,
    panopticonEl,
    panopticonInnerEl,
    panopticonGazeEl,
    panopticonPupilEl,
    panopticonIrisOuterEl,
    panopticonIrisMidEl,
    panopticonGodPupilEl,
    panopticonLidEl,
    panopticonClipPathEl,
    panopticonRainbowGradEl,
    godModeRainbowGradEl,
} from './dom.js';

export let eyeAngle = 0;
export let eyeMode = 'idle';

export {
    panopticonCommentEl,
    panopticonEl,
    panopticonInnerEl,
    panopticonGazeEl,
    panopticonPupilEl,
    panopticonIrisOuterEl,
    panopticonIrisMidEl,
    panopticonGodPupilEl,
    panopticonLidEl,
    panopticonClipPathEl,
    panopticonRainbowGradEl,
    godModeRainbowGradEl,
} from './dom.js';"""

    write_js(
        "panopticon/_runtime.js",
        runtime_header,
        slice_lines(lines, 723, 2151)
        + """

export function playMeow() {
    triggerPanopticonCatEye(sfx.meow);
    playSound(sfx.meow);
}""",
    )

    write_js(
        "panopticon/god-mode.js",
        """/** God-mode triangle, ICO symbols, rainbow sync, lid choreography. */
export {
    syncGodModeTriangleSize,
    ICO_SYMBOLS,
    getIcoSymbolsForPlatform,
    syncPanopticonRainbow,
    setPanopticonGodMode,
} from './_runtime.js';""",
        "",
    )

    write_js(
        "panopticon/comments.js",
        """/** Panopticon speech bubble, idle/tab-return commentary, mute pref. */
export {
    isPanopticonMuted,
    syncPanopticonMuteButton,
    setPanopticonMuted,
    togglePanopticonMuted,
    showPanopticonComment,
    hidePanopticonComment,
    syncPanopticonCodeSequenceComments,
    startPanopticonIdleComments,
    resetPanopticonIdleCommentTimer,
    handlePanopticonVisibilityChange,
} from './_runtime.js';""",
        "",
    )

    write_js(
        "panopticon/eye.js",
        """/** Panopticon gaze animation, triggers, sleep/wake, cat-eye. */
export {
    triggerPanopticonReroll,
    triggerPanopticonEyeRoll,
    triggerPanopticonCenterStare,
    triggerPanopticonSleep,
    triggerPanopticonWake,
    triggerPanopticonCatEye,
    isApril420,
    updatePanopticonVisibility,
    animatePanopticon,
    eyeAngle,
    eyeMode,
} from './_runtime.js';""",
        "",
    )

    write_js(
        "panopticon/index.js",
        """/** Panopticon — re-export barrel. */
export {
    panopticonCommentEl,
    panopticonEl,
    panopticonInnerEl,
    panopticonGazeEl,
    panopticonPupilEl,
    panopticonIrisOuterEl,
    panopticonIrisMidEl,
    panopticonGodPupilEl,
    panopticonLidEl,
    panopticonClipPathEl,
    panopticonRainbowGradEl,
    godModeRainbowGradEl,
} from './dom.js';

export {
    syncGodModeTriangleSize,
    ICO_SYMBOLS,
    getIcoSymbolsForPlatform,
    syncPanopticonRainbow,
    setPanopticonGodMode,
} from './god-mode.js';

export {
    isPanopticonMuted,
    syncPanopticonMuteButton,
    setPanopticonMuted,
    togglePanopticonMuted,
    showPanopticonComment,
    hidePanopticonComment,
    syncPanopticonCodeSequenceComments,
    startPanopticonIdleComments,
    resetPanopticonIdleCommentTimer,
    handlePanopticonVisibilityChange,
} from './comments.js';

export {
    triggerPanopticonReroll,
    triggerPanopticonEyeRoll,
    triggerPanopticonCenterStare,
    triggerPanopticonSleep,
    triggerPanopticonWake,
    triggerPanopticonCatEye,
    isApril420,
    updatePanopticonVisibility,
    animatePanopticon,
    eyeAngle,
    eyeMode,
} from './eye.js';

export { playMeow } from './_runtime.js';""",
        "",
    )

    barrel = """/**
 * Shared utilities — re-export barrel (split from monolith shared.js).
 */
export {
    gardenHasStarted,
    gardenLoopActive,
    singularityAnimId,
    isCorrupted,
    isSingularityActive,
} from './state.js';

export {
    isIOS,
    isSafari,
    isRealIOSDevice,
    isSafariBrowser,
    isFileProtocol,
    isIosTabletScreen,
} from './environment.js';

export { asset, sfxPath, musicPath, imgPath, setImgWithFallback } from './dom/media.js';

export { sfx, playSound, warmSound, playSoundOverlap } from './audio/sfx.js';

export {
    BGM_TRACKS,
    BGM_TRACK_INFO,
    BGM_TRACK_TITLES,
    getBgmTrackTitle,
    applyTrackTitleMarquee,
    currentTrackIndex,
    getBgmTrack,
    prefetchLargeBgmTracks,
    bufferBgmTrack,
    playCurrentBgmTrack,
    pauseCurrentBgmTrack,
    playPrevTrack,
    playNextTrack,
    resetBgmToStart,
} from './audio/bgm.js';

export { shuffle, createBag, pickOne, pickMany, commentTtlMs } from './lore/random.js';

export {
    canvas,
    ctx,
    FULL_MATRIX_CHARS,
    chars,
    usesIosCipherGlyphs,
    usesLiteCipherWheelPaint,
    pickCipherChar,
    perf,
    applyPerfClass,
} from './canvas-perf.js';

export {
    eyeAngle,
    eyeMode,
    panopticonCommentEl,
    panopticonEl,
    panopticonInnerEl,
    panopticonGazeEl,
    panopticonPupilEl,
    panopticonIrisOuterEl,
    panopticonIrisMidEl,
    panopticonGodPupilEl,
    panopticonLidEl,
    panopticonClipPathEl,
    panopticonRainbowGradEl,
    godModeRainbowGradEl,
    syncGodModeTriangleSize,
    ICO_SYMBOLS,
    getIcoSymbolsForPlatform,
    isPanopticonMuted,
    syncPanopticonMuteButton,
    setPanopticonMuted,
    togglePanopticonMuted,
    showPanopticonComment,
    hidePanopticonComment,
    syncPanopticonCodeSequenceComments,
    startPanopticonIdleComments,
    resetPanopticonIdleCommentTimer,
    handlePanopticonVisibilityChange,
    triggerPanopticonReroll,
    triggerPanopticonEyeRoll,
    triggerPanopticonCenterStare,
    triggerPanopticonSleep,
    triggerPanopticonWake,
    triggerPanopticonCatEye,
    isApril420,
    updatePanopticonVisibility,
    syncPanopticonRainbow,
    setPanopticonGodMode,
    animatePanopticon,
    playMeow,
} from '../panopticon/index.js';
"""

    SRC.write_text(barrel, encoding="utf-8")
    print(f"updated {SRC.relative_to(ROOT)} (barrel)")


if __name__ == "__main__":
    main()
