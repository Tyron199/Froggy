import * as THREE from 'three';
import {
  LOG_BODY_RADIUS,
  LOG_LENGTH,
  LOG_RADIUS,
  LOG_ROLL_SPEED_IDLE,
  LOG_ROLL_SPEED_MAX,
  LOG_STABLE_DURATION,
  LOG_TIP_DIP_DEPTH,
  LOG_TIP_RECOVER_DURATION,
} from '../game/constants.ts';
import { lerp } from '../utils/math.ts';

// Log ids live in a separate range from Lilypad ids so the two never collide when both are
// passed around as plain `{ id, position, radius }` landables.
let nextId = 1_000_000;

const BASE_COLOR = new THREE.Color(0x8a5a35);
const DANGER_COLOR = new THREE.Color(0xb33a2e);

export class Log {
  readonly id: number;
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;
  readonly radius: number;

  private readonly rollPivot: THREE.Group;
  private readonly bodyMaterial: THREE.MeshLambertMaterial;
  private rollSpeed = LOG_ROLL_SPEED_IDLE;
  private occupiedElapsed = 0;
  private fired = false;
  private tipElapsed: number | null = null;

  constructor(position: THREE.Vector3) {
    this.id = nextId++;
    this.position = position.clone();
    this.radius = LOG_RADIUS;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = Math.random() * Math.PI * 2;

    this.rollPivot = new THREE.Group();
    this.mesh.add(this.rollPivot);

    this.bodyMaterial = new THREE.MeshLambertMaterial({ color: BASE_COLOR.clone() });
    const bodyGeometry = new THREE.CylinderGeometry(LOG_BODY_RADIUS, LOG_BODY_RADIUS, LOG_LENGTH, 10);
    const body = new THREE.Mesh(bodyGeometry, this.bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    this.rollPivot.add(body);

    const capMaterial = new THREE.MeshLambertMaterial({ color: 0x6b3f22 });
    const capGeometry = new THREE.CylinderGeometry(LOG_BODY_RADIUS * 1.05, LOG_BODY_RADIUS * 1.05, 0.06, 10);
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(capGeometry, capMaterial);
      cap.rotation.z = Math.PI / 2;
      cap.position.x = side * (LOG_LENGTH / 2);
      this.rollPivot.add(cap);
    }
  }

  /** Advances the log's roll/danger state. Returns true the instant it tips while occupied. */
  update(dt: number, isOccupied: boolean): boolean {
    if (this.tipElapsed !== null) {
      this.tipElapsed += dt;
      const t = Math.min(1, this.tipElapsed / LOG_TIP_RECOVER_DURATION);
      this.mesh.position.y = this.position.y - LOG_TIP_DIP_DEPTH * (1 - t) * (1 - t);
      this.rollSpeed = lerp(LOG_ROLL_SPEED_MAX, LOG_ROLL_SPEED_IDLE, t);
      this.rollPivot.rotation.x += this.rollSpeed * dt;
      this.bodyMaterial.color.lerpColors(DANGER_COLOR, BASE_COLOR, t);
      if (t >= 1) {
        this.tipElapsed = null;
        this.occupiedElapsed = 0;
        this.fired = false;
      }
      return false;
    }

    if (isOccupied) {
      this.occupiedElapsed += dt;
    } else {
      this.occupiedElapsed = Math.max(0, this.occupiedElapsed - dt * 2);
      this.fired = false;
    }

    const dangerT = Math.min(1, this.occupiedElapsed / LOG_STABLE_DURATION);
    this.rollSpeed = lerp(LOG_ROLL_SPEED_IDLE, LOG_ROLL_SPEED_MAX, dangerT);
    this.rollPivot.rotation.x += this.rollSpeed * dt;
    this.bodyMaterial.color.lerpColors(BASE_COLOR, DANGER_COLOR, dangerT);

    if (isOccupied && !this.fired && dangerT >= 1) {
      this.fired = true;
      this.tipElapsed = 0;
      return true;
    }
    return false;
  }
}
