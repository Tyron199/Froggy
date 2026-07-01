import * as THREE from 'three';
import { screenVectorToWorldDirection } from '../physics/vectorMath.ts';
import { clamp, lerp } from '../utils/math.ts';
import { MAX_JUMP_DIST, MAX_PULL_PX, MIN_JUMP_DIST, MIN_PULL_PX } from '../game/constants.ts';

export interface AimResult {
  target: THREE.Vector3;
  power: number;
}

export interface PullReleaseCallbacks {
  canAim: () => boolean;
  getFrogPosition: () => THREE.Vector3;
  getCamera: () => THREE.Camera;
  onAimStart: () => void;
  onAimUpdate: (aim: AimResult) => void;
  onAimCancel: () => void;
  onRelease: (aim: AimResult) => void;
  onTap: (screenX: number, screenY: number) => void;
}

const worldDir = new THREE.Vector3();

export class PullReleaseController {
  private readonly canvas: HTMLCanvasElement;
  private readonly callbacks: PullReleaseCallbacks;
  private activePointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: PullReleaseCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false });
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e), { passive: false });
    canvas.addEventListener('pointercancel', (e) => this.onPointerCancel(e), { passive: false });
  }

  private onPointerDown(event: PointerEvent): void {
    // Always suppress the browser's default touch behavior on the canvas (text selection,
    // callout menu) even when the game itself ignores this input (e.g. mid-jump).
    event.preventDefault();
    if (this.activePointerId !== null) return;
    if (!this.callbacks.canAim()) return;

    this.activePointerId = event.pointerId;
    this.canvas.setPointerCapture(event.pointerId);
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.callbacks.onAimStart();
  }

  private onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    event.preventDefault();

    const aim = this.computeAim(event.clientX, event.clientY);
    if (aim) this.callbacks.onAimUpdate(aim);
  }

  private onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    event.preventDefault();
    this.activePointerId = null;

    const pullX = this.dragStartX - event.clientX;
    const pullY = this.dragStartY - event.clientY;
    const pullMagnitude = Math.hypot(pullX, pullY);

    if (pullMagnitude < MIN_PULL_PX) {
      this.callbacks.onAimCancel();
      this.callbacks.onTap(event.clientX, event.clientY);
      return;
    }

    const aim = this.computeAim(event.clientX, event.clientY);
    if (aim) {
      this.callbacks.onRelease(aim);
    } else {
      this.callbacks.onAimCancel();
    }
  }

  private onPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.callbacks.onAimCancel();
  }

  private computeAim(currentX: number, currentY: number): AimResult | null {
    const pullX = clamp(this.dragStartX - currentX, -MAX_PULL_PX, MAX_PULL_PX);
    const pullY = clamp(this.dragStartY - currentY, -MAX_PULL_PX, MAX_PULL_PX);
    const pullMagnitudePx = clamp(Math.hypot(pullX, pullY), 0, MAX_PULL_PX);

    if (pullMagnitudePx < 1e-3) return null;

    const camera = this.callbacks.getCamera();
    screenVectorToWorldDirection({ x: pullX, y: pullY }, camera, worldDir);

    const power = clamp(pullMagnitudePx, MIN_PULL_PX, MAX_PULL_PX) / MAX_PULL_PX;
    const jumpDistance = lerp(MIN_JUMP_DIST, MAX_JUMP_DIST, power);

    const target = this.callbacks
      .getFrogPosition()
      .clone()
      .addScaledVector(worldDir, jumpDistance);

    return { target, power };
  }
}
