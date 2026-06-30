import * as THREE from 'three';
import { Lilypad } from './Lilypad.ts';
import {
  FROG_REST_Y,
  LANDING_VISUAL_INSET,
  LEG_BACK_RADIUS,
  LEG_BACK_SHIN_LENGTH,
  LEG_BACK_SPLAY,
  LEG_BACK_THIGH_LENGTH,
  LEG_FRONT_RADIUS,
  LEG_FRONT_SHIN_LENGTH,
  LEG_FRONT_SPLAY,
  LEG_FRONT_THIGH_LENGTH,
  LEG_LANDING_EXTEND_FRACTION,
  LEG_LANDING_SETTLE_DURATION,
  LEG_LAUNCH_KICK_FRACTION,
  LEG_POSE_CROUCH,
  LEG_POSE_IDLE,
  LEG_POSE_KICK,
  LEG_POSE_LANDING,
  LEG_POSE_LIMP,
  LEG_POSE_TUCK,
  LEG_TUCK_HOLD_START,
  TONGUE_FALL_SHORT_FRACTION,
  TONGUE_LASH_DURATION,
  TONGUE_LASH_OUT_FRACTION,
  TONGUE_TURN_DURATION,
  TONGUE_WIDTH,
} from '../game/constants.ts';
import { buildJump, positionAtT, type JumpParams } from '../physics/jumpTrajectory.ts';
import { lerp } from '../utils/math.ts';

/** Shortest signed angular distance from `a` to `b`, both in radians. */
function shortestAngleDelta(a: number, b: number): number {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

const SINK_DURATION = 0.6;
const MOUTH_LOCAL_POSITION = new THREE.Vector3(0, 0.24, 0.34);

export const FrogState = {
  Idle: 'idle',
  Jumping: 'jumping',
  Sinking: 'sinking',
  Tonguing: 'tonguing',
} as const;
export type FrogState = (typeof FrogState)[keyof typeof FrogState];

interface LegPose {
  backHip: number;
  backKnee: number;
  frontHip: number;
  frontKnee: number;
}

interface LegRig {
  /** Animated fore-aft swing pivot, nested inside a static splayed base group. */
  swing: THREE.Group;
  knee: THREE.Group;
}

function lerpPose(a: LegPose, b: LegPose, t: number): LegPose {
  return {
    backHip: lerp(a.backHip, b.backHip, t),
    backKnee: lerp(a.backKnee, b.backKnee, t),
    frontHip: lerp(a.frontHip, b.frontHip, t),
    frontKnee: lerp(a.frontKnee, b.frontKnee, t),
  };
}

function easeOutQuad(x: number): number {
  const clamped = Math.min(1, Math.max(0, x));
  return 1 - (1 - clamped) * (1 - clamped);
}

/** Computes the leg pose for a given point `t` (0..1) through the jump arc. */
function legPoseForJumpT(t: number, launchPower: number): LegPose {
  const crouchAtLaunch = lerpPose(LEG_POSE_IDLE, LEG_POSE_CROUCH, launchPower);

  if (t < LEG_LAUNCH_KICK_FRACTION) {
    return lerpPose(crouchAtLaunch, LEG_POSE_KICK, easeOutQuad(t / LEG_LAUNCH_KICK_FRACTION));
  }
  if (t < LEG_TUCK_HOLD_START) {
    const k = (t - LEG_LAUNCH_KICK_FRACTION) / (LEG_TUCK_HOLD_START - LEG_LAUNCH_KICK_FRACTION);
    return lerpPose(LEG_POSE_KICK, LEG_POSE_TUCK, k);
  }
  if (t < LEG_LANDING_EXTEND_FRACTION) {
    return LEG_POSE_TUCK;
  }
  const k = (t - LEG_LANDING_EXTEND_FRACTION) / (1 - LEG_LANDING_EXTEND_FRACTION);
  return lerpPose(LEG_POSE_TUCK, LEG_POSE_LANDING, Math.min(1, k));
}

export class Frog {
  readonly group: THREE.Group;
  state: FrogState = FrogState.Idle;

  private jump: JumpParams | null = null;
  private elapsed = 0;
  private sinkElapsed = 0;
  private readonly bodyMesh: THREE.Mesh;
  /** The exact XZ point the most recent jump landed at, before any pad-disc clamping. */
  private readonly lastJumpTarget = new THREE.Vector3();

  private readonly backLegs: LegRig[];
  private readonly frontLegs: LegRig[];
  /** 0..1, how far the player has pulled back while aiming; drives the idle crouch. */
  private aimPower = 0;
  /** The power (0..1) the most recent jump launched with; drives the launch-kick intensity. */
  private launchPower = 0;
  /** Seconds since landing; drives the post-land settle blend back to idle stance. */
  private sinceLanded = Infinity;

  private readonly tonguePivot: THREE.Group;
  private readonly tongueMesh: THREE.Mesh;
  private tonguePhase: 'turning' | 'lashing' = 'lashing';
  private turnStartYaw = 0;
  private turnTargetYaw = 0;
  private tongueTurnElapsed = 0;
  private readonly pendingTongueTarget = new THREE.Vector3();
  private tongueElapsed = 0;
  private tongueMaxLength = 0;
  private tongueFired = false;
  private tongueOnComplete: (() => void) | null = null;

  constructor(startLilypad: Lilypad) {
    this.group = new THREE.Group();

    const bodyGeometry = new THREE.SphereGeometry(0.32, 16, 12);
    bodyGeometry.scale(1, 0.7, 1.15);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.position.y = 0.18;
    this.group.add(this.bodyMesh);

    const eyeGeometry = new THREE.SphereGeometry(0.09, 10, 8);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
    const pupilGeometry = new THREE.SphereGeometry(0.045, 8, 6);
    const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(side * 0.15, 0.36, 0.18);
      this.group.add(eye);

      const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      pupil.position.set(side * 0.15, 0.36, 0.25);
      this.group.add(pupil);
    }

    this.backLegs = [this.createLeg(true, -1), this.createLeg(true, 1)];
    this.frontLegs = [this.createLeg(false, -1), this.createLeg(false, 1)];
    this.applyLegPose(LEG_POSE_IDLE);

    this.tonguePivot = new THREE.Group();
    this.tonguePivot.position.copy(MOUTH_LOCAL_POSITION);
    this.group.add(this.tonguePivot);

    const tongueMaterial = new THREE.MeshLambertMaterial({ color: 0xff6f91 });
    this.tongueMesh = new THREE.Mesh(new THREE.BoxGeometry(TONGUE_WIDTH, TONGUE_WIDTH, 1), tongueMaterial);
    this.tongueMesh.visible = false;
    this.tonguePivot.add(this.tongueMesh);

    this.group.position.copy(startLilypad.position);
    this.group.position.y = FROG_REST_Y;
  }

  private createLeg(isBack: boolean, side: -1 | 1): LegRig {
    const thighLen = isBack ? LEG_BACK_THIGH_LENGTH : LEG_FRONT_THIGH_LENGTH;
    const shinLen = isBack ? LEG_BACK_SHIN_LENGTH : LEG_FRONT_SHIN_LENGTH;
    const radius = isBack ? LEG_BACK_RADIUS : LEG_FRONT_RADIUS;
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x4caf50 });

    const splay = isBack ? LEG_BACK_SPLAY : LEG_FRONT_SPLAY;

    // Static base: positions the leg at the body attachment point and splays it outward
    // sideways so it reads clearly from the steep top-down camera.
    const base = new THREE.Group();
    base.position.set(side * (isBack ? 0.24 : 0.2), isBack ? 0.14 : 0.12, isBack ? -0.14 : 0.14);
    base.rotation.z = side * splay;

    // Animated child: swings fore-aft (in the already-splayed local frame) for crouch/kick/tuck.
    const swing = new THREE.Group();
    base.add(swing);

    const thighMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.85, thighLen, 6), legMaterial);
    thighMesh.position.y = -thighLen / 2;
    thighMesh.castShadow = true;
    swing.add(thighMesh);

    const knee = new THREE.Group();
    knee.position.y = -thighLen;
    swing.add(knee);

    const shinMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius * 0.5, shinLen, 6), legMaterial);
    shinMesh.position.y = -shinLen / 2;
    shinMesh.castShadow = true;
    knee.add(shinMesh);

    this.group.add(base);
    return { swing, knee };
  }

  private applyLegPose(pose: LegPose): void {
    for (const leg of this.backLegs) {
      leg.swing.rotation.x = pose.backHip;
      leg.knee.rotation.x = pose.backKnee;
    }
    for (const leg of this.frontLegs) {
      leg.swing.rotation.x = pose.frontHip;
      leg.knee.rotation.x = pose.frontKnee;
    }
  }

  /** Sets the pull-back power (0..1) while aiming from idle, or null when not aiming; drives the crouch. */
  setAimPower(power: number | null): void {
    this.aimPower = power ?? 0;
  }

  /** Faces the frog toward `target` immediately, tracking the player's pull direction while aiming. */
  setAimPoint(target: THREE.Vector3): void {
    if (this.state !== FrogState.Idle) return;
    const dx = target.x - this.group.position.x;
    const dz = target.z - this.group.position.z;
    if (dx * dx + dz * dz > 1e-6) {
      this.group.rotation.y = Math.atan2(dx, dz);
    }
  }

  /**
   * Turns to face `targetWorldPoint` and then lashes the tongue toward it. If `reaches` is false,
   * the tongue falls short (stops partway there) instead of reaching it. `onComplete` fires the
   * instant the tongue tip arrives at its final point (reach or fall-short) — that's when a
   * catch/miss should register.
   */
  lashTongue(targetWorldPoint: THREE.Vector3, reaches: boolean, onComplete: () => void): void {
    const mouthWorld = this.tonguePivot.getWorldPosition(new THREE.Vector3());
    const finalTargetWorld = reaches
      ? targetWorldPoint.clone()
      : mouthWorld.clone().lerp(targetWorldPoint, TONGUE_FALL_SHORT_FRACTION);

    const dx = finalTargetWorld.x - this.group.position.x;
    const dz = finalTargetWorld.z - this.group.position.z;

    this.turnStartYaw = this.group.rotation.y;
    this.turnTargetYaw =
      dx * dx + dz * dz > 1e-6
        ? this.turnStartYaw + shortestAngleDelta(this.turnStartYaw, Math.atan2(dx, dz))
        : this.turnStartYaw;
    this.tongueTurnElapsed = 0;
    this.tonguePhase = 'turning';
    this.pendingTongueTarget.copy(finalTargetWorld);
    this.tongueOnComplete = onComplete;
    this.tongueFired = false;
    this.state = FrogState.Tonguing;
  }

  /** Aims the tongue pivot at `pendingTongueTarget` and starts the lash-out/retract animation. */
  private beginLash(): void {
    this.group.updateMatrixWorld(true);
    const localTarget = this.group.worldToLocal(this.pendingTongueTarget.clone());
    const dir = localTarget.clone().sub(MOUTH_LOCAL_POSITION);
    const horizontalDist = Math.hypot(dir.x, dir.z);

    this.tonguePivot.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
    this.tonguePivot.rotateX(-Math.atan2(dir.y, horizontalDist));

    this.tongueMaxLength = Math.max(0.05, dir.length());
    this.tongueElapsed = 0;
    this.tongueMesh.visible = true;
  }

  /** Starts a parabolic jump toward `target`, using `power` (0..1) to set arc duration/height. */
  startJump(target: THREE.Vector3, power: number): void {
    const start = this.group.position.clone();
    start.y = FROG_REST_Y;
    const end = target.clone();
    end.y = FROG_REST_Y;

    this.jump = buildJump(start, end, power);
    this.elapsed = 0;
    this.launchPower = power;
    this.state = FrogState.Jumping;

    const dir = new THREE.Vector3().subVectors(end, start);
    if (dir.lengthSq() > 1e-6) {
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }

  /** Advances the active jump tween. Returns true the frame the jump completes. */
  update(dt: number): boolean {
    if (this.state === FrogState.Sinking) {
      this.sinkElapsed += dt;
      const sinkT = Math.min(this.sinkElapsed / SINK_DURATION, 1);
      this.group.position.y = FROG_REST_Y - sinkT * 0.5;
      const scale = 1 - sinkT;
      this.group.scale.set(scale, scale, scale);
      this.applyLegPose(lerpPose(LEG_POSE_LANDING, LEG_POSE_LIMP, sinkT));
      return false;
    }

    if (this.state === FrogState.Tonguing && this.tonguePhase === 'turning') {
      this.tongueTurnElapsed += dt;
      const t = Math.min(1, this.tongueTurnElapsed / TONGUE_TURN_DURATION);
      this.group.rotation.y = lerp(this.turnStartYaw, this.turnTargetYaw, easeOutQuad(t));

      if (t >= 1) {
        this.tonguePhase = 'lashing';
        this.beginLash();
      }
      return false;
    }

    if (this.state === FrogState.Tonguing) {
      this.tongueElapsed += dt;
      const t = this.tongueElapsed / TONGUE_LASH_DURATION;

      let length: number;
      if (t < TONGUE_LASH_OUT_FRACTION) {
        length = this.tongueMaxLength * easeOutQuad(t / TONGUE_LASH_OUT_FRACTION);
      } else {
        const k = (t - TONGUE_LASH_OUT_FRACTION) / (1 - TONGUE_LASH_OUT_FRACTION);
        length = this.tongueMaxLength * (1 - Math.min(1, k));
      }

      if (!this.tongueFired && t >= TONGUE_LASH_OUT_FRACTION) {
        this.tongueFired = true;
        const onComplete = this.tongueOnComplete;
        this.tongueOnComplete = null;
        onComplete?.();
      }

      this.tongueMesh.scale.z = Math.max(0.001, length);
      this.tongueMesh.position.z = length / 2;

      if (t >= 1) {
        this.tongueMesh.visible = false;
        this.tonguePhase = 'lashing';
        this.state = FrogState.Idle;
      }
      return false;
    }

    if (this.state === FrogState.Idle) {
      if (this.sinceLanded < LEG_LANDING_SETTLE_DURATION) {
        const k = easeOutQuad(this.sinceLanded / LEG_LANDING_SETTLE_DURATION);
        const idleTarget = lerpPose(LEG_POSE_IDLE, LEG_POSE_CROUCH, this.aimPower);
        this.applyLegPose(lerpPose(LEG_POSE_LANDING, idleTarget, k));
        this.sinceLanded += dt;
      } else {
        this.applyLegPose(lerpPose(LEG_POSE_IDLE, LEG_POSE_CROUCH, this.aimPower));
      }
      return false;
    }

    if (this.state !== FrogState.Jumping || !this.jump) return false;

    this.elapsed += dt;
    const t = this.elapsed / this.jump.duration;
    positionAtT(this.jump, t, this.group.position);

    const squash = 1 + Math.sin(Math.min(t, 1) * Math.PI) * 0.25;
    this.bodyMesh.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    this.applyLegPose(legPoseForJumpT(Math.min(t, 1), this.launchPower));

    if (t >= 1) {
      this.lastJumpTarget.copy(this.jump.target);
      this.jump = null;
      this.bodyMesh.scale.set(1, 1, 1);
      return true;
    }
    return false;
  }

  /** Lands at the real jump-landing point, clamped to stay visibly inside the surface's disc. */
  landOnSurface(surface: { position: THREE.Vector3; radius: number }): void {
    const dx = this.lastJumpTarget.x - surface.position.x;
    const dz = this.lastJumpTarget.z - surface.position.z;
    const dist = Math.hypot(dx, dz);
    const clampRadius = surface.radius * LANDING_VISUAL_INSET;

    if (dist > clampRadius && dist > 1e-6) {
      const scale = clampRadius / dist;
      this.group.position.set(surface.position.x + dx * scale, FROG_REST_Y, surface.position.z + dz * scale);
    } else {
      this.group.position.set(this.lastJumpTarget.x, FROG_REST_Y, this.lastJumpTarget.z);
    }

    this.state = FrogState.Idle;
    this.sinceLanded = 0;
  }

  sink(): void {
    this.state = FrogState.Sinking;
    this.sinkElapsed = 0;
  }

  respawnOnLilypad(pad: Lilypad): void {
    this.group.position.copy(pad.position);
    this.group.position.y = FROG_REST_Y;
    this.group.scale.set(1, 1, 1);
    this.bodyMesh.scale.set(1, 1, 1);
    this.state = FrogState.Idle;
    this.sinceLanded = LEG_LANDING_SETTLE_DURATION;
    this.applyLegPose(LEG_POSE_IDLE);
  }
}
