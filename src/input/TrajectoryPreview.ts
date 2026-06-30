import * as THREE from 'three';
import { buildJump, positionAtT } from '../physics/jumpTrajectory.ts';

const ARC_SAMPLES = 24;
const SUCCESS_COLOR = 0x6fe06f;
const FAIL_COLOR = 0xe05a5a;

export class TrajectoryPreview {
  readonly group: THREE.Group;
  private readonly line: THREE.Line;
  private readonly lineGeometry: THREE.BufferGeometry;
  private readonly ring: THREE.Mesh;
  private readonly ringMaterial: THREE.MeshBasicMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array((ARC_SAMPLES + 1) * 3), 3),
    );
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    this.line = new THREE.Line(this.lineGeometry, lineMaterial);
    this.group.add(this.line);

    this.ringMaterial = new THREE.MeshBasicMaterial({ color: SUCCESS_COLOR, transparent: true, opacity: 0.6 });
    const ringGeometry = new THREE.RingGeometry(0.7, 0.95, 24);
    this.ring = new THREE.Mesh(ringGeometry, this.ringMaterial);
    this.ring.rotation.x = -Math.PI / 2;
    this.group.add(this.ring);
  }

  show(): void {
    this.group.visible = true;
  }

  hide(): void {
    this.group.visible = false;
  }

  update(start: THREE.Vector3, target: THREE.Vector3, power: number, willSucceed: boolean): void {
    const jump = buildJump(start, target, power);
    const positions = this.lineGeometry.attributes.position as THREE.BufferAttribute;
    const point = new THREE.Vector3();

    for (let i = 0; i <= ARC_SAMPLES; i++) {
      positionAtT(jump, i / ARC_SAMPLES, point);
      positions.setXYZ(i, point.x, point.y, point.z);
    }
    positions.needsUpdate = true;
    this.lineGeometry.computeBoundingSphere();

    this.ring.position.set(target.x, 0.02, target.z);
    this.ringMaterial.color.setHex(willSucceed ? SUCCESS_COLOR : FAIL_COLOR);
  }
}
