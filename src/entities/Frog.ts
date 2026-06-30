import * as THREE from 'three';
import { Lilypad } from './Lilypad.ts';
import { FROG_REST_Y } from '../game/constants.ts';
import { buildJump, positionAtT, type JumpParams } from '../physics/jumpTrajectory.ts';

const SINK_DURATION = 0.6;

export const FrogState = {
  Idle: 'idle',
  Jumping: 'jumping',
  Sinking: 'sinking',
} as const;
export type FrogState = (typeof FrogState)[keyof typeof FrogState];

export class Frog {
  readonly group: THREE.Group;
  state: FrogState = FrogState.Idle;
  currentLilypad: Lilypad | null = null;

  private jump: JumpParams | null = null;
  private elapsed = 0;
  private sinkElapsed = 0;
  private readonly bodyMesh: THREE.Mesh;

  constructor(startLilypad: Lilypad) {
    this.currentLilypad = startLilypad;
    this.group = new THREE.Group();

    const bodyGeometry = new THREE.SphereGeometry(0.32, 16, 12);
    bodyGeometry.scale(1, 0.7, 1.15);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.position.y = 0.18;
    this.group.add(this.bodyMesh);

    const eyeGeometry = new THREE.SphereGeometry(0.09, 10, 8);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
    const pupilGeometry = new THREE.SphereGeometry(0.045, 8, 6);
    const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(side * 0.15, 0.36, 0.18);
      this.group.add(eye);

      const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
      pupil.position.set(side * 0.15, 0.36, 0.25);
      this.group.add(pupil);
    }

    this.group.position.copy(startLilypad.position);
    this.group.position.y = FROG_REST_Y;
  }

  /** Starts a parabolic jump toward `target`, using `power` (0..1) to set arc duration/height. */
  startJump(target: THREE.Vector3, power: number): void {
    const start = this.group.position.clone();
    start.y = FROG_REST_Y;
    const end = target.clone();
    end.y = FROG_REST_Y;

    this.jump = buildJump(start, end, power);
    this.elapsed = 0;
    this.state = FrogState.Jumping;
    this.currentLilypad = null;

    const dir = new THREE.Vector3().subVectors(end, start);
    if (dir.lengthSq() > 1e-6) {
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }

  /** Advances the active jump tween. Returns true the frame the jump completes. */
  update(dt: number): boolean {
    if (this.state === FrogState.Sinking) {
      this.sinkElapsed += dt;
      const sinkT = Math.min(this.sinkElapsed / SINK_DURATION, 1);
      this.group.position.y = FROG_REST_Y - sinkT * 0.5;
      const scale = 1 - sinkT;
      this.group.scale.set(scale, scale, scale);
      return false;
    }

    if (this.state !== FrogState.Jumping || !this.jump) return false;

    this.elapsed += dt;
    const t = this.elapsed / this.jump.duration;
    positionAtT(this.jump, t, this.group.position);

    const squash = 1 + Math.sin(Math.min(t, 1) * Math.PI) * 0.25;
    this.bodyMesh.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

    if (t >= 1) {
      this.jump = null;
      this.bodyMesh.scale.set(1, 1, 1);
      return true;
    }
    return false;
  }

  landOnLilypad(pad: Lilypad): void {
    this.currentLilypad = pad;
    this.group.position.copy(pad.position);
    this.group.position.y = FROG_REST_Y;
    this.state = FrogState.Idle;
  }

  sink(): void {
    this.state = FrogState.Sinking;
    this.sinkElapsed = 0;
  }

  respawnOnLilypad(pad: Lilypad): void {
    this.currentLilypad = pad;
    this.group.position.copy(pad.position);
    this.group.position.y = FROG_REST_Y;
    this.group.scale.set(1, 1, 1);
    this.bodyMesh.scale.set(1, 1, 1);
    this.state = FrogState.Idle;
  }
}
