import * as THREE from 'three';
import { CameraRig } from '../camera/CameraRig.ts';
import { WaterPlane } from '../entities/WaterPlane.ts';
import { Lilypad } from '../entities/Lilypad.ts';
import { Frog, FrogState } from '../entities/Frog.ts';
import { GameStatus, GameStore } from './GameState.ts';
import { SettingsStore } from './SettingsState.ts';
import { findLandingLilypad } from '../physics/jumpTrajectory.ts';
import { PullReleaseController, type AimResult } from '../input/PullReleaseController.ts';
import { TrajectoryPreview } from '../input/TrajectoryPreview.ts';
import { HUD } from '../ui/HUD.ts';
import { GameOverScreen } from '../ui/GameOverScreen.ts';
import { SettingsPanel } from '../ui/SettingsPanel.ts';
import { FlySpawner } from '../level/FlySpawner.ts';
import { LevelGenerator } from '../level/LevelGenerator.ts';
import { Fly } from '../entities/Fly.ts';
import { TONGUE_RANGE } from './constants.ts';

const RESPAWN_DELAY_MS = 700;
const FLEE_CANDIDATE_POOL = 3;

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly cameraRig: CameraRig;
  private readonly clock = new THREE.Clock();
  private readonly trajectoryPreview = new TrajectoryPreview();
  private readonly water = new WaterPlane();
  private readonly sun = new THREE.DirectionalLight(0xfff4d6, 1.1);

  readonly store = new GameStore();
  readonly settingsStore = new SettingsStore();
  readonly frog: Frog;

  get lilypads(): Lilypad[] {
    return this.levelGenerator.pads;
  }

  get flies(): Fly[] {
    return this.flySpawner.flies;
  }

  get camera(): THREE.Camera {
    return this.cameraRig.camera;
  }

  private readonly canvas: HTMLCanvasElement;
  private readonly gameOverScreen: GameOverScreen;
  private readonly levelGenerator: LevelGenerator;
  private readonly flySpawner: FlySpawner;
  private readonly raycaster = new THREE.Raycaster();
  private pendingLandingPad: Lilypad | null = null;
  private lastSafeLilypad: Lilypad;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.cameraRig = new CameraRig(window.innerWidth / window.innerHeight);

    this.setupLighting();
    this.setupWater();
    this.levelGenerator = new LevelGenerator(this.scene);
    const startPad = this.levelGenerator.seed();
    this.lastSafeLilypad = startPad;

    this.frog = new Frog(startPad);
    this.scene.add(this.frog.group);
    this.scene.add(this.trajectoryPreview.group);

    this.flySpawner = new FlySpawner(this.scene, this.lilypads, startPad);
    this.flySpawner.spawnInitial();

    new HUD(uiRoot, this.store);
    this.gameOverScreen = new GameOverScreen(uiRoot, () => this.restart());
    new SettingsPanel(uiRoot, this.settingsStore);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => this.resize());

    new PullReleaseController(this.canvas, {
      canAim: () => this.frog.state === FrogState.Idle && this.store.status === GameStatus.Playing,
      getFrogPosition: () => this.frog.group.position,
      getCamera: () => this.cameraRig.camera,
      onAimStart: () => {
        if (this.settingsStore.aimAssist) this.trajectoryPreview.show();
      },
      onAimUpdate: (aim) => {
        this.frog.setAimPower(aim.power);
        if (this.settingsStore.aimAssist) this.updateAimPreview(aim);
      },
      onAimCancel: () => {
        this.frog.setAimPower(null);
        this.trajectoryPreview.hide();
      },
      onRelease: (aim) => this.releaseJump(aim),
      onTap: (x, y) => this.handleTap(x, y),
    });
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xbfd9e8, 0.7);
    this.scene.add(ambient);

    this.sun.position.set(6, 10, 4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -12;
    this.sun.shadow.camera.right = 12;
    this.sun.shadow.camera.top = 12;
    this.sun.shadow.camera.bottom = -12;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 30;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
  }

  private setupWater(): void {
    this.scene.add(this.water.mesh);
  }

  private updateAimPreview(aim: AimResult): void {
    const landingPad = findLandingLilypad(aim.target, this.lilypads);
    this.trajectoryPreview.update(this.frog.group.position, aim.target, aim.power, landingPad !== null);
  }

  private releaseJump(aim: AimResult): void {
    this.trajectoryPreview.hide();
    this.pendingLandingPad = findLandingLilypad(aim.target, this.lilypads);
    this.frog.startJump(aim.target, aim.power);
  }

  private handleTap(screenX: number, screenY: number): void {
    if (this.store.status !== GameStatus.Playing) return;
    if (this.frog.state !== FrogState.Idle) return;

    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((screenX - rect.left) / rect.width) * 2 - 1,
      -((screenY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.cameraRig.camera);

    const hitboxes = this.flySpawner.flies.map((fly) => fly.hitboxMesh);
    const intersections = this.raycaster.intersectObjects(hitboxes, false);
    if (intersections.length === 0) return;

    const fly = intersections[0].object.userData.fly as Fly;
    if (performance.now() < fly.noRetapUntil) return;

    const distance = this.frog.group.position.distanceTo(fly.position);
    const reaches = distance <= TONGUE_RANGE;

    this.frog.lashTongue(fly.position.clone(), reaches, () => {
      if (!this.flySpawner.flies.includes(fly)) return;
      if (reaches) {
        this.flySpawner.remove(fly);
        this.store.addScore(1);
        this.flySpawner.topUp();
      } else {
        fly.flee(this.pickFleeTarget(fly));
      }
    });
  }

  private pickFleeTarget(fly: Fly): Lilypad {
    const candidates = this.lilypads
      .filter((pad) => pad.id !== fly.homeLilypad.id)
      .sort((a, b) => a.position.distanceTo(fly.homeLilypad.position) - b.position.distanceTo(fly.homeLilypad.position));
    if (candidates.length === 0) return fly.homeLilypad;
    const pool = candidates.slice(0, FLEE_CANDIDATE_POOL);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private resolveJumpLanding(): void {
    const pad = this.pendingLandingPad;
    this.pendingLandingPad = null;

    if (pad) {
      this.frog.landOnLilypad(pad);
      this.lastSafeLilypad = pad;
      this.levelGenerator.update(pad.position, new Set([pad.id]));
      this.flySpawner.removeOrphans();
      return;
    }

    this.frog.sink();
    this.store.loseLife();

    if (this.store.status === GameStatus.GameOver) {
      window.setTimeout(() => this.gameOverScreen.show(this.store), RESPAWN_DELAY_MS);
      return;
    }

    window.setTimeout(() => {
      this.frog.respawnOnLilypad(this.lastSafeLilypad);
    }, RESPAWN_DELAY_MS);
  }

  private restart(): void {
    this.gameOverScreen.hide();
    this.store.reset();

    const startPad = this.levelGenerator.seed();
    this.lastSafeLilypad = startPad;
    this.frog.respawnOnLilypad(startPad);
    this.cameraRig.snapTo(this.frog.group.position);

    this.flySpawner.reset(startPad);
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.cameraRig.setAspect(width / height);
  }

  start(): void {
    this.cameraRig.snapTo(this.frog.group.position);
    this.renderer.setAnimationLoop(() => this.tick());
  }

  private tick(): void {
    const dt = Math.min(this.clock.getDelta(), 0.1);

    const jumpJustCompleted = this.frog.update(dt);
    if (jumpJustCompleted) this.resolveJumpLanding();

    this.flySpawner.update(this.clock.elapsedTime, dt);
    this.cameraRig.update(this.frog.group.position, dt);

    const frogPos = this.frog.group.position;
    this.water.recenter(frogPos.x, frogPos.z);
    this.sun.position.set(frogPos.x + 6, 10, frogPos.z + 4);
    this.sun.target.position.set(frogPos.x, 0, frogPos.z);

    this.renderer.render(this.scene, this.cameraRig.camera);
  }
}
