import { STARTING_LIVES } from './constants.ts';

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
    this.notify();
  }
}
