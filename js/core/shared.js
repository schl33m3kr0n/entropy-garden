/**
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

export { sfx, playSound, playGlitchSound, pickGlitchSound, warmSound, playSoundOverlap } from './audio/sfx.js';

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
