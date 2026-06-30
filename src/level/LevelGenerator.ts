import * as THREE from 'three';
import { Lilypad } from '../entities/Lilypad.ts';
import { Log } from '../entities/Log.ts';
import type { Landable } from '../physics/jumpTrajectory.ts';
import { LILYPAD_MAX_RADIUS, LILYPAD_MIN_RADIUS, LILYPAD_RADIUS, LOG_SPAWN_CHANCE, MAX_JUMP_DIST } from '../game/constants.ts';

const RING_WIDTH = 4.2;
const FIRST_RING_INNER_RADIUS = 1.6;
const MIN_PAD_SPACING = 2.6;
/** Target distance between neighboring pads along a ring's circumference. */
const PAD_SPACING_TARGET = 4.4;
const REACHABLE_FRACTION = 0.85;
const MAX_PLACEMENT_ATTEMPTS = 30;

/** Frog must be within this many units of the frontier before the next ring is generated. */
const FRONTIER_BUFFER = 5;
/** Pads/logs farther than this from the frog are recycled (unless protected). */
const RECYCLE_DISTANCE = 16;

export class LevelGenerator {
  readonly pads: Lilypad[] = [];
  readonly logs: Log[] = [];

  private readonly scene: THREE.Scene;
  private frontierRadius = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Clears any existing pads/logs and generates a fresh starting cluster. Returns the origin pad. */
  seed(): Lilypad {
    for (const pad of this.pads) this.scene.remove(pad.mesh);
    for (const log of this.logs) this.scene.remove(log.mesh);
    this.pads.length = 0;
    this.logs.length = 0;
    this.frontierRadius = 0;

    const start = this.addPad(new THREE.Vector3(0, 0, 0), true, 0, LILYPAD_RADIUS);
    this.generateNextRing(true);
    this.generateNextRing(true);
    return start;
  }

  /** Expands the frontier as the frog approaches it, and recycles pads/logs left far behind. */
  update(frogPosition: THREE.Vector3, protectedIds: ReadonlySet<number>): void {
    if (frogPosition.length() > this.frontierRadius - FRONTIER_BUFFER) {
      this.generateNextRing(false);
    }
    this.recycleFar(frogPosition, protectedIds);
  }

  private allLandables(): Landable[] {
    return [...this.pads, ...this.logs];
  }

  private addPad(position: THREE.Vector3, instant: boolean, staggerIndex: number, radius = randomPadRadius()): Lilypad {
    const pad = new Lilypad(position, radius, instant, staggerIndex);
    this.pads.push(pad);
    this.scene.add(pad.mesh);
    return pad;
  }

  private addLog(position: THREE.Vector3, instant: boolean, staggerIndex: number): Log {
    const log = new Log(position, instant, staggerIndex);
    this.logs.push(log);
    this.scene.add(log.mesh);
    return log;
  }

  private generateNextRing(instant: boolean): void {
    const innerR = this.pads.length + this.logs.length <= 1 ? FIRST_RING_INNER_RADIUS : this.frontierRadius;
    const outerR = innerR + RING_WIDTH;
    const circumference = 2 * Math.PI * ((innerR + outerR) / 2);
    const count = Math.max(4, Math.round(circumference / PAD_SPACING_TARGET));

    for (let i = 0; i < count; i++) {
      const candidate = this.findPlacement(innerR, outerR);
      if (!candidate) continue;
      if (Math.random() < LOG_SPAWN_CHANCE) this.addLog(candidate, instant, i);
      else this.addPad(candidate, instant, i);
    }

    this.frontierRadius = outerR;
  }

  private findPlacement(innerR: number, outerR: number): THREE.Vector3 | null {
    const candidate = new THREE.Vector3();
    const landables = this.allLandables();
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = innerR + Math.random() * (outerR - innerR);
      candidate.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

      let tooClose = false;
      let reachable = false;
      for (const landable of landables) {
        const dist = landable.position.distanceTo(candidate);
        if (dist < MIN_PAD_SPACING) {
          tooClose = true;
          break;
        }
        if (dist <= MAX_JUMP_DIST * REACHABLE_FRACTION) reachable = true;
      }
      if (!tooClose && reachable) return candidate.clone();
    }
    return null;
  }

  private recycleFar(frogPosition: THREE.Vector3, protectedIds: ReadonlySet<number>): void {
    for (let i = this.pads.length - 1; i >= 0; i--) {
      const pad = this.pads[i];
      if (protectedIds.has(pad.id)) continue;
      if (pad.position.distanceTo(frogPosition) > RECYCLE_DISTANCE) {
        this.scene.remove(pad.mesh);
        this.pads.splice(i, 1);
      }
    }
    for (let i = this.logs.length - 1; i >= 0; i--) {
      const log = this.logs[i];
      if (protectedIds.has(log.id)) continue;
      if (log.position.distanceTo(frogPosition) > RECYCLE_DISTANCE) {
        this.scene.remove(log.mesh);
        this.logs.splice(i, 1);
      }
    }
  }
}

/** Soft bell-curve radius (average of two rolls) so most pads cluster near the middle of the range. */
function randomPadRadius(): number {
  const t = (Math.random() + Math.random()) / 2;
  return LILYPAD_MIN_RADIUS + t * (LILYPAD_MAX_RADIUS - LILYPAD_MIN_RADIUS);
}
