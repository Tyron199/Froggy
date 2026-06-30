export const STARTING_LIVES = 3;

export const LILYPAD_RADIUS = 1;
export const LILYPAD_MIN_RADIUS = 0.65;
export const LILYPAD_MAX_RADIUS = 1.35;
export const LILYPAD_LANDING_LENIENCY = 1.15;
export const LILYPAD_HEIGHT = 0.18;
/** Frog's landing point is clamped to this fraction of a pad's radius so it stays visibly on the disc. */
export const LANDING_VISUAL_INSET = 0.92;

export const FROG_REST_Y = LILYPAD_HEIGHT / 2 + 0.12;

export const MAX_PULL_PX = 120;
export const MIN_PULL_PX = 12;

export const MIN_JUMP_DIST = 1.5;
export const MAX_JUMP_DIST = 6;

export const MIN_JUMP_TIME = 0.4;
export const MAX_JUMP_TIME = 0.9;

export const JUMP_BASE_HEIGHT = 0.6;
export const JUMP_HEIGHT_PER_DIST = 0.18;

export const TONGUE_RANGE = 3.2;

export const FLY_SPAWN_COUNT = 3;
export const FLY_ANCHOR_OFFSET_RANGE = 0.5;
export const FLY_REST_Y = LILYPAD_HEIGHT / 2 + 0.55;
export const FLY_HOVER_AMPLITUDE_XZ = 0.16;
export const FLY_HOVER_AMPLITUDE_Y = 0.1;
export const FLY_HOVER_SPEED = 1.8;
export const FLY_HITBOX_RADIUS = 0.4;
export const FLY_FLEE_DURATION = 0.6;
export const FLY_NO_RETAP_MS = 400;

export const CAMERA_OFFSET = { x: 0, y: 7, z: 5.5 };
/** Higher = camera catches up to the frog faster. */
export const CAMERA_DAMPING_LAMBDA = 8;

// Frog leg animation. Hip/knee angles are in radians; 0 knee = straight leg.
export const LEG_BACK_THIGH_LENGTH = 0.26;
export const LEG_BACK_SHIN_LENGTH = 0.24;
export const LEG_BACK_RADIUS = 0.06;
export const LEG_FRONT_THIGH_LENGTH = 0.17;
export const LEG_FRONT_SHIN_LENGTH = 0.15;
export const LEG_FRONT_RADIUS = 0.045;
/** Fixed outward (sideways) splay so legs read clearly from the steep top-down camera. */
export const LEG_BACK_SPLAY = 0.95;
export const LEG_FRONT_SPLAY = 0.7;

export const LEG_POSE_IDLE = { backHip: -0.25, backKnee: 1.7, frontHip: 0.1, frontKnee: 1.3 };
export const LEG_POSE_CROUCH = { backHip: -0.55, backKnee: 2.3, frontHip: 0.3, frontKnee: 1.6 };
export const LEG_POSE_KICK = { backHip: 0.9, backKnee: 0.3, frontHip: -0.3, frontKnee: 0.6 };
export const LEG_POSE_TUCK = { backHip: 1.1, backKnee: 2.6, frontHip: 0.5, frontKnee: 2.0 };
export const LEG_POSE_LANDING = { backHip: 0.2, backKnee: 0.9, frontHip: -0.2, frontKnee: 0.7 };
export const LEG_POSE_LIMP = { backHip: 1.3, backKnee: 0.3, frontHip: 1.1, frontKnee: 0.3 };

/** Fraction of jump duration spent easing from the crouch pose into the launch kick. */
export const LEG_LAUNCH_KICK_FRACTION = 0.15;
/** Fraction of jump duration by which the legs have settled into the airborne tuck. */
export const LEG_TUCK_HOLD_START = 0.3;
/** Fraction of jump duration after which legs ease from tuck into the landing-reach pose. */
export const LEG_LANDING_EXTEND_FRACTION = 0.75;
/** How long after landing the legs take to settle from the landing pose back to idle. */
export const LEG_LANDING_SETTLE_DURATION = 0.18;

// Tongue catch mechanic.
export const TONGUE_LASH_DURATION = 0.22;
/** Fraction of the lash spent extending outward; the rest is the retract. */
export const TONGUE_LASH_OUT_FRACTION = 0.35;
/** How far (0..1) toward an out-of-range fly the tongue reaches before falling short. */
export const TONGUE_FALL_SHORT_FRACTION = 0.6;
export const TONGUE_WIDTH = 0.07;
