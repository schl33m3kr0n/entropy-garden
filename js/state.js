// Mutable app state (live bindings for ES modules)
export let time = 0;
export let isCorrupted = false;
export let isRepulsing = false;
export let canvasDpr = 1;
export let fontSize = 16;
export let cellSize = 16;
export let cols;
export let rows;
export let gardenLoopActive = false;
export let gardenHasStarted = false;
export let gardenAnimId = null;
export let matrixFrameCount = 0;
export let needsFullRedraw = true;
export let isSingularityActive = false;
export let singularityAnimId = null;
export let cipherStage = 0;
export let isCipherSolved = false;
export let extraPizzas = 0;

export function incrementExtraPizzas() {
    extraPizzas++;
    return extraPizzas;
}
export let slotState = [null, null, null];
export let slotIndexes = [0, 0, 0];
export let currentPoemIndex = 0;
export let arcadeScore = 0;
export let currentSequenceIndex = 0;
export let activeUtterances = [];

export function setGardenHasStarted(value = true) {
    gardenHasStarted = value;
}

export function setGardenLoopActive(value) {
    gardenLoopActive = value;
}

export function setGardenAnimId(value) {
    gardenAnimId = value;
}

export function setMatrixFrameCount(value) {
    matrixFrameCount = value;
}

export function incrementMatrixFrameCount() {
    matrixFrameCount++;
}

export function setNeedsFullRedraw(value = true) {
    needsFullRedraw = value;
}

export function addTime(delta) {
    time += delta;
}

export function setCanvasMetrics(dpr, fs, cs, c, r) {
    canvasDpr = dpr;
    fontSize = fs;
    cellSize = cs;
    cols = c;
    rows = r;
}

export function toggleIsCorrupted() {
    isCorrupted = !isCorrupted;
    return isCorrupted;
}

export function setSingularityAnimId(value) {
    singularityAnimId = value;
}

export function setIsSingularityActive(value) {
    isSingularityActive = value;
}

export function setCurrentPoemIndex(value) {
    currentPoemIndex = value;
}

export function resetArtifactSlots() {
    slotState = [null, null, null];
    slotIndexes = [0, 0, 0];
}
