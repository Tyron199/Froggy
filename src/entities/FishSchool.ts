import * as THREE from 'three';
import { Fish } from './Fish.ts';
import { FISH_COUNT, FISH_HOME_RANGE, FISH_RECENTER_DISTANCE } from '../game/constants.ts';

/** A handful of cosmetic fish that wander near the frog, relocated as the endless pond scrolls. */
export class FishSchool {
  readonly group: THREE.Group;
  private readonly fish: Fish[] = [];

  constructor(origin: THREE.Vector3) {
    this.group = new THREE.Group();
    for (let i = 0; i < FISH_COUNT; i++) {
      const fish = new Fish(this.randomHomeNear(origin));
      this.fish.push(fish);
      this.group.add(fish.group);
    }
  }

  update(frogPos: THREE.Vector3, elapsedTime: number): void {
    for (const fish of this.fish) {
      if (fish.position.distanceTo(frogPos) > FISH_RECENTER_DISTANCE) fish.recenter(this.randomHomeNear(frogPos));
      fish.update(elapsedTime);
    }
  }

  private randomHomeNear(center: THREE.Vector3): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * FISH_HOME_RANGE;
    return new THREE.Vector3(center.x + Math.cos(angle) * radius, 0, center.z + Math.sin(angle) * radius);
  }
}
