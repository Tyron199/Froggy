import * as THREE from 'three';
import { CameraRig } from '../camera/CameraRig.ts';
import { WaterPlane } from '../entities/WaterPlane.ts';
import { Lilypad } from '../entities/Lilypad.ts';
import { Log } from '../entities/Log.ts';
import { Frog, FrogState } from '../entities/Frog.ts';
import { GameStatus, GameStore } from './GameState.ts';
import { SettingsStore } from './SettingsState.ts';
import { findLandingTarget, type Landable } from '../physics/jumpTrajectory.ts';
import { PullReleaseController, type AimResult } from '../input/PullReleaseController.ts';
import { TrajectoryPreview } from '../input/TrajectoryPreview.ts';
import { HUD } from '../ui/HUD.ts';
import { GameOverScreen } from '../ui/GameOverScreen.ts';
import { SettingsPanel } from '../ui/SettingsPanel.ts';
import { MilestoneBanner } from '../ui/MilestoneBanner.ts';
import { FlySpawner } from '../level/FlySpawner.ts';
import { LevelGenerator } from '../level/LevelGenerator.ts';
import { Fly } from '../entities/Fly.ts';
import { RippleEffect } from '../entities/RippleEffect.ts';
import { CatchBurst } from '../entities/CatchBurst.ts';
import { FishSchool } from '../entities/FishSchool.ts';
import { ScorePopup } from '../ui/ScorePopup.ts';
import { SfxEngine } from '../audio/SfxEngine.ts';
import {
  DISTANCE_MILESTONE_BONUS,
  DISTANCE_MILESTONE_STEP,
  RIPPLE_AMBIENT_INTERVAL_MAX,
  RIPPLE_AMBIENT_INTERVAL_MIN,
  RIPPLE_AMBIENT_OPACITY,
  RIPPLE_AMBIENT_RADIUS,
  RIPPLE_DURATION,
  RIPPLE_START_OPACITY,
  TONGUE_RANGE,
} from './constants.ts';

const RESPAWN_DELAY_MS = 700;
const FLEE_CANDIDATE_POOL = 3;

function randomAmbientInterval(): number {
  return RIPPLE_AMBIENT_INTERVAL_MIN + Math.random() * (RIPPLE_AMBIENT_INTERVAL_MAX - RIPPLE_AMBIENT_INTERVAL_MIN);
}

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly cameraRig: CameraRig;
  private readonly clock = new THREE.Clock();
  private readonly trajectoryPreview = new TrajectoryPreview();
  private readonly water = new WaterPlane();
  private readonly ripples = new RippleEffect();
  private readonly catchBurst = new CatchBurst();
  private readonly sfx = new SfxEngine();
  private readonly sun = new THREE.DirectionalLight(0xfff4d6, 1.1);
  private nextAmbientRippleIn = randomAmbientInterval();

  readonly store = new GameStore();
  readonly settingsStore = new SettingsStore();
  readonly frog: Frog;

  get lilypads(): Lilypad[] {
    return this.levelGenerator.pads;
  }

  get logs(): Log[] {
    return this.levelGenerator.logs;
  }

  get flies(): Fly[] {
    return this.flySpawner.flies;
  }

  get rippleGroup(): THREE.Group {
    return this.ripples.group;
  }

  get camera(): THREE.Camera {
    return this.cameraRig.camera;
  }

  private readonly canvas: HTMLCanvasElement;
  private readonly hud: HUD;
  private readonly gameOverScreen: GameOverScreen;
  private readonly milestoneBanner: MilestoneBanner;
  private readonly scorePopup: ScorePopup;
  private readonly levelGenerator: LevelGenerator;
  private readonly flySpawner: FlySpawner;
  private readonly fishSchool: FishSchool;
  private readonly raycaster = new THREE.Raycaster();
  private pendingLandingTarget: Landable | null = null;
  private lastSafeLilypad: Lilypad;
  private currentLog: Log | null = null;
  private nextMilestone = DISTANCE_MILESTONE_STEP;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.cameraRig = new CameraRig(window.innerWidth / window.innerHeight);

    this.setupLighting();
    this.setupWater();
    this.scene.add(this.ripples.group);
    this.scene.add(this.catchBurst.group);
    this.levelGenerator = new LevelGenerator(this.scene);
    const startPad = this.levelGenerator.seed();
    this.lastSafeLilypad = startPad;

    this.fishSchool = new FishSchool(startPad.position);
    this.scene.add(this.fishSchool.group);

    this.frog = new Frog(startPad);
    this.scene.add(this.frog.group);
    this.scene.add(this.trajectoryPreview.group);

    this.flySpawner = new FlySpawner(this.scene, this.lilypads, startPad);
    this.flySpawner.spawnInitial();

    this.hud = new HUD(uiRoot, this.store);
    this.gameOverScreen = new GameOverScreen(uiRoot, () => this.restart());
    this.milestoneBanner = new MilestoneBanner(uiRoot);
    this.scorePopup = new ScorePopup(uiRoot);
    new SettingsPanel(uiRoot, this.settingsStore);

    this.sfx.setMuted(!this.settingsStore.sound);
    this.settingsStore.subscribe(() => this.sfx.setMuted(!this.settingsStore.sound));
    window.addEventListener('pointerdown', () => this.sfx.unlock(), { once: true });

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
        this.frog.setAimPoint(aim.target);
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

  private allLandables(): Landable[] {
    return [...this.lilypads.filter((p) => p.isReady), ...this.logs.filter((l) => l.isReady)];
  }

  private worldToScreen(point: THREE.Vector3): { x: number; y: number } {
    const ndc = point.clone().project(this.cameraRig.camera);
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + (ndc.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (1 - (ndc.y * 0.5 + 0.5)) * rect.height,
    };
  }

  private updateAimPreview(aim: AimResult): void {
    const landingTarget = findLandingTarget(aim.target, this.allLandables());
    this.trajectoryPreview.update(this.frog.group.position, aim.target, aim.power, landingTarget !== null);
  }

  private releaseJump(aim: AimResult): void {
    this.trajectoryPreview.hide();
    this.pendingLandingTarget = findLandingTarget(aim.target, this.allLandables());
    this.currentLog = null;
    this.frog.startJump(aim.target, aim.power);
    this.sfx.playJump(aim.power);
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
        const catchPosition = fly.position.clone();
        const awarded = this.store.registerCatch();
        this.flySpawner.remove(fly);
        this.flySpawner.topUp();

        this.catchBurst.spawn(catchPosition);
        const screen = this.worldToScreen(catchPosition);
        this.scorePopup.show(screen.x, screen.y, `+${awarded}`);
        this.sfx.playCatch(awarded);
      } else {
        fly.flee(this.pickFleeTarget(fly));
      }
    });
  }

  private pickFleeTarget(fly: Fly): Lilypad {
    const candidates = this.lilypads
      .filter((pad) => pad.id !== fly.homeLilypad.id && pad.isReady)
      .sort((a, b) => a.position.distanceTo(fly.homeLilypad.position) - b.position.distanceTo(fly.homeLilypad.position));
    if (candidates.length === 0) return fly.homeLilypad;
    const pool = candidates.slice(0, FLEE_CANDIDATE_POOL);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private resolveJumpLanding(): void {
    const target = this.pendingLandingTarget;
    this.pendingLandingTarget = null;

    if (!target) {
      this.frogFalls();
      return;
    }

    this.frog.landOnSurface(target);
    this.levelGenerator.update(target.position, new Set([target.id]));
    this.flySpawner.removeOrphans();
    this.sfx.playLand();

    if (target instanceof Lilypad) {
      this.lastSafeLilypad = target;
      this.currentLog = null;
    } else {
      this.currentLog = target as Log;
    }
  }

  /** Shared failure path for both missing a jump into the water and a log tipping underfoot. */
  private frogFalls(): void {
    this.ripples.spawn(this.frog.group.position);
    this.cameraRig.triggerShake();
    this.frog.sink();
    this.store.loseLife();
    this.sfx.playSplash();

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
    this.nextMilestone = DISTANCE_MILESTONE_STEP;

    const startPad = this.levelGenerator.seed();
    this.lastSafeLilypad = startPad;
    this.currentLog = null;
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

  private updateLogs(dt: number): void {
    for (const log of this.logs) {
      const isOccupied = log === this.currentLog;
      const tipped = log.update(dt, isOccupied);
      if (tipped && isOccupied && this.frog.state === FrogState.Idle) {
        this.currentLog = null;
        this.frogFalls();
      }
    }
  }

  private updatePopAnimations(dt: number): void {
    for (const pad of this.lilypads) {
      if (pad.updatePop(dt) === 'ripple') this.ripples.spawn(pad.position, RIPPLE_START_OPACITY, RIPPLE_DURATION * 0.7);
    }
    for (const log of this.logs) {
      if (log.updatePop(dt) === 'ripple') this.ripples.spawn(log.position, RIPPLE_START_OPACITY, RIPPLE_DURATION * 0.7);
    }
  }

  private tick(): void {
    const dt = Math.min(this.clock.getDelta(), 0.1);

    const jumpJustCompleted = this.frog.update(dt);
    if (jumpJustCompleted) this.resolveJumpLanding();

    this.updateLogs(dt);
    this.updatePopAnimations(dt);
    this.flySpawner.update(this.clock.elapsedTime, dt);
    this.cameraRig.update(this.frog.group.position, dt);
    this.updateAmbientRipples(dt);
    this.ripples.update(dt);
    this.catchBurst.update(dt);

    this.store.tickCombo(dt);
    this.hud.setComboTimeRemaining(this.store.comboTimeRemaining);

    const frogPos = this.frog.group.position;
    this.updateDistance(frogPos);

    this.water.recenter(frogPos.x, frogPos.z);
    this.water.update(this.clock.elapsedTime);
    this.fishSchool.update(frogPos, this.clock.elapsedTime);
    this.sun.position.set(frogPos.x + 6, 10, frogPos.z + 4);
    this.sun.target.position.set(frogPos.x, 0, frogPos.z);

    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  private updateDistance(frogPos: THREE.Vector3): void {
    const distance = Math.hypot(frogPos.x, frogPos.z);
    this.hud.setDistance(distance);

    if (distance >= this.nextMilestone) {
      this.nextMilestone += DISTANCE_MILESTONE_STEP;
      this.store.addScore(DISTANCE_MILESTONE_BONUS);
      this.store.updateDistance(distance);
      this.milestoneBanner.show(`${Math.round(distance)}m!`);
      this.sfx.playMilestone();
    }
  }

  private updateAmbientRipples(dt: number): void {
    this.nextAmbientRippleIn -= dt;
    if (this.nextAmbientRippleIn > 0) return;
    this.nextAmbientRippleIn = randomAmbientInterval();

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * RIPPLE_AMBIENT_RADIUS;
    const frogPos = this.frog.group.position;
    const point = new THREE.Vector3(frogPos.x + Math.cos(angle) * radius, 0, frogPos.z + Math.sin(angle) * radius);
    this.ripples.spawn(point, RIPPLE_AMBIENT_OPACITY, 1.6);
  }
}
