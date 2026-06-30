import * as THREE from 'three';
import { CATCH_BURST_COUNT, CATCH_BURST_DURATION, CATCH_BURST_SPEED } from '../game/constants.ts';
import { lerp } from '../utils/math.ts';

const MAX_SIMULTANEOUS_BURSTS = 3;
const GRAVITY = -2.5;

interface ParticleSlot {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  velocity: THREE.Vector3;
  elapsed: number;
  duration: number;
  active: boolean;
}

/** Small pooled sparkle burst that pops out when a fly is caught, hiding its abrupt removal. */
export class CatchBurst {
  readonly group: THREE.Group;
  private readonly slots: ParticleSlot[] = [];
  private nextSlot = 0;

  constructor() {
    this.group = new THREE.Group();
    const geometry = new THREE.SphereGeometry(0.06, 6, 5);

    const poolSize = CATCH_BURST_COUNT * MAX_SIMULTANEOUS_BURSTS;
    for (let i = 0; i < poolSize; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.group.add(mesh);
      this.slots.push({ mesh, material, velocity: new THREE.Vector3(), elapsed: 0, duration: CATCH_BURST_DURATION, active: false });
    }
  }

  spawn(position: THREE.Vector3): void {
    for (let i = 0; i < CATCH_BURST_COUNT; i++) {
      const slot = this.slots[this.nextSlot];
      this.nextSlot = (this.nextSlot + 1) % this.slots.length;

      // Random direction within an upward-biased hemisphere, with per-particle speed/lifetime jitter.
      const angle = Math.random() * Math.PI * 2;
      const upward = 0.4 + Math.random() * 0.6;
      const outward = Math.sqrt(1 - upward * upward);
      const speed = CATCH_BURST_SPEED * (0.6 + Math.random() * 0.8);

      slot.velocity.set(Math.cos(angle) * outward * speed, upward * speed, Math.sin(angle) * outward * speed);
      slot.elapsed = 0;
      slot.duration = CATCH_BURST_DURATION * (0.75 + Math.random() * 0.5);
      slot.active = true;
      slot.mesh.position.copy(position);
      slot.mesh.scale.setScalar(0.6 + Math.random() * 0.6);
      slot.mesh.visible = true;
      slot.material.opacity = 1;
    }
  }

  update(dt: number): void {
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.elapsed += dt;
      const t = Math.min(1, slot.elapsed / slot.duration);

      slot.velocity.y += GRAVITY * dt;
      slot.mesh.position.addScaledVector(slot.velocity, dt);
      slot.material.opacity = lerp(1, 0, t);

      if (t >= 1) {
        slot.active = false;
        slot.mesh.visible = false;
      }
    }
  }
}
