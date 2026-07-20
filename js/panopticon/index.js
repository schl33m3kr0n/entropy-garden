/** Panopticon — re-export barrel. */
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
    isChristmas,
    getPanopticonDayPart,
    getPanopticonClockAngles,
    isPanopticonMorningCoffeeTime,
    updatePanopticonVisibility,
    animatePanopticon,
    eyeAngle,
    eyeMode,
} from './eye.js';

export { playMeow } from './_runtime.js';
