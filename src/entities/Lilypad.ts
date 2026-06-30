import * as THREE from 'three';
import { LILYPAD_HEIGHT, LILYPAD_RADIUS } from '../game/constants.ts';

let nextId = 0;

export class Lilypad {
  readonly id: number;
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;
  readonly radius: number;
  occupied = false;

  constructor(position: THREE.Vector3, radius = LILYPAD_RADIUS) {
    this.id = nextId++;
    this.position = position.clone();
    this.radius = radius;

    this.mesh = new THREE.Group();

    const padGeometry = new THREE.CylinderGeometry(radius, radius * 0.95, LILYPAD_HEIGHT, 16);
    const padMaterial = new THREE.MeshLambertMaterial({ color: 0x3fa34d });
    const pad = new THREE.Mesh(padGeometry, padMaterial);
    pad.castShadow = true;
    pad.receiveShadow = true;
    this.mesh.add(pad);

    // Notch wedge to read as a classic lilypad silhouette.
    const notchGeometry = new THREE.CylinderGeometry(
      radius * 1.01,
      radius * 0.96,
      LILYPAD_HEIGHT + 0.02,
      16,
      1,
      false,
      0,
      Math.PI / 8,
    );
    const notchMaterial = new THREE.MeshLambertMaterial({ color: 0x2d7a3a });
    const notch = new THREE.Mesh(notchGeometry, notchMaterial);
    this.mesh.add(notch);

    this.mesh.position.copy(this.position);
  }
}
