// Panopticon ping pong: almond lid → paddles, pupil → ball (iOS touch / desktop keyboard).

import {
    panopticonEl,
    panopticonGazeEl,
    panopticonInnerEl,
    perf,
    playSound,
    playSoundOverlap,
    warmSound,
    sfx,
    syncPanopticonCodeSequenceComments,
    isApril420,
} from '../core/shared.js';
import { isCorrupted, isSingularityActive } from '../core/state.js';
import { resizeCanvas } from '../core/canvas-resize.js';

const PADDLE_HALF = 8;
const BALL_R = 3.5;
const COURT_TOP = 10;
const COURT_BOTTOM = 90;
const COURT_CLIP_INSET = 1.15;
const PADDLE_EDGE_INSET = 3;
const MORPH_MS = 480;
const ACTIVATE_TAPS_REQUIRED = 3;
const ACTIVATE_WINDOW_MS = 4500;
const PADDLE_HOLD_SPEED = 1.08;
const MAX_BALL_SPEED = 1.78;
const LANDSCAPE_BALL_SPEED = 1.88;
const MIN_BALL_VX = 0.44;
const ARROW_SIZE = 54;
const ARROW_GAP = 16;
const ARROW_COURT_GAP = 10;
const COURT_W_RATIO = 0.82;
const EDGE_INSET = 10;
const FADE_MS = 480;
const EYE_TRANSITION_MS = 640;
const STRIP_MIN_H = 240;
const STRIP_H_RATIO = 1.65;
const EYE_COURT_GAP = 12;
const COMMENT_GAP = 6;
const EYE_TAP_ZONE_MIN_W = 84;
const EYE_TAP_ZONE_W_RATIO = 0.72;
const EYE_TAP_ZONE_MIN_H = 108;
const EYE_TAP_ZONE_H_RATIO = 1.55;
const EYE_TAP_ZONE_OUTSET = 1.05;
const MAX_PONG_GAZE = 13;
const DESKTOP_COURT_RADIUS = 14;
const DESKTOP_COURT_RADIUS_PX = 16;
const IOS_COURT_RADIUS = 14;
const IOS_COURT_RADIUS_PX = 18;
const DESKTOP_HUD_GAP = 18;
const SERVE_COUNTDOWN_MS = 900;
const RESERVE_AFTER_MISS_MS = 2000;
const PONG_ARM_HINT_IDLE_MS = 3000;
const PONG_QUIT_COMMENT = '[ press 0 to quit ]';

const useKeyboardControls = !perf.isIOS;

const KEY_HOLD = {
    KeyA: { side: 'left', dir: -1 },
    KeyD: { side: 'left', dir: 1 },
    KeyW: { side: 'left', dir: -1 },
    KeyS: { side: 'left', dir: 1 },
    ArrowLeft: { side: 'right', dir: -1 },
    ArrowRight: { side: 'right', dir: 1 },
};

const SIX_SEVEN_DANCE_MS = 2600;

let positionControlsRaf = null;
let panopticonPongInitialized = false;

function pokeUserActivity() {
    globalThis.gardenHooks?.resetIdleTimer?.();
}

let armingHintVisible = false;
let activationHintOwner = null;

const KEYBOARD_ARM_SEQUENCE = ['left', 'right', 'left', 'right', 'left', 'right'];
let keyboardArmIndex = 0;

const PONG_COMMENT_OPEN = [
    'entertain me.',
    'try not to bore the iris.',
    'i am always watching. especially now.',
    'paddle diplomacy begins.',
];

const PONG_COMMENT_TIED = [
    'dead heat. suspicious.',
    'symmetry. how quaint.',
    'neither of you is winning. classic.',
];

const PONG_COMMENT_CLOSE = [
    'one point. barely a thought.',
    'fragile lead. i\'ve seen empires built on less.',
    'the margin is thin. like your reflexes.',
];

const PONG_COMMENT_LEFT_LEAD = [
    'left paddle flexing. right paddle sulking.',
    'the west side remembers.',
    'left takes it. right will pretend not to care.',
];

const PONG_COMMENT_RIGHT_LEAD = [
    'right ascendant. left spiraling.',
    'eastward momentum. ominous.',
    'right scores. left blinks twice.',
];

const PONG_COMMENT_LEFT_RUN = [
    'left is hogging the narrative.',
    'at this rate left writes the lore.',
    'right paddle: decorative at this point.',
];

const PONG_COMMENT_RIGHT_RUN = [
    'right runs the simulation now.',
    'left paddle filing a complaint with god.',
    'a massacre, if we\'re being honest.',
];

const PONG_COMMENT_COMEBACK = [
    'oh. they\'re awake now.',
    'the underdog plot activates.',
    'suddenly competitive. how theatrical.',
];

const PONG_COMMENT_OPEN_CORRUPTED = [
    'two paddles. zero dignity.',
    'the iris expected a blood sport. it got this.',
    'perform for me. try not to whiff.',
    'corrupted mode and you still can\'t rally.',
    'balls are for paddling, not scratching.',
    'beer pong\'s at the other table.',
];

const PONG_COMMENT_TIED_CORRUPTED = [
    'tied. how on-brand for both of you.',
    'equal failure. heartwarming.',
    'deadlock of incompetence.',
    'neither paddle deserves the win. agreed.',
];

const PONG_COMMENT_CLOSE_CORRUPTED = [
    'one point. still pathetic.',
    'almost competitive. almost.',
    'this is getting embarrassing.',
    'a single goal ahead. don\'t celebrate yet.',
];

const PONG_COMMENT_LEFT_LEAD_CORRUPTED = [
    'left leads. right dissolves.',
    'west side cheating with confidence.',
    'left paddle bullying the plot.',
];

const PONG_COMMENT_RIGHT_LEAD_CORRUPTED = [
    'right leads. left evaporates.',
    'east wins the shame olympics.',
    'right paddle feasting on your reflexes.',
];

const PONG_COMMENT_LEFT_RUN_CORRUPTED = [
    'left is running away with your pride.',
    'this is getting embarrassing for the right paddle.',
    'right side: ornamental. left side: smug.',
    'left scores again. someone call a medic.',
];

const PONG_COMMENT_RIGHT_RUN_CORRUPTED = [
    'right is filleting the scoreboard.',
    'left paddle has entered a coma.',
    'a slaughter. i\'m not impressed, but i\'m watching.',
    'this is getting embarrassing for civilization.',
];

const PONG_COMMENT_COMEBACK_CORRUPTED = [
    'oh. the corpse twitched.',
    'comeback arc. still ugly.',
    'they remembered they had paddles. cute.',
    'suddenly alive. still losing my respect.',
    'okay forrest gump, you made your point.',
];

const RALLY_HIT_MIN = 8;
const EDGE_REL_THRESHOLD = 0.86;
const EDGE_COMMENT_CHANCE = 0.2;
const WHIFF_COMMENT_CHANCE = 0.5;
const MILESTONE_SCORES = new Set([7, 11, 15]);
const STRAIGHT_REL_THRESHOLD = 0.12;
const STRAIGHT_STREAK_MIN = 5;

const PONG_COMMENT_LONG_RALLY = [
    'actual skill. how rare.',
    'a real rally. shocking.',
];

const PONG_COMMENT_LONG_RALLY_CORRUPTED = [
    'actual skill. how rare.',
    'keep it up. the iris is almost entertained.',
];

const PONG_COMMENT_FIRST = [
    'first blood. the rest is downhill.',
    'a point exists now. progress.',
    'and so it begins.',
];

const PONG_COMMENT_FIRST_CORRUPTED = [
    'first point. only took you forever.',
    'one down, dignity already gone.',
    'blood in the water. finally.',
];

const PONG_COMMENT_MILESTONE = [
    'the scoreboard groans under the weight.',
    'quite the tally. someone is trying.',
    'numbers climbing. how ambitious.',
];

const PONG_COMMENT_MILESTONE_CORRUPTED = [
    'still going? touch grass.',
    'high score, low purpose.',
    'this rivalry has outlived its welcome.',
];

const PONG_COMMENT_WHIFF = [
    'you simply watched it leave.',
    'a noble statue impression.',
    'the paddle was decorative that round.',
];

const PONG_COMMENT_WHIFF_CORRUPTED = [
    'you blinked and lost. tragic.',
    'stood there like furniture.',
    'did the paddle file for divorce?',
];

const PONG_COMMENT_EDGE = [
    'edge of the paddle. edge of competence.',
    'a clutch flick. noted.',
    'barely. but i saw it.',
];

const PONG_COMMENT_EDGE_CORRUPTED = [
    'lucky flail. i\'ll allow it.',
    'accidental brilliance.',
    'even a broken paddle is right twice.',
];

const PONG_COMMENT_STRAIGHT = [
    'wtf.',
    'wtf. is this a screensaver?',
    'perfectly flat. perfectly pointless.',
];

const PONG_COMMENT_STRAIGHT_CORRUPTED = [
    'wtf.',
    'wtf. are you two even moving?',
    'a flatline. fitting.',
];

const PONG_COMMENT_HIGH = [
    'touchdown!',
    'am i supposed to follow the ball or the paddles?',
    'pong? more like... like... bong',
    'this shit\'s probably magic to one dimensional creatures',
    '???',
    'homerun!',
    'i ate too many cheez its before this game',
    'haha... balls',
];

const ARROW_SVG = {
    up: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="ios-pong-ring" cx="24" cy="24" r="21"/><path class="ios-pong-chevron" d="M24 12 L34 31 H14 Z"/></svg>`,
    down: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="ios-pong-ring" cx="24" cy="24" r="21"/><path class="ios-pong-chevron" d="M24 36 L14 17 H34 Z"/></svg>`,
};

let panelLeftEl;
let panelRightEl;
let stripLeftEl;
let stripRightEl;
let courtOverlayEl;
let commentEl;
let quitBtnEl;
let startHintEl;
let scoreboardEl;
let scoreLeftEl;
let scoreRightEl;
let paddleLeftEl;
let paddleRightEl;
let ballEl;
let courtBoundaryEl;
let courtFillEl;
let courtClipRectEl;
let courtPlayLayerEl;
let pongGroupEl;

let active = false;
let fading = false;
let gardenLoopPausedForPong = false;
let paused = false;
let pauseState = null;
let eyeReturning = false;
let serveCountdownActive = false;
let pendingReserviceTowardBottom = null;
let morphStart = 0;
let animId = null;
let lastTick = 0;
let armTimeout = null;
let hintIdleTimeout = null;
let leftTapCount = 0;
let rightTapCount = 0;

let ball = { x: 50, y: 50, vx: 0.26, vy: 0.38 };
let courtViewW = 100;
let leftX = 50;
let rightX = 50;
let leftTarget = 50;
let rightTarget = 50;
let sixSevenUntil = 0;
let scoreLeft = 0;
let scoreRight = 0;
let rallyHits = 0;
let rallyCommentShown = false;
let straightHitStreak = 0;
let straightCommentShown = false;
const holdInput = { left: 0, right: 0 };
let pongGazeX = 0;
let pongGazeY = 0;
let commentTimeout = null;
let serveCountdownTimer = null;
let reserviceTimer = null;
let ballHeld = false;

function pickFrom(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
}

/** Corrupted mode: state flag + body class (CSS toggle). */
function isPongCorruptedMode() {
    return isCorrupted || document.body.classList.contains('corrupted');
}

function pickPongComment(safePool, corruptedPool) {
    if (isApril420() && PONG_COMMENT_HIGH.length) return pickFrom(PONG_COMMENT_HIGH);
    if (isPongCorruptedMode() && corruptedPool?.length) return pickFrom(corruptedPool);
    return pickFrom(safePool);
}

function isSixSevenScore() {
    return (scoreLeft === 6 && scoreRight === 7) || (scoreLeft === 7 && scoreRight === 6);
}

function isSixSevenDanceActive(now = performance.now()) {
    return sixSevenUntil > now;
}

function applySixSevenPaddleDance(now) {
    const wobble = Math.sin(now * 0.022);
    const bottomX = courtViewW * (0.6 + wobble * 0.04);
    const topX = courtViewW * (0.7 + Math.cos(now * 0.022) * 0.04);
    leftX = leftTarget = bottomX;
    rightX = rightTarget = topX;
}

function resetRally() {
    rallyHits = 0;
    rallyCommentShown = false;
    straightHitStreak = 0;
    straightCommentShown = false;
}

function noteRallyHit(rel = 1) {
    rallyHits++;

    const absRel = Math.abs(rel);
    if (absRel < STRAIGHT_REL_THRESHOLD) straightHitStreak++;
    else straightHitStreak = 0;

    // Near-flat volley for several straight returns — "wtf".
    if (straightHitStreak >= STRAIGHT_STREAK_MIN && !straightCommentShown) {
        straightCommentShown = true;
        rallyCommentShown = true;
        showPongComment(pickPongComment(PONG_COMMENT_STRAIGHT, PONG_COMMENT_STRAIGHT_CORRUPTED));
        return;
    }

    if (rallyCommentShown) return;

    if (rallyHits >= RALLY_HIT_MIN) {
        rallyCommentShown = true;
        showPongComment(pickPongComment(PONG_COMMENT_LONG_RALLY, PONG_COMMENT_LONG_RALLY_CORRUPTED));
        return;
    }

    if (absRel > EDGE_REL_THRESHOLD && Math.random() < EDGE_COMMENT_CHANCE) {
        rallyCommentShown = true;
        showPongComment(pickPongComment(PONG_COMMENT_EDGE, PONG_COMMENT_EDGE_CORRUPTED));
    }
}

function scoreComment(scoringSide, diffBefore, hitsThisRally = 0) {
    const diff = scoreLeft - scoreRight;
    const absDiff = Math.abs(diff);
    const total = scoreLeft + scoreRight;
    const leaderScore = Math.max(scoreLeft, scoreRight);

    if (total === 1) {
        return pickPongComment(PONG_COMMENT_FIRST, PONG_COMMENT_FIRST_CORRUPTED);
    }

    if (MILESTONE_SCORES.has(leaderScore)) {
        return pickPongComment(PONG_COMMENT_MILESTONE, PONG_COMMENT_MILESTONE_CORRUPTED);
    }

    if (hitsThisRally === 0 && Math.random() < WHIFF_COMMENT_CHANCE) {
        return pickPongComment(PONG_COMMENT_WHIFF, PONG_COMMENT_WHIFF_CORRUPTED);
    }

    if (scoreLeft === scoreRight) {
        return pickPongComment(PONG_COMMENT_TIED, PONG_COMMENT_TIED_CORRUPTED);
    }

    if (absDiff === 1) {
        return pickPongComment(PONG_COMMENT_CLOSE, PONG_COMMENT_CLOSE_CORRUPTED);
    }

    const wasTrailing =
        (scoringSide === 'left' && diffBefore < 0) || (scoringSide === 'right' && diffBefore > 0);
    if (wasTrailing && absDiff < Math.abs(diffBefore)) {
        return pickPongComment(PONG_COMMENT_COMEBACK, PONG_COMMENT_COMEBACK_CORRUPTED);
    }

    if (absDiff >= 4) {
        return diff > 0
            ? pickPongComment(PONG_COMMENT_LEFT_RUN, PONG_COMMENT_LEFT_RUN_CORRUPTED)
            : pickPongComment(PONG_COMMENT_RIGHT_RUN, PONG_COMMENT_RIGHT_RUN_CORRUPTED);
    }

    return diff > 0
        ? pickPongComment(PONG_COMMENT_LEFT_LEAD, PONG_COMMENT_LEFT_LEAD_CORRUPTED)
        : pickPongComment(PONG_COMMENT_RIGHT_LEAD, PONG_COMMENT_RIGHT_LEAD_CORRUPTED);
}

function showPongComment(text, { persist = false, ttlMs = 3400 } = {}) {
    if (!commentEl || !text) return;
    commentEl.textContent = text;
    commentEl.classList.add('visible');
    clearTimeout(commentTimeout);
    if (!persist) {
        commentTimeout = setTimeout(() => {
            commentEl?.classList.remove('visible');
        }, ttlMs);
    }
}

function hidePongComment() {
    clearTimeout(commentTimeout);
    commentEl?.classList.remove('visible');
}

function clearServeCountdown() {
    clearTimeout(serveCountdownTimer);
    serveCountdownTimer = null;
    serveCountdownActive = false;
    if (!reserviceTimer) ballHeld = false;
}

function clearReserviceDelay() {
    clearTimeout(reserviceTimer);
    reserviceTimer = null;
    pendingReserviceTowardBottom = null;
    if (!serveCountdownTimer) ballHeld = false;
}

function enableEyeMoveAnim() {
    panopticonEl?.classList.add('eye-move-anim');
}

function disableEyeMoveAnim() {
    panopticonEl?.classList.remove('eye-move-anim');
}

function pinEyeToCurrentFrame() {
    if (!panopticonEl) return;
    const rect = panopticonEl.getBoundingClientRect();
    panopticonEl.style.top = `${rect.top}px`;
    panopticonEl.style.left = `${rect.left}px`;
    panopticonEl.style.width = `${rect.width}px`;
    panopticonEl.style.height = `${rect.height}px`;
    panopticonEl.style.transform = 'none';
}

function getGardenEyeMetrics() {
    const size = Math.min(Math.max(110, window.innerWidth * 0.16), 190);
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.5;
    return {
        top: cy - size * 0.5,
        left: cx - size * 0.5,
        size,
    };
}

function transitionEyeToReturnHome() {
    return new Promise((resolve) => {
        if (!panopticonEl) {
            resolve();
            return;
        }

        enableEyeMoveAnim();
        eyeReturning = true;
        applyEyePosition(getGardenEyeMetrics());

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            panopticonEl.removeEventListener('transitionend', onTransitionEnd);
            clearTimeout(fallback);
            resolve();
        };

        const onTransitionEnd = (event) => {
            if (event.target !== panopticonEl) return;
            if (event.propertyName === 'top' || event.propertyName === 'left') finish();
        };

        panopticonEl.addEventListener('transitionend', onTransitionEnd);
        const fallback = setTimeout(finish, EYE_TRANSITION_MS + 80);
    });
}

function parkBallForCountdown() {
    ball.x = courtCenterX();
    const span = courtPlayBottom() - courtPlayTop();
    ball.y = courtPlayTop() + span * 0.5;
    ball.vx = 0;
    ball.vy = 0;
    syncBallEl();
}

function showCountdownComment(n) {
    const text = useKeyboardControls
        ? `${n}\n${PONG_QUIT_COMMENT}`
        : n;
    showPongComment(text, { persist: true });
}

function startServeCountdown() {
    clearServeCountdown();
    clearReserviceDelay();
    serveCountdownActive = true;
    ballHeld = true;
    parkBallForCountdown();

    const ticks = ['3', '2', '1'];
    let step = 0;
    showCountdownComment(ticks[0]);

    const advance = () => {
        step += 1;
        if (step < ticks.length) {
            showCountdownComment(ticks[step]);
            serveCountdownTimer = setTimeout(advance, SERVE_COUNTDOWN_MS);
            return;
        }

        serveCountdownTimer = setTimeout(() => {
            serveCountdownActive = false;
            ballHeld = false;
            serveBall();
            if (useKeyboardControls) {
                hidePongComment();
            } else {
                showPongComment(pickPongComment(PONG_COMMENT_OPEN, PONG_COMMENT_OPEN_CORRUPTED));
            }
        }, SERVE_COUNTDOWN_MS);
    };

    serveCountdownTimer = setTimeout(advance, SERVE_COUNTDOWN_MS);
}

function paddleBottomY() {
    return courtPlayBottom() - PADDLE_EDGE_INSET;
}

function paddleTopY() {
    return courtPlayTop() + PADDLE_EDGE_INSET;
}

function courtCenterX() {
    return courtViewW * 0.5;
}

function courtPlayTop() {
    return useKeyboardControls ? 0 : COURT_TOP;
}

function courtPlayBottom() {
    return useKeyboardControls ? 100 : COURT_BOTTOM;
}

function courtClipInset() {
    return useKeyboardControls ? 0.35 : COURT_CLIP_INSET;
}

function courtBoundaryInset() {
    return useKeyboardControls ? 1.25 : 0;
}

function syncCourtBoundary() {
    if (!courtBoundaryEl) return;
    const top = courtPlayTop();
    const bottom = courtPlayBottom();
    const edge = courtBoundaryInset();
    const playH = bottom - top;
    const x = edge;
    const y = top + edge;
    const w = Math.max(0, courtViewW - edge * 2);
    const h = Math.max(0, playH - edge * 2);

    courtBoundaryEl.setAttribute('x', String(x));
    courtBoundaryEl.setAttribute('y', String(y));
    courtBoundaryEl.setAttribute('width', String(w));
    courtBoundaryEl.setAttribute('height', String(h));

    if (courtFillEl) {
        courtFillEl.setAttribute('x', String(x));
        courtFillEl.setAttribute('y', String(y));
        courtFillEl.setAttribute('width', String(w));
        courtFillEl.setAttribute('height', String(h));
    }

    if (courtClipRectEl) {
        const inset = courtClipInset();
        courtClipRectEl.setAttribute('x', String(x + inset));
        courtClipRectEl.setAttribute('y', String(y + inset));
        courtClipRectEl.setAttribute('width', String(Math.max(0, w - inset * 2)));
        courtClipRectEl.setAttribute('height', String(Math.max(0, h - inset * 2)));
    }
}

function syncCourtViewBox(pixelW, pixelH) {
    if (!courtOverlayEl || !pixelH) return;
    const nextViewW = Math.max(100, (pixelW / pixelH) * 100);
    if (active && courtViewW > 0 && nextViewW !== courtViewW) {
        const ratio = nextViewW / courtViewW;
        ball.x *= ratio;
        ball.vx *= ratio;
        leftX *= ratio;
        rightX *= ratio;
        leftTarget *= ratio;
        rightTarget *= ratio;
    }
    courtViewW = nextViewW;
    courtOverlayEl.setAttribute('viewBox', `0 0 ${courtViewW} 100`);
    syncCourtBoundary();
    syncPaddles(PADDLE_HALF);
}

function getHorizontalLayout() {
    const landscape = window.innerWidth > window.innerHeight;
    const courtRatio = landscape ? 0.68 : COURT_W_RATIO;

    if (useKeyboardControls) {
        const courtW = Math.max(
            220,
            Math.min(window.innerWidth * courtRatio, window.innerWidth - 2 * EDGE_INSET),
        );
        const courtLeft = (window.innerWidth - courtW) * 0.5;
        return { courtLeft, courtW, panelLeft: 0, panelRight: 0 };
    }

    const arrowCol = ARROW_SIZE + ARROW_COURT_GAP;
    const maxCourtW = window.innerWidth - 2 * (EDGE_INSET + arrowCol);
    const courtW = Math.max(220, Math.min(window.innerWidth * courtRatio, maxCourtW));
    const groupW = courtW + 2 * arrowCol;
    const groupLeft = (window.innerWidth - groupW) * 0.5;

    return {
        courtLeft: groupLeft + arrowCol,
        courtW,
        panelLeft: groupLeft,
        panelRight: groupLeft + arrowCol + courtW + ARROW_COURT_GAP,
    };
}

function getViewportHeight() {
    const vv = window.visualViewport;
    if (perf.isIOS && vv?.height) return vv.height;
    return window.innerHeight;
}

function fitPongStack({
    landscape,
    eyeSize,
    commentH,
    eyeGap,
    commentGap,
    scoreboardGap,
    scoreboardH,
    courtH,
    availH,
    safeTop,
    safeBottom,
}) {
    let court = courtH;
    let stackH = eyeSize + eyeGap + commentH + commentGap + court + scoreboardGap + scoreboardH;
    let stackTop = landscape
        ? safeTop + 6
        : Math.max(72, (availH - stackH) * 0.38);

    if (stackTop + stackH > availH - safeBottom) {
        court -= stackTop + stackH - (availH - safeBottom);
        court = Math.max(landscape ? 110 : 160, court);
        stackH = eyeSize + eyeGap + commentH + commentGap + court + scoreboardGap + scoreboardH;
        stackTop = Math.max(safeTop, availH - safeBottom - stackH);
    }

    return { courtH: court, stackTop };
}

function getCourtHeight() {
    const landscape = window.innerWidth > window.innerHeight;
    const availH = getViewportHeight();
    return landscape
        ? Math.min(Math.max(availH * 0.5, 130), 200)
        : Math.min(Math.max(availH * 0.46, 236), 330);
}

function positionScoreboard(layout) {
    if (!scoreboardEl || !layout?.scoreboard) return;
    scoreboardEl.style.top = `${layout.scoreboard.top}px`;
    scoreboardEl.style.left = `${layout.scoreboard.left}px`;
    scoreboardEl.style.transform = 'translateX(-50%)';
}

function syncCourtCornerRadius() {
    const roundCourt = useKeyboardControls || perf.isIOS;
    if (!roundCourt) {
        [courtFillEl, courtBoundaryEl, courtClipRectEl].forEach((el) => {
            el?.removeAttribute('rx');
            el?.removeAttribute('ry');
        });
        if (courtOverlayEl) courtOverlayEl.style.borderRadius = '';
        return;
    }

    const radiusPx = perf.isIOS ? IOS_COURT_RADIUS_PX : DESKTOP_COURT_RADIUS_PX;
    const radiusUnits = perf.isIOS ? IOS_COURT_RADIUS : DESKTOP_COURT_RADIUS;
    const rect = courtOverlayEl?.getBoundingClientRect();
    const r = rect?.height
        ? (radiusPx / rect.height) * 100
        : radiusUnits;

    [courtFillEl, courtBoundaryEl, courtClipRectEl].forEach((el) => {
        if (!el) return;
        el.setAttribute('rx', String(r));
        el.setAttribute('ry', String(r));
    });
    if (courtOverlayEl) {
        courtOverlayEl.style.borderRadius = `${radiusPx}px`;
        courtOverlayEl.style.overflow = 'hidden';
    }
}

function applyCourtPixelRect(court) {
    if (!courtOverlayEl) return;
    courtOverlayEl.style.left = `${court.left}px`;
    courtOverlayEl.style.top = `${court.top}px`;
    courtOverlayEl.style.width = `${court.width}px`;
    courtOverlayEl.style.height = `${court.height}px`;
    syncCourtCornerRadius();
    syncCourtViewBox(court.width, court.height);
    syncBallEl();
}

function updatePongGaze() {
    if (!panopticonGazeEl || !panopticonEl || !courtOverlayEl) return;

    const court = courtOverlayEl.getBoundingClientRect();
    const eyeRect = panopticonEl.getBoundingClientRect();
    if (!court.width || !eyeRect.width) return;

    const eyeCx = eyeRect.left + eyeRect.width * 0.5;
    const eyeCy = eyeRect.top + eyeRect.height * 0.5;
    const ballCx = court.left + (ball.x / courtViewW) * court.width;
    const ballCy = court.top + (ball.y / 100) * court.height;

    const dx = ballCx - eyeCx;
    const dy = ballCy - eyeCy;
    const len = Math.hypot(dx, dy) || 1;
    const influence = Math.min(1, len / (court.width * 0.45));
    const targetX = (dx / len) * MAX_PONG_GAZE * influence;
    const targetY = (dy / len) * MAX_PONG_GAZE * influence;
    const ease = perf.prefersReducedMotion ? 0.35 : 0.24;

    pongGazeX += (targetX - pongGazeX) * ease;
    pongGazeY += (targetY - pongGazeY) * ease;
    panopticonInnerEl && (panopticonInnerEl.style.transform = '');
    panopticonGazeEl.setAttribute('transform', `translate(${pongGazeX}, ${pongGazeY})`);
}

function resetPongGaze() {
    pongGazeX = 0;
    pongGazeY = 0;
    panopticonGazeEl?.setAttribute('transform', 'translate(0, 0)');
}

function resetEyePosition() {
    if (!panopticonEl) return;
    panopticonEl.style.removeProperty('top');
    panopticonEl.style.removeProperty('left');
    panopticonEl.style.removeProperty('width');
    panopticonEl.style.removeProperty('height');
    panopticonEl.style.removeProperty('transform');
}

function applyEyePosition(eye) {
    if (!panopticonEl) return;
    panopticonEl.style.top = `${eye.top}px`;
    panopticonEl.style.left = `${eye.left}px`;
    panopticonEl.style.width = `${eye.size}px`;
    panopticonEl.style.height = `${eye.size}px`;
    panopticonEl.style.transform = 'none';
}

function getHudStackTop() {
    const hud = document.getElementById('hud');
    if (!hud) return 96;
    const rect = hud.getBoundingClientRect();
    if (rect.height < 1) return 96;
    return rect.bottom + DESKTOP_HUD_GAP;
}

function getDesktopPongLayout() {
    const availH = getViewportHeight();
    const stackTop = getHudStackTop();
    const safeBottom = 72;
    const scoreboardH = 36;
    const scoreboardGap = 10;
    const commentH = 22;
    const commentGap = 6;
    const eyeGap = 10;
    const eyeSize = Math.min(Math.max(56, window.innerWidth * 0.08), 88);
    const stackAboveCourt = eyeSize + eyeGap + commentH + commentGap;
    const stackBelowCourt = scoreboardGap + scoreboardH + 36;
    const maxCourtW = window.innerWidth - 2 * EDGE_INSET;
    const maxCourtH = availH - stackTop - stackAboveCourt - stackBelowCourt - safeBottom;
    const courtSize = Math.max(
        220,
        Math.min(maxCourtW * 0.58, maxCourtH, 400),
    );
    const courtLeft = (window.innerWidth - courtSize) * 0.5;
    const courtTop = stackTop + stackAboveCourt;
    const eyeLeft = courtLeft + courtSize * 0.5 - eyeSize * 0.5;

    return {
        court: { left: courtLeft, top: courtTop, width: courtSize, height: courtSize },
        panels: { left: 0, right: 0, top: 0 },
        eye: { top: stackTop, left: eyeLeft, size: eyeSize },
        comment: {
            top: stackTop + eyeSize + eyeGap,
            left: courtLeft,
            width: courtSize,
        },
        scoreboard: {
            top: courtTop + courtSize + scoreboardGap,
            left: courtLeft + courtSize * 0.5,
        },
    };
}

function getPongLayout() {
    if (useKeyboardControls) return getDesktopPongLayout();

    const landscape = window.innerWidth > window.innerHeight;
    const { courtLeft, courtW, panelLeft, panelRight } = getHorizontalLayout();
    const availH = getViewportHeight();
    const safeTop = 10;
    const safeBottom = landscape ? 16 : 24;
    const scoreboardH = 36;
    const scoreboardGap = 8;
    const commentH = landscape ? 16 : 22;
    const eyeGap = landscape ? 6 : EYE_COURT_GAP;
    const commentGap = landscape ? 4 : COMMENT_GAP;
    const eyeSize = landscape
        ? Math.min(Math.max(48, window.innerWidth * 0.07), 68)
        : Math.min(Math.max(88, window.innerWidth * 0.21), 128);
    const { courtH, stackTop } = fitPongStack({
        landscape,
        eyeSize,
        commentH,
        eyeGap,
        commentGap,
        scoreboardGap,
        scoreboardH,
        courtH: getCourtHeight(),
        availH,
        safeTop,
        safeBottom,
    });
    const arrowStackH = ARROW_SIZE * 2 + ARROW_GAP;
    const courtTop = stackTop + eyeSize + eyeGap + commentH + commentGap;
    const eyeLeft = courtLeft + courtW * 0.5 - eyeSize * 0.5;

    return {
        court: { left: courtLeft, top: courtTop, width: courtW, height: courtH },
        panels: {
            left: panelLeft,
            right: panelRight,
            top: courtTop + (courtH - arrowStackH) * 0.5,
        },
        eye: { top: stackTop, left: eyeLeft, size: eyeSize },
        comment: {
            top: stackTop + eyeSize + eyeGap,
            left: courtLeft,
            width: courtW,
        },
        scoreboard: {
            top: courtTop + courtH + scoreboardGap,
            left: courtLeft + courtW * 0.5,
        },
    };
}

function clampPaddleX(x) {
    const left = PADDLE_EDGE_INSET + PADDLE_HALF;
    const right = courtViewW - PADDLE_EDGE_INSET - PADDLE_HALF;
    return Math.max(left, Math.min(right, x));
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function setPaddleHorizontal(el, y, cx, half) {
    if (!el) return;
    el.setAttribute('x1', String(cx - half));
    el.setAttribute('x2', String(cx + half));
    el.setAttribute('y1', String(y));
    el.setAttribute('y2', String(y));
}

function syncPaddles(half) {
    setPaddleHorizontal(paddleLeftEl, paddleBottomY(), leftX, half);
    setPaddleHorizontal(paddleRightEl, paddleTopY(), rightX, half);
}

/** Counteract court SVG stretch so the ball stays a screen-space circle. */
function ballUserSpaceStretchY() {
    if (!courtOverlayEl || !courtViewW) return 1;
    const rect = courtOverlayEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return 1;
    const scaleX = rect.width / courtViewW;
    const scaleY = rect.height / 100;
    return scaleX / scaleY;
}

function syncBallEl() {
    if (!ballEl) return;
    const cx = ball.x;
    const cy = ball.y;
    ballEl.setAttribute('cx', String(cx));
    ballEl.setAttribute('cy', String(cy));

    const stretchY = ballUserSpaceStretchY();
    if (Math.abs(stretchY - 1) < 0.015) {
        ballEl.removeAttribute('transform');
        return;
    }
    ballEl.setAttribute(
        'transform',
        `translate(${cx} ${cy}) scale(1 ${stretchY}) translate(${-cx} ${-cy})`,
    );
}

function updateScoreboard() {
    if (scoreLeftEl) scoreLeftEl.textContent = String(scoreLeft);
    if (scoreRightEl) scoreRightEl.textContent = String(scoreRight);
}

function dropScoreboard() {
    if (!scoreboardEl) return;
    scoreboardEl.classList.remove('score-drop');
    void scoreboardEl.offsetWidth;
    scoreboardEl.classList.add('score-drop', 'visible');
}

function isLandscapePong() {
    return window.innerWidth > window.innerHeight;
}

function pongSpeedScale() {
    return isLandscapePong() ? LANDSCAPE_BALL_SPEED : 1;
}

function getMaxBallSpeed() {
    return MAX_BALL_SPEED * pongSpeedScale();
}

function getMinBallVx() {
    return MIN_BALL_VX * pongSpeedScale();
}

function ballSpeed() {
    return Math.hypot(ball.vx, ball.vy);
}

function capBallSpeed() {
    const maxSpeed = getMaxBallSpeed();
    const speed = ballSpeed();
    if (speed <= maxSpeed) return;
    const scale = maxSpeed / speed;
    ball.vx *= scale;
    ball.vy *= scale;
}

function serveBall(towardBottom = Math.random() < 0.5) {
    resetRally();
    const span = courtViewW - (PADDLE_EDGE_INSET + PADDLE_HALF) * 2;
    ball.x = (PADDLE_EDGE_INSET + PADDLE_HALF) + span * (0.35 + Math.random() * 0.3);
    ball.y = courtPlayTop() + (courtPlayBottom() - courtPlayTop()) * 0.5;
    const speed = (perf.prefersReducedMotion ? 0.52 : 0.72) * pongSpeedScale();
    ball.vy = towardBottom ? speed : -speed;
    ball.vx = (Math.random() - 0.5) * speed * 1.2;
    capBallSpeed();
    syncBallEl();
}

function scorePoint(side) {
    const hitsThisRally = rallyHits;
    resetRally();
    const diffBefore = scoreLeft - scoreRight;
    if (side === 'left') scoreLeft++;
    else scoreRight++;
    updateScoreboard();
    dropScoreboard();
    showPongComment(scoreComment(side, diffBefore, hitsThisRally));
    if (isSixSevenScore()) {
        sixSevenUntil = performance.now() + SIX_SEVEN_DANCE_MS;
        playSound(sfx.sixSeven);
    } else {
        playSound(sfx.gameStart);
    }
    scheduleReservice(side === 'right');
}

function scheduleReservice(towardBottom) {
    clearReserviceDelay();
    pendingReserviceTowardBottom = towardBottom;
    ballHeld = true;
    ball.vx = 0;
    ball.vy = 0;
    parkBallForCountdown();
    syncBallEl();
    reserviceTimer = setTimeout(() => {
        reserviceTimer = null;
        pendingReserviceTowardBottom = null;
        ballHeld = false;
        serveBall(towardBottom);
    }, RESERVE_AFTER_MISS_MS);
}

function collideWall() {
    const xMin = BALL_R;
    const xMax = courtViewW - BALL_R;
    let bounced = false;

    if (ball.x < xMin) {
        ball.x = xMin + (xMin - ball.x);
        ball.vx = Math.abs(ball.vx) * 1.01;
        bounced = true;
    } else if (ball.x > xMax) {
        ball.x = xMax - (ball.x - xMax);
        ball.vx = -Math.abs(ball.vx) * 1.01;
        bounced = true;
    }

    ball.x = clamp(ball.x, xMin, xMax);
    if (bounced) {
        straightHitStreak = 0;
        playSoundOverlap(sfx.pop);
    }
}

function collidePaddle(paddleY, paddleX, isBottom) {
    if (isBottom && ball.vy <= 0) return false;
    if (!isBottom && ball.vy >= 0) return false;

    const left = paddleX - PADDLE_HALF;
    const right = paddleX + PADDLE_HALF;
    const reach = BALL_R + 1.2;

    if (Math.abs(ball.y - paddleY) > reach) return false;
    if (ball.x + BALL_R < left || ball.x - BALL_R > right) return false;

    ball.y = isBottom ? paddleY - reach : paddleY + reach;

    const rel = clamp((ball.x - paddleX) / PADDLE_HALF, -1, 1);
    const speed = Math.min(ballSpeed() * 1.08, getMaxBallSpeed());
    const angle = rel * 0.82;

    ball.vy = (isBottom ? -1 : 1) * speed * Math.cos(angle);
    ball.vx = speed * Math.sin(angle);

    if (Math.abs(ball.vy) < getMinBallVx()) {
        ball.vy = isBottom ? -getMinBallVx() : getMinBallVx();
    }

    capBallSpeed();
    playSoundOverlap(sfx.hit);
    noteRallyHit(rel);
    return true;
}

function isExitingTop() {
    return ball.vy < 0 && ball.y <= paddleTopY() + BALL_R;
}

function isExitingBottom() {
    return ball.vy > 0 && ball.y >= paddleBottomY() - BALL_R;
}

function inGoalRun() {
    return isExitingTop() || isExitingBottom();
}

function constrainBallY() {
    if (inGoalRun()) return;
    const yMin = courtPlayTop() + BALL_R;
    const yMax = courtPlayBottom() - BALL_R;
    ball.y = clamp(ball.y, yMin, yMax);
}

function stepBall(dt) {
    const moveDist = ballSpeed() * dt;
    const steps = Math.min(6, Math.max(2, Math.ceil(moveDist / 3.2)));
    const subDt = dt / steps;

    for (let i = 0; i < steps; i++) {
        ball.x += ball.vx * subDt;
        ball.y += ball.vy * subDt;
        collideWall();
        collidePaddle(paddleBottomY(), leftX, true);
        collidePaddle(paddleTopY(), rightX, false);
        constrainBallY();
    }
}

function applyHoldInput(dt) {
    if (holdInput.left) {
        const next = clampPaddleX(leftX + holdInput.left * PADDLE_HOLD_SPEED * dt);
        leftX = leftTarget = next;
    }
    if (holdInput.right) {
        const next = clampPaddleX(rightX + holdInput.right * PADDLE_HOLD_SPEED * dt);
        rightX = rightTarget = next;
    }
}

function clearHoldInput() {
    holdInput.left = 0;
    holdInput.right = 0;
    if (panelLeftEl || panelRightEl) {
        document.querySelectorAll('.ios-pong-arrow.is-held').forEach((el) => el.classList.remove('is-held'));
    }
}

function tickPong(now) {
    if (!active) return;

    const dt = lastTick ? Math.min(32, now - lastTick) / 16.67 : 1;
    lastTick = now;

    const morphT = Math.min(1, (now - morphStart) / MORPH_MS);
    const half = PADDLE_HALF * morphT;

    if (isSixSevenDanceActive(now)) {
        applySixSevenPaddleDance(now);
    } else if (!paused && morphT >= 1 && (holdInput.left || holdInput.right)) {
        applyHoldInput(dt);
    } else if (!paused) {
        leftX += (leftTarget - leftX) * (0.22 * dt);
        rightX += (rightTarget - rightX) * (0.22 * dt);
    }

    syncPaddles(half);

    if (morphT < 1) {
        updatePongGaze();
        animId = requestAnimationFrame(tickPong);
        return;
    }

    if (paused || ballHeld) {
        syncBallEl();
        updatePongGaze();
        animId = requestAnimationFrame(tickPong);
        return;
    }

    stepBall(dt);

    if (ball.y - BALL_R < courtPlayTop()) {
        scorePoint('left');
    } else if (ball.y + BALL_R > courtPlayBottom()) {
        scorePoint('right');
    }

    syncBallEl();
    updatePongGaze();
    animId = requestAnimationFrame(tickPong);
}

function startPongLoop() {
    if (animId) cancelAnimationFrame(animId);
    lastTick = 0;
    animId = requestAnimationFrame(tickPong);
}

function resetArming() {
    leftTapCount = 0;
    rightTapCount = 0;
    keyboardArmIndex = 0;
    clearTimeout(armTimeout);
    armTimeout = null;
    clearTimeout(hintIdleTimeout);
    hintIdleTimeout = null;
    if (activationHintOwner === 'pong' && !active && !fading) {
        updateActivationHintHtml('pong', buildPongHintHtml(0));
    }
    syncPanopticonCodeSequenceComments();
}

function dismissIdleArmingHint() {
    if (activationHintOwner !== 'pong' || active || fading || keyboardArmIndex > 0) return;
    cancelPongArming();
}

function tryActivateFromTaps() {
    if (active) return;
    if (leftTapCount < ACTIVATE_TAPS_REQUIRED || rightTapCount < ACTIVATE_TAPS_REQUIRED) return;
    resetArming();
    activatePong();
}

function onEyeSideTap(side) {
    if (active || fading || !panopticonEl?.classList.contains('visible')) return;

    if (side === 'left') leftTapCount++;
    else rightTapCount++;

    tryActivateFromTaps();
    clearTimeout(armTimeout);
    armTimeout = setTimeout(resetArming, ACTIVATE_WINDOW_MS);
    syncPanopticonCodeSequenceComments();
}

function buildPongHintHtml(confirmed = keyboardArmIndex) {
    const parts = KEYBOARD_ARM_SEQUENCE.map((side, i) => {
        const cls = i < confirmed ? 'pong-hint-arrow is-confirmed' : 'pong-hint-arrow';
        const glyph = side === 'left' ? '←' : '→';
        return `<span class="${cls}">${glyph}</span>`;
    });
    return parts.join(' ');
}

function positionStartHint() {
    if (!startHintEl || !panopticonEl) return;
    const rect = panopticonEl.getBoundingClientRect();
    startHintEl.style.top = `${rect.bottom + 10}px`;
    startHintEl.style.left = `${rect.left + rect.width * 0.5}px`;
}

export function dismissActivationHint(owner, force = false) {
    if (!startHintEl) return;
    if (!force && owner && activationHintOwner !== owner) return;

    activationHintOwner = null;
    armingHintVisible = false;
    clearTimeout(hintIdleTimeout);
    hintIdleTimeout = null;
    clearTimeout(armTimeout);
    armTimeout = null;

    startHintEl.classList.remove('hint-drop-in');
    startHintEl.style.animation = 'none';
    startHintEl.innerHTML = '';
    startHintEl.style.opacity = '0';
    startHintEl.style.visibility = 'hidden';
    startHintEl.setAttribute('aria-hidden', 'true');
}

export function revealActivationHint(owner, html, idleMs = null) {
    if (!startHintEl || !useKeyboardControls) return;

    dismissActivationHint(null, true);

    if (owner === 'konami') {
        resetArming();
        globalThis.gardenHooks?.resetKonamiSequence?.();
    } else if (owner === 'pong') {
        globalThis.gardenHooks?.resetKonamiSequence?.();
    }

    activationHintOwner = owner;
    if (owner === 'pong') armingHintVisible = true;

    positionStartHint();
    startHintEl.innerHTML = html;
    startHintEl.classList.remove('hint-drop-in');
    startHintEl.style.removeProperty('animation');
    startHintEl.style.opacity = '0';
    startHintEl.style.visibility = 'visible';
    startHintEl.removeAttribute('aria-hidden');
    void startHintEl.offsetWidth;
    startHintEl.classList.add('hint-drop-in');

    if (idleMs != null) {
        clearTimeout(hintIdleTimeout);
        hintIdleTimeout = setTimeout(() => {
            if (activationHintOwner === owner) dismissActivationHint(owner);
        }, idleMs);
    }
}

export function updateActivationHintHtml(owner, html) {
    if (!startHintEl || activationHintOwner !== owner) return;
    positionStartHint();
    startHintEl.innerHTML = html;
}

export function getActivationHintOwner() {
    return activationHintOwner;
}

export function isActivationHintVisible() {
    return activationHintOwner !== null;
}

function clearPongStartHint() {
    dismissActivationHint('pong', true);
}

function cancelPongArming() {
    resetArming();
    if (activationHintOwner === 'pong') dismissActivationHint('pong', true);
    syncPanopticonCodeSequenceComments();
}

function onKeyboardArmPress(side) {
    if (!canArmPongFromKeyboard()) return;

    globalThis.gardenHooks?.cancelKonamiArming?.();

    clearTimeout(hintIdleTimeout);
    hintIdleTimeout = null;

    if (activationHintOwner !== 'pong') {
        revealActivationHint('pong', buildPongHintHtml(keyboardArmIndex), PONG_ARM_HINT_IDLE_MS);
    }

    const expected = KEYBOARD_ARM_SEQUENCE[keyboardArmIndex];
    if (side !== expected) {
        cancelPongArming();
        return;
    }

    keyboardArmIndex += 1;
    updateActivationHintHtml('pong', buildPongHintHtml(keyboardArmIndex));

    if (keyboardArmIndex >= KEYBOARD_ARM_SEQUENCE.length) {
        clearTimeout(armTimeout);
        armTimeout = null;
        keyboardArmIndex = 0;
        leftTapCount = 0;
        rightTapCount = 0;
        activatePong();
        return;
    }

    clearTimeout(armTimeout);
    armTimeout = setTimeout(fadeArmingHint, ACTIVATE_WINDOW_MS);
    syncPanopticonCodeSequenceComments();
}

function fadeArmingHint() {
    if (!startHintEl || active || fading || activationHintOwner !== 'pong') return;
    resetArming();
    startHintEl.classList.remove('hint-drop-in');
    startHintEl.style.animation = 'none';
    void startHintEl.offsetWidth;
    startHintEl.style.animation = 'pongHintFadeInOut 5s forwards';
    activationHintOwner = null;
    armingHintVisible = false;
}

export function cancelPongArmingSequence() {
    cancelPongArming();
}

export function fadePongArmingHint() {
    fadeArmingHint();
}

/** Pong is discovered via arrow keys; progressive hint appears only after the first press. */
export function notifyGardenReady() {}

function setUiPlaying(playing) {
    if (quitBtnEl) quitBtnEl.hidden = !playing || useKeyboardControls;
    updateControlsVisibility();
}

function syncPongUiClasses() {
    const playing = active || fading;
    document.body.classList.toggle('pong-playing', playing);
    document.body.classList.toggle('ios-pong-playing', perf.isIOS && playing);
}

function togglePause() {
    if (!active || fading) return;
    const morphT = Math.min(1, (performance.now() - morphStart) / MORPH_MS);
    if (morphT < 1) return;

    if (!paused) {
        paused = true;
        clearHoldInput();
        pauseState = {
            vx: ball.vx,
            vy: ball.vy,
            wasHeld: ballHeld,
            restartServe: serveCountdownActive,
            reserviceTowardBottom: reserviceTimer ? pendingReserviceTowardBottom : null,
        };
        clearServeCountdown();
        clearReserviceDelay();
        ball.vx = 0;
        ball.vy = 0;
        ballHeld = true;
        syncBallEl();
        courtOverlayEl?.classList.add('is-paused');
        pokeUserActivity();
        return;
    }

    paused = false;
    courtOverlayEl?.classList.remove('is-paused');
    if (pauseState?.restartServe) {
        startServeCountdown();
    } else if (pauseState?.reserviceTowardBottom != null) {
        scheduleReservice(pauseState.reserviceTowardBottom);
    } else {
        ballHeld = pauseState?.wasHeld ?? false;
        ball.vx = pauseState?.vx ?? 0;
        ball.vy = pauseState?.vy ?? 0;
        syncBallEl();
    }
    pauseState = null;
    pokeUserActivity();
}

function pauseGardenLoopForPong() {
    if (gardenLoopPausedForPong || isSingularityActive) return;
    globalThis.gardenHooks?.stopGardenLoop?.();
    gardenLoopPausedForPong = true;
}

function resumeGardenLoopAfterPong() {
    if (!gardenLoopPausedForPong) return;
    gardenLoopPausedForPong = false;
    if (!document.hidden && document.body.classList.contains('garden-ready')) {
        globalThis.gardenHooks?.resumeGardenLoop?.();
    }
}

function activatePong() {
    if (active || !panopticonEl) return;
    syncPanopticonCodeSequenceComments();
    pauseGardenLoopForPong();
    clearPongStartHint();
    pokeUserActivity();
    paused = false;
    pauseState = null;
    eyeReturning = false;
    enableEyeMoveAnim();
    pinEyeToCurrentFrame();
    active = true;
    fading = false;
    morphStart = performance.now();
    panopticonEl.classList.add('pong-active');
    setUiPlaying(true);
    pongGroupEl?.setAttribute('aria-hidden', 'false');
    scoreLeft = 0;
    scoreRight = 0;
    resetRally();
    sixSevenUntil = 0;
    leftX = rightX = leftTarget = rightTarget = courtViewW * 0.5;
    resetPongGaze();
    updateScoreboard();
    dropScoreboard();
    void panopticonEl.offsetWidth;
    requestAnimationFrame(() => {
        positionControls();
        resizeCanvas();
    });
    warmSound(sfx.hit);
    warmSound(sfx.pop);
    warmSound(sfx.gamePoint);
    warmSound(sfx.gameStart);
    warmSound(sfx.sixSeven);
    playSound(sfx.gamePoint);
    startPongLoop();
    startServeCountdown();
    globalThis.unlockTrophy?.('panopticon_pong');
}

function deactivatePong() {
    const wasActive = active;
    active = false;
    fading = false;
    paused = false;
    pauseState = null;
    eyeReturning = false;
    sixSevenUntil = 0;
    clearHoldInput();
    resetArming();
    if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
    }
    panopticonEl?.classList.remove('pong-active');
    document.body.classList.remove('pong-fading', 'ios-pong-fading');
    disableEyeMoveAnim();
    resetEyePosition();
    resetPongGaze();
    clearServeCountdown();
    clearReserviceDelay();
    hidePongComment();
    setUiPlaying(false);
    pongGroupEl?.setAttribute('aria-hidden', 'true');
    scoreboardEl?.classList.remove('visible', 'score-drop');
    scoreboardEl?.style.removeProperty('top');
    scoreboardEl?.style.removeProperty('left');
    scoreboardEl?.style.removeProperty('transform');
    courtOverlayEl?.classList.remove('is-paused');
    syncPaddles(0);
    updateControlsVisibility();
    pokeUserActivity();
    syncPanopticonCodeSequenceComments();
    resumeGardenLoopAfterPong();
    return wasActive;
}

function fadeOutAndQuit() {
    if (!active || fading) return;
    syncPanopticonCodeSequenceComments();
    paused = false;
    pauseState = null;
    clearHoldInput();
    fading = true;
    document.body.classList.add('pong-fading');
    if (perf.isIOS) document.body.classList.add('ios-pong-fading');
    updateControlsVisibility();
    playSound(sfx.transition);
    transitionEyeToReturnHome().then(() => {
        deactivatePong();
    });
}

function onArrowHoldStart(side, direction, btn) {
    if (!active || fading || !panopticonEl?.classList.contains('visible')) return;

    const delta = direction === 'up' ? -1 : 1;
    if (side === 'left') holdInput.left = delta;
    else holdInput.right = delta;
    btn.classList.add('is-held');
}

function onArrowHoldEnd(side, direction, btn) {
    btn.classList.remove('is-held');
    if (!active) return;

    const delta = direction === 'up' ? -1 : 1;
    if (side === 'left' && holdInput.left === delta) holdInput.left = 0;
    if (side === 'right' && holdInput.right === delta) holdInput.right = 0;
}

function stopTouchScroll(e) {
    if (!panopticonEl?.classList.contains('visible')) return;
    e.preventDefault();
    e.stopPropagation();
}

function pongUiActive() {
    return document.body.classList.contains('pong-playing')
        || document.body.classList.contains('ios-pong-playing');
}

function isVaultModalOpen() {
    const vault = document.getElementById('modal-vault');
    if (!vault) return false;
    return getComputedStyle(vault).display !== 'none';
}

function canArmPongFromKeyboard() {
    if (!useKeyboardControls || active || fading) return false;
    if (!panopticonEl?.classList.contains('visible')) return false;
    if (document.getElementById('lightbox')?.classList.contains('active')) return false;
    if (isVaultModalOpen()) return false;
    return true;
}

export function isPongArmingActive() {
    return (
        keyboardArmIndex > 0
        || leftTapCount > 0
        || rightTapCount > 0
    );
}

export function isPongSessionActive() {
    return active || fading;
}

/** True when desktop pong should consume ←/→ (arming or active play). */
export function pongBlocksArrowNav(e) {
    if (!useKeyboardControls) return false;
    if (e.code !== 'ArrowLeft' && e.code !== 'ArrowRight') return false;
    if (active || fading) return true;
    if (globalThis.gardenHooks?.konamiBlocksPongArming?.()) return false;
    return canArmPongFromKeyboard();
}

function isPongTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    return Boolean(el.closest?.('#term-input, [contenteditable="true"]'));
}

function bindKeyboardControls() {
    window.addEventListener('keydown', (e) => {
        if (active && !fading) {
            if (isPongTypingTarget(document.activeElement)) return;

            if (e.key === '0' || e.code === 'Numpad0') {
                pokeUserActivity();
                fadeOutAndQuit();
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            const hold = KEY_HOLD[e.code];
            if (!hold) return;

            pokeUserActivity();
            if (hold.side === 'left') holdInput.left = hold.dir;
            else holdInput.right = hold.dir;
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (!e.repeat && canArmPongFromKeyboard()) {
            if (globalThis.gardenHooks?.konamiClaimsKey?.(e)) return;

            if (e.code === 'ArrowLeft') {
                pokeUserActivity();
                onKeyboardArmPress('left');
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (e.code === 'ArrowRight') {
                pokeUserActivity();
                onKeyboardArmPress('right');
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }, true);

    window.addEventListener('keyup', (e) => {
        const hold = KEY_HOLD[e.code];
        if (!hold) return;
        if (isPongTypingTarget(document.activeElement)) return;

        pokeUserActivity();
        if (hold.side === 'left' && holdInput.left === hold.dir) holdInput.left = 0;
        if (hold.side === 'right' && holdInput.right === hold.dir) holdInput.right = 0;
    }, true);

    window.addEventListener('blur', clearHoldInput);
}

function isPongAppChrome(target) {
    return Boolean(target?.closest?.(
        '#hamburger-icon, .control-panel, #sidebar-menu, #terminal-container, '
        + '.ios-sidebar-tools, #mode-btn, #playlist-menu, #playlist-header, '
        + '.ios-pong-eye-tap',
    ));
}

function bindMagnifierGuards() {
    document.addEventListener('selectstart', (e) => {
        if (!pongUiActive() || isPongAppChrome(e.target)) return;
        if (e.target.closest?.('.ios-pong-unselectable, #ios-pong-court, #ios-pong-scoreboard, #ios-pong-comment')) {
            e.preventDefault();
        }
    }, true);

    document.addEventListener('contextmenu', (e) => {
        if (!pongUiActive() || isPongAppChrome(e.target)) return;
        if (e.target.closest?.('.ios-pong-unselectable, #ios-pong-court, #ios-pong-scoreboard, #ios-pong-comment')) {
            e.preventDefault();
        }
    }, true);
}

function bindArrowButton(side, direction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ios-pong-arrow ios-pong-arrow-${direction}`;
    btn.setAttribute('aria-label', `${side} paddle ${direction}`);
    btn.innerHTML = ARROW_SVG[direction];

    btn.addEventListener('pointerdown', (e) => {
        stopTouchScroll(e);
        btn.setPointerCapture(e.pointerId);
        onArrowHoldStart(side, direction, btn);
    }, { passive: false });
    btn.addEventListener('touchstart', stopTouchScroll, { passive: false });

    const endHold = (e) => {
        stopTouchScroll(e);
        if (btn.hasPointerCapture(e.pointerId)) btn.releasePointerCapture(e.pointerId);
        onArrowHoldEnd(side, direction, btn);
    };

    btn.addEventListener('pointerup', endHold, { passive: false });
    btn.addEventListener('pointercancel', endHold, { passive: false });
    return btn;
}

function bindPanel(side) {
    const panel = document.createElement('div');
    panel.className = `ios-pong-panel ios-pong-panel-${side} ios-pong-unselectable`;
    panel.append(bindArrowButton(side, 'up'), bindArrowButton(side, 'down'));
    document.body.appendChild(panel);
    return panel;
}

function bindCourtOverlay() {
    const svgNs = 'http://www.w3.org/2000/svg';
    courtOverlayEl = document.createElementNS(svgNs, 'svg');
    courtOverlayEl.id = 'ios-pong-court';
    courtOverlayEl.setAttribute('class', 'ios-pong-unselectable');
    courtOverlayEl.setAttribute('preserveAspectRatio', 'none');

    courtOverlayEl.setAttribute('aria-hidden', 'true');

    courtBoundaryEl = document.createElementNS(svgNs, 'rect');
    courtBoundaryEl.setAttribute('class', 'pong-court-boundary');
    courtBoundaryEl.setAttribute('vector-effect', 'non-scaling-stroke');

    courtFillEl = document.createElementNS(svgNs, 'rect');
    courtFillEl.setAttribute('class', 'pong-court-fill');

    paddleLeftEl = document.createElementNS(svgNs, 'line');
    paddleLeftEl.id = 'pong-paddle-l';
    paddleLeftEl.setAttribute('class', 'pong-paddle');
    paddleLeftEl.setAttribute('vector-effect', 'non-scaling-stroke');

    paddleRightEl = document.createElementNS(svgNs, 'line');
    paddleRightEl.id = 'pong-paddle-r';
    paddleRightEl.setAttribute('class', 'pong-paddle');
    paddleRightEl.setAttribute('vector-effect', 'non-scaling-stroke');

    ballEl = document.createElementNS(svgNs, 'circle');
    ballEl.id = 'pong-ball';
    ballEl.setAttribute('class', 'pong-ball');
    ballEl.setAttribute('r', String(BALL_R));
    ballEl.setAttribute('vector-effect', 'non-scaling-stroke');

    const defs = document.createElementNS(svgNs, 'defs');
    const clipPath = document.createElementNS(svgNs, 'clipPath');
    clipPath.setAttribute('id', 'pong-court-clip');
    courtClipRectEl = document.createElementNS(svgNs, 'rect');
    clipPath.appendChild(courtClipRectEl);
    defs.appendChild(clipPath);

    courtPlayLayerEl = document.createElementNS(svgNs, 'g');
    courtPlayLayerEl.setAttribute('clip-path', 'url(#pong-court-clip)');

    courtPlayLayerEl.append(paddleLeftEl, paddleRightEl, ballEl);
    courtOverlayEl.append(defs, courtFillEl, courtPlayLayerEl, courtBoundaryEl);
    document.body.appendChild(courtOverlayEl);

    courtFillEl.style.cursor = 'pointer';
    courtFillEl.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePause();
    });
    courtFillEl.addEventListener('pointerdown', (e) => {
        if (active && !fading) e.stopPropagation();
    });

    syncCourtCornerRadius();
    syncCourtViewBox(320, 320);
    syncBallEl();
}

function getCourtMetrics() {
    if (active || fading) return getPongLayout().court;

    const { courtLeft, courtW } = getHorizontalLayout();
    const panRect = panopticonEl.getBoundingClientRect();
    const height = Math.max(panRect.height * 0.9, STRIP_MIN_H * 0.5);
    const top = panRect.top + (panRect.height - height) * 0.5;
    return { left: courtLeft, top, width: courtW, height };
}

function bindCommentEl() {
    commentEl = document.createElement('div');
    commentEl.id = 'ios-pong-comment';
    commentEl.className = 'ios-pong-unselectable';
    commentEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(commentEl);
    return commentEl;
}

function bindEyeTapZone(side) {
    const el = document.createElement('div');
    el.className = `ios-pong-eye-tap ios-pong-eye-tap-${side} ios-pong-unselectable`;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', side === 'left' ? 'Pong activate left' : 'Pong activate right');
    el.addEventListener('pointerup', (e) => {
        stopTouchScroll(e);
        onEyeSideTap(side);
    }, { passive: false });
    document.body.appendChild(el);
    return el;
}

function positionEyeTapZones() {
    if (!stripLeftEl || !stripRightEl || !panopticonEl) return;
    const rect = panopticonEl.getBoundingClientRect();
    const zoneW = Math.max(EYE_TAP_ZONE_MIN_W, rect.width * EYE_TAP_ZONE_W_RATIO);
    const zoneH = Math.max(rect.height * EYE_TAP_ZONE_H_RATIO, EYE_TAP_ZONE_MIN_H);
    const eyeOverlap = EYE_TAP_ZONE_OUTSET - 1;
    const top = rect.top + (rect.height - zoneH) * 0.5;

    stripLeftEl.style.top = `${top}px`;
    stripLeftEl.style.left = `${rect.left - zoneW * EYE_TAP_ZONE_OUTSET}px`;
    stripLeftEl.style.width = `${zoneW}px`;
    stripLeftEl.style.height = `${zoneH}px`;

    stripRightEl.style.top = `${top}px`;
    stripRightEl.style.left = `${rect.right - zoneW * eyeOverlap}px`;
    stripRightEl.style.width = `${zoneW}px`;
    stripRightEl.style.height = `${zoneH}px`;
}

function schedulePositionControls() {
    if (positionControlsRaf) return;
    positionControlsRaf = requestAnimationFrame(() => {
        positionControlsRaf = null;
        positionControls();
    });
}

function isPongLandscape() {
    return window.innerWidth > window.innerHeight;
}

function positionQuitButton(centerX) {
    if (!quitBtnEl) return;
    if (isPongLandscape()) {
        quitBtnEl.style.left = '';
        quitBtnEl.style.bottom = '';
        quitBtnEl.style.top = '';
        quitBtnEl.style.right = '';
        quitBtnEl.style.transform = '';
        return;
    }
    quitBtnEl.style.top = '';
    quitBtnEl.style.right = '';
    quitBtnEl.style.left = `${centerX}px`;
    quitBtnEl.style.bottom = '';
    quitBtnEl.style.transform = '';
}

function positionControls() {
    if (!panopticonEl) return;

    const pongLayout = active || fading;

    if (pongLayout) {
        const layout = getPongLayout();
        if (!eyeReturning) {
            applyEyePosition(layout.eye);
        }

        if (commentEl) {
            commentEl.style.top = `${layout.comment.top}px`;
            commentEl.style.left = `${layout.comment.left}px`;
            commentEl.style.width = `${layout.comment.width}px`;
        }

        if (courtOverlayEl) {
            applyCourtPixelRect(layout.court);
        }

        if (panelLeftEl && panelRightEl) {
            panelLeftEl.style.top = `${layout.panels.top}px`;
            panelLeftEl.style.left = `${layout.panels.left}px`;
            panelRightEl.style.top = `${layout.panels.top}px`;
            panelRightEl.style.left = `${layout.panels.right}px`;
        }

        positionQuitButton(layout.court.left + layout.court.width * 0.5);

        positionScoreboard(layout);
        return;
    }

    resetEyePosition();
    const rect = panopticonEl.getBoundingClientRect();
    const horiz = getHorizontalLayout();
    const stackH = ARROW_SIZE * 2 + ARROW_GAP;
    const top = rect.top + (rect.height - stackH) * 0.5;

    if (panelLeftEl && panelRightEl) {
        panelLeftEl.style.top = `${top}px`;
        panelLeftEl.style.left = `${horiz.panelLeft}px`;
        panelRightEl.style.top = `${top}px`;
        panelRightEl.style.left = `${horiz.panelRight}px`;
    }

    if (!useKeyboardControls) positionEyeTapZones();

    if (courtOverlayEl) {
        applyCourtPixelRect(getCourtMetrics());
    }

    positionQuitButton(rect.left + rect.width * 0.5);

    if (activationHintOwner) positionStartHint();
}

function updateControlsVisibility() {
    const panVisible = panopticonEl?.classList.contains('visible');
    const showArrows = panVisible && (active || fading) && !useKeyboardControls;
    const showEyeTaps = panVisible && !active && !fading && !useKeyboardControls;
    const showCourt = panVisible && (active || fading);

    panelLeftEl?.classList.toggle('visible', showArrows);
    panelRightEl?.classList.toggle('visible', showArrows);
    stripLeftEl?.classList.toggle('visible', showEyeTaps);
    stripRightEl?.classList.toggle('visible', showEyeTaps);
    courtOverlayEl?.classList.toggle('visible', showCourt);
    syncPongUiClasses();
}

function bindControls() {
    bindCourtOverlay();
    bindCommentEl();
    if (!useKeyboardControls) {
        stripLeftEl = bindEyeTapZone('left');
        stripRightEl = bindEyeTapZone('right');
        panelLeftEl = bindPanel('left');
        panelRightEl = bindPanel('right');
    }

    quitBtnEl = document.createElement('button');
    quitBtnEl.type = 'button';
    quitBtnEl.id = 'ios-pong-quit';
    quitBtnEl.hidden = true;
    quitBtnEl.className = 'ios-pong-unselectable';
    quitBtnEl.setAttribute('aria-label', 'Quit ping pong');
    quitBtnEl.innerHTML = '<span class="ios-pong-quit-icon" aria-hidden="true"></span>';
    quitBtnEl.addEventListener('pointerdown', stopTouchScroll, { passive: false });
    quitBtnEl.addEventListener('touchstart', stopTouchScroll, { passive: false });
    quitBtnEl.addEventListener('pointerup', (e) => {
        stopTouchScroll(e);
        fadeOutAndQuit();
    }, { passive: false });
    document.body.appendChild(quitBtnEl);

    scoreboardEl = document.createElement('div');
    scoreboardEl.id = 'ios-pong-scoreboard';
    scoreboardEl.className = 'ios-pong-unselectable';
    scoreboardEl.innerHTML = '<span id="pong-score-l">0</span><span class="pong-score-sep">—</span><span id="pong-score-r">0</span>';
    document.body.appendChild(scoreboardEl);
    scoreLeftEl = scoreboardEl.querySelector('#pong-score-l');
    scoreRightEl = scoreboardEl.querySelector('#pong-score-r');

    if (useKeyboardControls) {
        startHintEl = document.createElement('div');
        startHintEl.id = 'pong-start-hint';
        startHintEl.className = 'ios-pong-unselectable';
        document.body.appendChild(startHintEl);
    }

    pongGroupEl = document.getElementById('panopticon-pong');

    const shell = document.getElementById('ios-scroll-shell');
    shell?.addEventListener('scroll', schedulePositionControls, { passive: true });
    window.addEventListener('resize', () => {
        schedulePositionControls();
    }, { passive: true });
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            positionControls();
            resizeCanvas();
        }, 260);
    });

    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
            if (active || fading) return;
            schedulePositionControls();
        });
        ro.observe(panopticonEl);
    }

    const visibilityObs = new MutationObserver(() => {
        schedulePositionControls();
        if (!panopticonEl.classList.contains('visible')) deactivatePong();
        updateControlsVisibility();
    });
    visibilityObs.observe(panopticonEl, { attributes: true, attributeFilter: ['class'] });

    positionControls();
    updateControlsVisibility();
}

export function resetPanopticonPongBoot() {
    panopticonPongInitialized = false;
}

export function initPanopticonPingPong() {
    const eye = panopticonEl || document.getElementById('panopticon-eye');
    if (!eye || panopticonPongInitialized) return;

    if (useKeyboardControls) {
        document.body.classList.add('pong-keyboard-mode');
    }
    bindMagnifierGuards();
    bindControls();
    if (useKeyboardControls) {
        bindKeyboardControls();
        if (document.body.classList.contains('garden-ready')) {
            notifyGardenReady();
        }
    }

    panopticonPongInitialized = true;
}

export function initIosPingPong() {
    initPanopticonPingPong();
}
