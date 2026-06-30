import { COMBO_MAX_MULTIPLIER, COMBO_WINDOW_SECONDS, STARTING_LIVES } from './constants.ts';

export const GameStatus = {
  Menu: 'menu',
  Playing: 'playing',
  GameOver: 'gameOver',
} as const;
export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

type Listener = () => void;

export class GameStore {
  score = 0;
  lives = STARTING_LIVES;
  status: GameStatus = GameStatus.Playing;
  highScore = Number(localStorage.getItem('froggy-leap-high-score') ?? 0);

  combo = 0;
  comboTimeRemaining = 0;

  bestDistance = Number(localStorage.getItem('froggy-leap-best-distance') ?? 0);

  private listeners: Listener[] = [];

  subscribe(listener: Listener): void {
    this.listeners.push(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  addScore(amount: number): void {
    this.score += amount;
    this.notify();
  }

  /** Registers a fly catch: escalates the combo multiplier and awards that many points. */
  registerCatch(): void {
    this.combo = Math.min(COMBO_MAX_MULTIPLIER, this.combo + 1);
    this.comboTimeRemaining = COMBO_WINDOW_SECONDS;
    this.score += this.combo;
    this.notify();
  }

  /** Counts the combo window down; resets the streak once it runs out. */
  tickCombo(dt: number): void {
    if (this.combo === 0) return;
    this.comboTimeRemaining -= dt;
    if (this.comboTimeRemaining <= 0) {
      this.combo = 0;
      this.comboTimeRemaining = 0;
      this.notify();
    }
  }

  /** Updates the best-distance stat (called only on milestone crossings, not every frame). */
  updateDistance(distance: number): void {
    if (distance > this.bestDistance) {
      this.bestDistance = distance;
      localStorage.setItem('froggy-leap-best-distance', String(Math.round(this.bestDistance)));
    }
  }

  loseLife(): void {
    this.lives = Math.max(0, this.lives - 1);
    if (this.lives === 0) {
      this.status = GameStatus.GameOver;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('froggy-leap-high-score', String(this.highScore));
      }
    }
    this.notify();
  }

  reset(): void {
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.status = GameStatus.Playing;
    this.combo = 0;
    this.comboTimeRemaining = 0;
    this.notify();
  }
}
