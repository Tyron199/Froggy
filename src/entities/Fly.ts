import * as THREE from 'three';
import { Lilypad } from './Lilypad.ts';
import {
  FLY_ANCHOR_OFFSET_RANGE,
  FLY_FLEE_DURATION,
  FLY_HITBOX_RADIUS,
  FLY_HOVER_AMPLITUDE_XZ,
  FLY_HOVER_AMPLITUDE_Y,
  FLY_HOVER_SPEED,
  FLY_NO_RETAP_MS,
  FLY_REST_Y,
} from '../game/constants.ts';

export const FlyState = {
  Idle: 'idle',
  Fleeing: 'fleeing',
} as const;
export type FlyState = (typeof FlyState)[keyof typeof FlyState];

let nextId = 0;

export class Fly {
  readonly id: number;
  readonly group: THREE.Group;
  readonly hitboxMesh: THREE.Mesh;
  homeLilypad: Lilypad;
  state: FlyState = FlyState.Idle;
  noRetapUntil = 0;

  private readonly phase: number;
  private readonly anchor = new THREE.Vector3();
  private readonly fleeStart = new THREE.Vector3();
  private readonly fleeTarget = new THREE.Vector3();
  private fleeElapsed = 0;

  constructor(homeLilypad: Lilypad) {
    this.id = nextId++;
    this.homeLilypad = homeLilypad;
    this.phase = Math.random() * Math.PI * 2;
    this.setAnchorNearLilypad(homeLilypad);

    this.group = new THREE.Group();
    this.group.position.copy(this.anchor);

    const bodyGeometry = new THREE.SphereGeometry(0.1, 8, 6);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.group.add(body);

    const wingGeometry = new THREE.PlaneGeometry(0.16, 0.08);
    const wingMaterial = new THREE.MeshBasicMaterial({
      color: 0xdfeffc,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeometry, wingMaterial);
      wing.position.set(side * 0.1, 0.04, 0);
      wing.rotation.y = side * 0.4;
      this.group.add(wing);
    }

    const hitboxGeometry = new THREE.SphereGeometry(FLY_HITBOX_RADIUS, 8, 6);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    this.hitboxMesh.userData.fly = this;
    this.group.add(this.hitboxMesh);
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  private setAnchorNearLilypad(pad: Lilypad): void {
    const angle = Math.random() * Math.PI * 2;
    const offset = FLY_ANCHOR_OFFSET_RANGE * (0.5 + Math.random() * 0.5);
    this.anchor.set(pad.position.x + Math.cos(angle) * offset, FLY_REST_Y, pad.position.z + Math.sin(angle) * offset);
  }

  update(elapsedTime: number, dt: number): void {
    if (this.state === FlyState.Fleeing) {
      this.fleeElapsed += dt;
      const t = Math.min(this.fleeElapsed / FLY_FLEE_DURATION, 1);
      this.anchor.lerpVectors(this.fleeStart, this.fleeTarget, t);
      this.anchor.y = FLY_REST_Y + Math.sin(t * Math.PI) * 0.4;
      if (t >= 1) {
        this.state = FlyState.Idle;
        this.anchor.y = FLY_REST_Y;
      }
    }

    const t = elapsedTime * FLY_HOVER_SPEED + this.phase;
    this.group.position.set(
      this.anchor.x + Math.sin(t) * FLY_HOVER_AMPLITUDE_XZ,
      this.anchor.y + Math.abs(Math.sin(t * 1.3)) * FLY_HOVER_AMPLITUDE_Y,
      this.anchor.z + Math.cos(t) * FLY_HOVER_AMPLITUDE_XZ,
    );
  }

  /** Tweens the fly's hover anchor to a spot near `newHome`, with a brief no-retap window. */
  flee(newHome: Lilypad): void {
    this.fleeStart.copy(this.anchor);
    this.homeLilypad = newHome;
    const angle = Math.random() * Math.PI * 2;
    const offset = FLY_ANCHOR_OFFSET_RANGE * (0.5 + Math.random() * 0.5);
    this.fleeTarget.set(
      newHome.position.x + Math.cos(angle) * offset,
      FLY_REST_Y,
      newHome.position.z + Math.sin(angle) * offset,
    );
    this.fleeElapsed = 0;
    this.state = FlyState.Fleeing;
    this.noRetapUntil = performance.now() + FLY_NO_RETAP_MS;
  }
}
