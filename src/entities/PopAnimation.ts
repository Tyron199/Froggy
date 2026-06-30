import * as THREE from 'three';
import {
  POP_DURATION,
  POP_DURATION_JITTER,
  POP_RIPPLE_LEAD,
  POP_STAGGER_JITTER,
  POP_STAGGER_STEP,
  POP_SUBMERGE_DEPTH,
} from '../game/constants.ts';

type PopState = 'pending' | 'rippling' | 'rising' | 'done';

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = t - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Drives a "rises from the water with an anticipation ripple, then bounces into place" spawn-in
 * animation for a mesh — shared by Lilypad and Log. `staggerIndex` offsets when a batch of several
 * spawns at once so they don't all pop in lockstep.
 */
export class PopAnimator {
  private readonly mesh: THREE.Group;
  private readonly restY: number;
  private readonly duration: number;
  private state: PopState;
  private delay = 0;
  private rippleElapsed = 0;
  private riseElapsed = 0;

  constructor(mesh: THREE.Group, instant: boolean, staggerIndex: number) {
    this.mesh = mesh;
    this.restY = mesh.position.y;
    this.duration = POP_DURATION * (1 + (Math.random() * 2 - 1) * POP_DURATION_JITTER);

    if (instant) {
      this.state = 'done';
      return;
    }

    this.state = 'pending';
    this.delay = staggerIndex * POP_STAGGER_STEP + Math.random() * POP_STAGGER_JITTER;
    this.mesh.visible = false;
    this.mesh.scale.setScalar(0.001);
    this.mesh.position.y = this.restY - POP_SUBMERGE_DEPTH;
  }

  get isReady(): boolean {
    return this.state === 'done';
  }

  /** Advances the animation. Returns 'ripple' the instant the anticipation cue should fire. */
  update(dt: number): 'ripple' | null {
    if (this.state === 'pending') {
      this.delay -= dt;
      if (this.delay <= 0) {
        this.state = 'rippling';
        return 'ripple';
      }
      return null;
    }

    if (this.state === 'rippling') {
      this.rippleElapsed += dt;
      if (this.rippleElapsed >= POP_RIPPLE_LEAD) {
        this.state = 'rising';
        this.mesh.visible = true;
      }
      return null;
    }

    if (this.state === 'rising') {
      this.riseElapsed += dt;
      const t = Math.min(1, this.riseElapsed / this.duration);
      this.mesh.scale.setScalar(Math.max(0.001, easeOutBack(t)));
      this.mesh.position.y = this.restY - POP_SUBMERGE_DEPTH * (1 - easeOutQuad(t));

      if (t >= 1) {
        this.state = 'done';
        this.mesh.scale.setScalar(1);
        this.mesh.position.y = this.restY;
      }
      return null;
    }

    return null;
  }
}
