/** Panopticon ping pong — layout and timing constants. */

export const PADDLE_HALF = 8;
export const BALL_R = 3.5;
export const COURT_TOP = 10;
export const COURT_BOTTOM = 90;
export const COURT_CLIP_INSET = 1.15;
export const PADDLE_EDGE_INSET = 3;
export const MORPH_MS = 480;
export const ACTIVATE_TAPS_REQUIRED = 3;
export const ACTIVATE_WINDOW_MS = 4500;
export const PADDLE_HOLD_SPEED = 1.45;
export const MAX_BALL_SPEED = 2.05;
export const LANDSCAPE_BALL_SPEED = 2.15;
export const MIN_BALL_VX = 0.44;
export const ARROW_SIZE = 54;
export const ARROW_GAP = 16;
export const ARROW_COURT_GAP = 10;
export const COURT_W_RATIO = 0.82;
export const EDGE_INSET = 10;
export const FADE_MS = 480;
export const EYE_TRANSITION_MS = 640;
export const STRIP_MIN_H = 240;
export const STRIP_H_RATIO = 1.65;
export const EYE_COURT_GAP = 12;
export const COMMENT_GAP = 6;
export const EYE_TAP_ZONE_MIN_W = 84;
export const EYE_TAP_ZONE_W_RATIO = 0.72;
export const EYE_TAP_ZONE_MIN_H = 108;
export const EYE_TAP_ZONE_H_RATIO = 1.55;
export const EYE_TAP_ZONE_OUTSET = 1.05;
export const MAX_PONG_GAZE = 13;
export const DESKTOP_COURT_RADIUS = 14;
export const DESKTOP_COURT_RADIUS_PX = 16;
export const IOS_COURT_RADIUS = 14;
export const IOS_COURT_RADIUS_PX = 18;
export const DESKTOP_HUD_GAP = 18;
export const SERVE_COUNTDOWN_MS = 900;
export const RESERVE_AFTER_MISS_MS = 2000;
export const PONG_ARM_HINT_IDLE_MS = 3000;
export const PONG_QUIT_COMMENT = '[ press 0 to quit ]';
export const SIX_SEVEN_DANCE_MS = 2600;

export const KEY_HOLD = {
    KeyW: { side: 'left', dir: -1 },
    KeyS: { side: 'left', dir: 1 },
    ArrowUp: { side: 'right', dir: -1 },
    ArrowDown: { side: 'right', dir: 1 },
};

export const KEYBOARD_ARM_SEQUENCE = ['left', 'right', 'left', 'right', 'left', 'right'];

export const RALLY_HIT_MIN = 8;
export const EDGE_REL_THRESHOLD = 0.86;
export const EDGE_COMMENT_CHANCE = 0.2;
export const WHIFF_COMMENT_CHANCE = 0.5;
export const MILESTONE_SCORES = new Set([7, 11, 15]);
export const STRAIGHT_REL_THRESHOLD = 0.12;
export const STRAIGHT_STREAK_MIN = 5;
