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
/** How long the frog takes to turn and face the fly before the tongue lashes out. */
export const TONGUE_TURN_DURATION = 0.12;
export const TONGUE_LASH_DURATION = 0.22;
/** Fraction of the lash spent extending outward; the rest is the retract. */
export const TONGUE_LASH_OUT_FRACTION = 0.35;
/** How far (0..1) toward an out-of-range fly the tongue reaches before falling short. */
export const TONGUE_FALL_SHORT_FRACTION = 0.6;
export const TONGUE_WIDTH = 0.07;

// Log obstacles: unstable stepping stones that tip the frog into the water if it lingers.
export const LOG_RADIUS = 0.85;
export const LOG_LENGTH = 2.2;
export const LOG_BODY_RADIUS = 0.32;
/** Fraction of ring placement slots that become a log instead of a lilypad. */
export const LOG_SPAWN_CHANCE = 0.18;
/** How long the frog can stand on a log before it tips. */
export const LOG_STABLE_DURATION = 3;
/** Ambient roll speed (rad/s) when unoccupied. */
export const LOG_ROLL_SPEED_IDLE = 0.15;
/** Roll speed (rad/s) at maximum danger, just before tipping. */
export const LOG_ROLL_SPEED_MAX = 5.5;
export const LOG_TIP_DIP_DEPTH = 0.35;
export const LOG_TIP_RECOVER_DURATION = 0.8;

// Water ripple VFX.
export const RIPPLE_POOL_SIZE = 10;
export const RIPPLE_DURATION = 0.9;
export const RIPPLE_MAX_SCALE = 2.4;
export const RIPPLE_START_OPACITY = 0.55;
export const RIPPLE_AMBIENT_OPACITY = 0.22;
export const RIPPLE_AMBIENT_INTERVAL_MIN = 2.5;
export const RIPPLE_AMBIENT_INTERVAL_MAX = 4.5;
/** How far from the frog ambient ripples may appear. */
export const RIPPLE_AMBIENT_RADIUS = 7;

// Combo/streak scoring.
/** Time after a catch before the streak resets. */
export const COMBO_WINDOW_SECONDS = 4.5;
export const COMBO_MAX_MULTIPLIER = 5;

// Distance milestones.
export const DISTANCE_MILESTONE_STEP = 50;
export const DISTANCE_MILESTONE_BONUS = 5;

// Pad/log spawn-in animation (anticipation ripple, then a pop with overshoot).
/** How long after a pad/log is placed before its ripple cue fires, scaled per index within a batch. */
export const POP_STAGGER_STEP = 0.06;
/** Random jitter added on top of the stagger so a batch doesn't feel metronomic. */
export const POP_STAGGER_JITTER = 0.05;
/** Time between the anticipation ripple and the pad/log actually starting to rise. */
export const POP_RIPPLE_LEAD = 0.18;
export const POP_DURATION = 0.45;
/** Random variance applied to each pop's duration so they don't all move in lockstep. */
export const POP_DURATION_JITTER = 0.15;
export const POP_SUBMERGE_DEPTH = 0.4;

// Camera shake (failure only).
export const SHAKE_DURATION = 0.35;
export const SHAKE_MAGNITUDE = 0.22;

// Fly-catch feedback (particle burst + score popup).
export const CATCH_BURST_COUNT = 10;
export const CATCH_BURST_DURATION = 0.5;
export const CATCH_BURST_SPEED = 2.2;

// Water surface animation (CPU vertex displacement, normals recomputed per frame).
export const WATER_SIZE = 150;
export const WATER_SEGMENTS = 50;
export const WATER_WAVE_AMPLITUDE = 0.09;
export const WATER_WAVE_FREQUENCY = 0.35;
export const WATER_WAVE_SPEED = 0.6;
export const WATER_WAVE_SECONDARY_AMPLITUDE = 0.045;
export const WATER_WAVE_SECONDARY_FREQUENCY = 0.9;
export const WATER_WAVE_SECONDARY_SPEED = 1.3;
/** Vertex colors lerp toward these at wave crests/troughs so motion reads clearly at any light angle. */
export const WATER_COLOR_BASE = 0x1e6f8c;
export const WATER_COLOR_CREST = 0x8fdcf0;
export const WATER_COLOR_TROUGH = 0x123247;

// Ambient fish: purely cosmetic, mostly-submerged wanderers that break the surface with a fin.
export const FISH_COUNT = 5;
export const FISH_COLOR = 0x355c45;
export const FISH_LENGTH = 0.6;
/** How far below the water surface the fish body is centered. */
export const FISH_DEPTH = 0.12;
export const FISH_FIN_HEIGHT = 0.22;
export const FISH_WANDER_RADIUS = 2.2;
export const FISH_WANDER_SPEED = 0.18;
/** Max radius around a fish's home point used when picking a fresh one. */
export const FISH_HOME_RANGE = 8;
/** Once a fish drifts this far from the frog, its home point is relocated nearby. */
export const FISH_RECENTER_DISTANCE = 11;
