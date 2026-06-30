import * as THREE from 'three';
import {
  WATER_COLOR_BASE,
  WATER_COLOR_CREST,
  WATER_COLOR_TROUGH,
  WATER_SEGMENTS,
  WATER_SIZE,
  WATER_WAVE_AMPLITUDE,
  WATER_WAVE_FREQUENCY,
  WATER_WAVE_SECONDARY_AMPLITUDE,
  WATER_WAVE_SECONDARY_FREQUENCY,
  WATER_WAVE_SECONDARY_SPEED,
  WATER_WAVE_SPEED,
} from '../game/constants.ts';

const MAX_WAVE_HEIGHT = WATER_WAVE_AMPLITUDE + WATER_WAVE_SECONDARY_AMPLITUDE;
const baseColor = new THREE.Color(WATER_COLOR_BASE);
const crestColor = new THREE.Color(WATER_COLOR_CREST);
const troughColor = new THREE.Color(WATER_COLOR_TROUGH);

export class WaterPlane {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly tmpColor = new THREE.Color();

  constructor(size = WATER_SIZE) {
    this.geometry = new THREE.PlaneGeometry(size, size, WATER_SEGMENTS, WATER_SEGMENTS);
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(this.geometry.attributes.position.count * 3), 3),
    );
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      vertexColors: true,
      specular: 0x9fd8ff,
      shininess: 70,
    });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
  }

  /** Recenters the (finite) water plane under a world XZ point, so it reads as an infinite pond. */
  recenter(x: number, z: number): void {
    this.mesh.position.set(x, 0, z);
  }

  /**
   * Rolls a gentle two-wave swell across the surface via CPU vertex displacement, using world-space
   * coordinates (local vertex + mesh position) so the pattern reads as a stable field rather than
   * drifting with the camera as the plane recenters under the frog. Vertex colors brighten at crests
   * and darken in troughs so the motion reads clearly regardless of lighting/camera angle.
   */
  update(elapsedTime: number): void {
    const position = this.geometry.attributes.position;
    const color = this.geometry.attributes.color;
    const offsetX = this.mesh.position.x;
    const offsetZ = this.mesh.position.z;

    for (let i = 0; i < position.count; i++) {
      const worldX = position.getX(i) + offsetX;
      const worldZ = -position.getY(i) + offsetZ;
      const wave =
        Math.sin(worldX * WATER_WAVE_FREQUENCY + worldZ * WATER_WAVE_FREQUENCY * 0.6 + elapsedTime * WATER_WAVE_SPEED) *
          WATER_WAVE_AMPLITUDE +
        Math.sin(
          worldX * WATER_WAVE_SECONDARY_FREQUENCY * 1.3 -
            worldZ * WATER_WAVE_SECONDARY_FREQUENCY +
            elapsedTime * WATER_WAVE_SECONDARY_SPEED,
        ) * WATER_WAVE_SECONDARY_AMPLITUDE;
      position.setZ(i, wave);

      const t = THREE.MathUtils.clamp(wave / MAX_WAVE_HEIGHT, -1, 1);
      this.tmpColor.copy(baseColor).lerp(t >= 0 ? crestColor : troughColor, Math.abs(t) * 0.8);
      color.setXYZ(i, this.tmpColor.r, this.tmpColor.g, this.tmpColor.b);
    }

    position.needsUpdate = true;
    color.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
