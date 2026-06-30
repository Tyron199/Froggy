import * as THREE from 'three';
import { CAMERA_OFFSET, CAMERA_DAMPING_LAMBDA } from '../game/constants.ts';
import { damp } from '../utils/math.ts';

const offset = new THREE.Vector3(CAMERA_OFFSET.x, CAMERA_OFFSET.y, CAMERA_OFFSET.z);

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private readonly desiredPosition = new THREE.Vector3();
  private readonly desiredLookAt = new THREE.Vector3();
  private readonly currentLookAt = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
    this.camera.position.copy(offset);
    this.currentLookAt.set(0, 0, 0);
    this.camera.lookAt(this.currentLookAt);
  }

  snapTo(target: THREE.Vector3): void {
    this.desiredPosition.copy(target).add(offset);
    this.camera.position.copy(this.desiredPosition);
    this.currentLookAt.copy(target);
    this.camera.lookAt(this.currentLookAt);
  }

  update(target: THREE.Vector3, dt: number): void {
    this.desiredPosition.copy(target).add(offset);
    this.camera.position.x = damp(this.camera.position.x, this.desiredPosition.x, CAMERA_DAMPING_LAMBDA, dt);
    this.camera.position.y = damp(this.camera.position.y, this.desiredPosition.y, CAMERA_DAMPING_LAMBDA, dt);
    this.camera.position.z = damp(this.camera.position.z, this.desiredPosition.z, CAMERA_DAMPING_LAMBDA, dt);

    this.desiredLookAt.copy(target);
    this.currentLookAt.x = damp(this.currentLookAt.x, this.desiredLookAt.x, CAMERA_DAMPING_LAMBDA, dt);
    this.currentLookAt.y = damp(this.currentLookAt.y, this.desiredLookAt.y, CAMERA_DAMPING_LAMBDA, dt);
    this.currentLookAt.z = damp(this.currentLookAt.z, this.desiredLookAt.z, CAMERA_DAMPING_LAMBDA, dt);
    this.camera.lookAt(this.currentLookAt);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
