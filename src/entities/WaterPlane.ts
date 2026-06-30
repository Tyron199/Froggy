import * as THREE from 'three';

export class WaterPlane {
  readonly mesh: THREE.Mesh;

  constructor(size = 400) {
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshLambertMaterial({ color: 0x1e6f8c });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
  }

  /** Recenters the (finite) water plane under a world XZ point, so it reads as an infinite pond. */
  recenter(x: number, z: number): void {
    this.mesh.position.set(x, 0, z);
  }
}
