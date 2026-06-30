export const STARTING_LIVES = 3;

export const LILYPAD_RADIUS = 1;
export const LILYPAD_LANDING_LENIENCY = 1.15;
export const LILYPAD_HEIGHT = 0.18;

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
