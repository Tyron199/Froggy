import * as THREE from 'three';

const worldUp = new THREE.Vector3(0, 1, 0);
const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();

/**
 * Converts a 2D screen-space vector (e.g. a slingshot launch vector, in pixels)
 * into a normalized world-space XZ direction, relative to the camera's
 * ground-projected forward/right basis. Screen "up" maps to "away from camera",
 * screen "right" maps to "camera's right" on the ground plane.
 */
export function screenVectorToWorldDirection(
  screen: { x: number; y: number },
  camera: THREE.Camera,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  camera.getWorldDirection(tmpForward);
  tmpForward.y = 0;
  tmpForward.normalize();

  tmpRight.crossVectors(tmpForward, worldUp).normalize();

  out.set(0, 0, 0);
  out.addScaledVector(tmpRight, screen.x);
  out.addScaledVector(tmpForward, -screen.y);

  if (out.lengthSq() < 1e-8) out.copy(tmpForward);
  return out.normalize();
}
