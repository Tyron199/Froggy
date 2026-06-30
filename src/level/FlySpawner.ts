import * as THREE from 'three';
import { Lilypad } from '../entities/Lilypad.ts';
import { Fly } from '../entities/Fly.ts';
import { FLY_SPAWN_COUNT } from '../game/constants.ts';

export class FlySpawner {
  readonly flies: Fly[] = [];

  private readonly scene: THREE.Scene;
  private readonly lilypads: Lilypad[];
  private excludePad: Lilypad;

  constructor(scene: THREE.Scene, lilypads: Lilypad[], excludePad: Lilypad) {
    this.scene = scene;
    this.lilypads = lilypads;
    this.excludePad = excludePad;
  }

  spawnInitial(): void {
    while (this.flies.length < FLY_SPAWN_COUNT) {
      const pad = this.pickUnusedPad();
      if (!pad) break;
      this.spawnOn(pad);
    }
  }

  /** Clears all flies and reseeds, used on restart once the level has been regenerated. */
  reset(excludePad: Lilypad): void {
    for (const fly of [...this.flies]) this.remove(fly);
    this.excludePad = excludePad;
    this.spawnInitial();
  }

  /** Removes flies whose home lilypad has been recycled out of the live level, then tops up. */
  removeOrphans(): void {
    const liveIds = new Set(this.lilypads.map((pad) => pad.id));
    for (const fly of [...this.flies]) {
      if (!liveIds.has(fly.homeLilypad.id)) this.remove(fly);
    }
    this.topUp();
  }

  /** Spawns a replacement fly to keep the active count topped up, e.g. after a catch. */
  topUp(): void {
    if (this.flies.length >= FLY_SPAWN_COUNT) return;
    const pad = this.pickUnusedPad();
    if (pad) this.spawnOn(pad);
  }

  remove(fly: Fly): void {
    const index = this.flies.indexOf(fly);
    if (index === -1) return;
    this.flies.splice(index, 1);
    this.scene.remove(fly.group);
  }

  update(elapsedTime: number, dt: number): void {
    for (const fly of this.flies) fly.update(elapsedTime, dt);
  }

  private spawnOn(pad: Lilypad): void {
    const fly = new Fly(pad);
    this.flies.push(fly);
    this.scene.add(fly.group);
  }

  private pickUnusedPad(): Lilypad | null {
    const usedPadIds = new Set(this.flies.map((f) => f.homeLilypad.id));
    const candidates = this.lilypads.filter((pad) => pad.id !== this.excludePad.id && !usedPadIds.has(pad.id));
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
}
