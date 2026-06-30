import * as THREE from 'three';
import { FISH_COLOR, FISH_DEPTH, FISH_FIN_HEIGHT, FISH_LENGTH, FISH_WANDER_RADIUS, FISH_WANDER_SPEED } from '../game/constants.ts';

/**
 * A small, purely cosmetic fish wandering near the surface. Its body sits below y=0 (hidden for
 * free by the water plane's opaque depth occlusion) with only a small dorsal fin poking above.
 */
export class Fish {
  readonly group: THREE.Group;
  private readonly home = new THREE.Vector3();
  private readonly phaseX: number;
  private readonly phaseZ: number;
  private heading = 0;

  constructor(home: THREE.Vector3) {
    this.home.copy(home);
    this.phaseX = Math.random() * Math.PI * 2;
    this.phaseZ = Math.random() * Math.PI * 2;

    this.group = new THREE.Group();
    this.group.position.copy(home);

    const material = new THREE.MeshLambertMaterial({ color: FISH_COLOR });

    const bodyGeometry = new THREE.SphereGeometry(FISH_LENGTH / 2, 8, 6);
    bodyGeometry.scale(1.5, 0.55, 0.85);
    const body = new THREE.Mesh(bodyGeometry, material);
    body.position.y = -FISH_DEPTH;
    this.group.add(body);

    const finGeometry = new THREE.ConeGeometry(0.045, FISH_FIN_HEIGHT, 4);
    const fin = new THREE.Mesh(finGeometry, material);
    fin.position.set(0, -FISH_DEPTH + FISH_FIN_HEIGHT * 0.3, 0);
    this.group.add(fin);
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  /** Relocates the fish's wander point, e.g. once it's drifted out of the active play area. */
  recenter(home: THREE.Vector3): void {
    this.home.copy(home);
  }

  update(elapsedTime: number): void {
    const x = this.home.x + Math.sin(elapsedTime * FISH_WANDER_SPEED + this.phaseX) * FISH_WANDER_RADIUS;
    const z = this.home.z + Math.cos(elapsedTime * FISH_WANDER_SPEED * 0.7 + this.phaseZ) * FISH_WANDER_RADIUS;

    const dx = x - this.group.position.x;
    const dz = z - this.group.position.z;
    if (Math.abs(dx) > 1e-4 || Math.abs(dz) > 1e-4) this.heading = Math.atan2(dx, dz);

    this.group.position.set(x, 0, z);
    this.group.rotation.y = this.heading;
  }
}
