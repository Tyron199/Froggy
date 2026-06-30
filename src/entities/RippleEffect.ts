import * as THREE from 'three';
import { RIPPLE_DURATION, RIPPLE_MAX_SCALE, RIPPLE_POOL_SIZE } from '../game/constants.ts';
import { lerp } from '../utils/math.ts';

interface RippleSlot {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  elapsed: number;
  duration: number;
  startOpacity: number;
  active: boolean;
}

/** Pooled, expanding-ring water ripples. Call spawn() to trigger one, update() every frame. */
export class RippleEffect {
  readonly group: THREE.Group;
  private readonly slots: RippleSlot[] = [];
  private nextSlot = 0;

  constructor() {
    this.group = new THREE.Group();
    const geometry = new THREE.RingGeometry(0.4, 0.55, 24);

    for (let i = 0; i < RIPPLE_POOL_SIZE; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xeaf6ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.group.add(mesh);
      this.slots.push({ mesh, material, elapsed: 0, duration: RIPPLE_DURATION, startOpacity: 0, active: false });
    }
  }

  spawn(position: THREE.Vector3, opacity = 0.55, duration = RIPPLE_DURATION): void {
    const slot = this.slots[this.nextSlot];
    this.nextSlot = (this.nextSlot + 1) % this.slots.length;

    slot.active = true;
    slot.elapsed = 0;
    slot.duration = duration;
    slot.startOpacity = opacity;
    slot.mesh.position.set(position.x, 0.03, position.z);
    slot.mesh.scale.setScalar(0.1);
    slot.mesh.visible = true;
    slot.material.opacity = opacity;
  }

  update(dt: number): void {
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.elapsed += dt;
      const t = Math.min(1, slot.elapsed / slot.duration);
      const easeOut = 1 - (1 - t) * (1 - t);

      slot.mesh.scale.setScalar(lerp(0.1, RIPPLE_MAX_SCALE, easeOut));
      slot.material.opacity = lerp(slot.startOpacity, 0, t);

      if (t >= 1) {
        slot.active = false;
        slot.mesh.visible = false;
      }
    }
  }
}
