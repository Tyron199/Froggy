import * as THREE from 'three';
import { Lilypad } from '../entities/Lilypad.ts';
import { MAX_JUMP_DIST, MIN_JUMP_DIST } from '../game/constants.ts';

const RING_WIDTH = 4.2;
const FIRST_RING_INNER_RADIUS = 1.6;
const MIN_PAD_SPACING = 1.8;
const REACHABLE_FRACTION = 0.85;
const MAX_PLACEMENT_ATTEMPTS = 20;

/** Frog must be within this many units of the frontier before the next ring is generated. */
const FRONTIER_BUFFER = 5;
/** Pads farther than this from the frog are recycled (unless protected). */
const RECYCLE_DISTANCE = 16;

export class LevelGenerator {
  readonly pads: Lilypad[] = [];

  private readonly scene: THREE.Scene;
  private frontierRadius = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Clears any existing pads and generates a fresh starting cluster. Returns the origin pad. */
  seed(): Lilypad {
    for (const pad of this.pads) this.scene.remove(pad.mesh);
    this.pads.length = 0;
    this.frontierRadius = 0;

    const start = this.addPad(new THREE.Vector3(0, 0, 0));
    this.generateNextRing();
    this.generateNextRing();
    return start;
  }

  /** Expands the frontier as the frog approaches it, and recycles pads left far behind. */
  update(frogPosition: THREE.Vector3, protectedPadIds: ReadonlySet<number>): void {
    if (frogPosition.length() > this.frontierRadius - FRONTIER_BUFFER) {
      this.generateNextRing();
    }
    this.recycleFarPads(frogPosition, protectedPadIds);
  }

  private addPad(position: THREE.Vector3): Lilypad {
    const pad = new Lilypad(position);
    this.pads.push(pad);
    this.scene.add(pad.mesh);
    return pad;
  }

  private generateNextRing(): void {
    const innerR = this.pads.length <= 1 ? FIRST_RING_INNER_RADIUS : this.frontierRadius;
    const outerR = innerR + RING_WIDTH;
    const circumference = 2 * Math.PI * ((innerR + outerR) / 2);
    const count = Math.max(5, Math.round(circumference / (MIN_JUMP_DIST + 1)));

    for (let i = 0; i < count; i++) {
      const candidate = this.findPlacement(innerR, outerR);
      if (candidate) this.addPad(candidate);
    }

    this.frontierRadius = outerR;
  }

  private findPlacement(innerR: number, outerR: number): THREE.Vector3 | null {
    const candidate = new THREE.Vector3();
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = innerR + Math.random() * (outerR - innerR);
      candidate.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

      let tooClose = false;
      let reachable = false;
      for (const pad of this.pads) {
        const dist = pad.position.distanceTo(candidate);
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

  private recycleFarPads(frogPosition: THREE.Vector3, protectedPadIds: ReadonlySet<number>): void {
    for (let i = this.pads.length - 1; i >= 0; i--) {
      const pad = this.pads[i];
      if (protectedPadIds.has(pad.id)) continue;
      if (pad.position.distanceTo(frogPosition) > RECYCLE_DISTANCE) {
        this.scene.remove(pad.mesh);
        this.pads.splice(i, 1);
      }
    }
  }
}
