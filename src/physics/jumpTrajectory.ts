import * as THREE from 'three';
import { lerp } from '../utils/math.ts';
import {
  JUMP_BASE_HEIGHT,
  JUMP_HEIGHT_PER_DIST,
  LILYPAD_LANDING_LENIENCY,
  MAX_JUMP_TIME,
  MIN_JUMP_TIME,
} from '../game/constants.ts';

/** Anything the frog can jump onto — a Lilypad or a Log. */
export interface Landable {
  id: number;
  position: THREE.Vector3;
  radius: number;
}

export interface JumpParams {
  start: THREE.Vector3;
  target: THREE.Vector3;
  arcHeight: number;
  duration: number;
}

/** Builds the tween parameters for a jump of the given world-space distance/power. */
export function buildJump(start: THREE.Vector3, target: THREE.Vector3, power: number): JumpParams {
  const distance = start.distanceTo(target);
  return {
    start: start.clone(),
    target: target.clone(),
    arcHeight: JUMP_BASE_HEIGHT + distance * JUMP_HEIGHT_PER_DIST,
    duration: lerp(MIN_JUMP_TIME, MAX_JUMP_TIME, power),
  };
}

/** Position along the jump's parabolic arc at normalized time t (0..1). */
export function positionAtT(jump: JumpParams, t: number, out = new THREE.Vector3()): THREE.Vector3 {
  const clampedT = Math.min(1, Math.max(0, t));
  out.x = lerp(jump.start.x, jump.target.x, clampedT);
  out.z = lerp(jump.start.z, jump.target.z, clampedT);
  const baseY = lerp(jump.start.y, jump.target.y, clampedT);
  out.y = baseY + jump.arcHeight * 4 * clampedT * (1 - clampedT);
  return out;
}

/** Finds the landable (if any) whose landing radius contains the given XZ point. */
export function findLandingTarget<T extends Landable>(point: THREE.Vector3, landables: T[]): T | null {
  let closest: T | null = null;
  let closestDist = Infinity;

  for (const landable of landables) {
    const dx = landable.position.x - point.x;
    const dz = landable.position.z - point.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= landable.radius * LILYPAD_LANDING_LENIENCY && dist < closestDist) {
      closest = landable;
      closestDist = dist;
    }
  }

  return closest;
}
