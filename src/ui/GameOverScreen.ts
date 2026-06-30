import { GameStore } from '../game/GameState.ts';

export class GameOverScreen {
  private readonly root: HTMLDivElement;
  private readonly scoreEl: HTMLDivElement;
  private readonly highScoreEl: HTMLDivElement;
  private readonly distanceEl: HTMLDivElement;

  constructor(root: HTMLElement, onRestart: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'game-over hidden';

    const title = document.createElement('div');
    title.className = 'game-over-title';
    title.textContent = 'Game Over';

    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'game-over-score';

    this.highScoreEl = document.createElement('div');
    this.highScoreEl.className = 'game-over-high-score';

    this.distanceEl = document.createElement('div');
    this.distanceEl.className = 'game-over-distance';

    const restartButton = document.createElement('button');
    restartButton.type = 'button';
    restartButton.className = 'game-over-restart';
    restartButton.textContent = 'Restart';
    restartButton.addEventListener('pointerup', (event) => {
      event.preventDefault();
      onRestart();
    });

    this.root.appendChild(title);
    this.root.appendChild(this.scoreEl);
    this.root.appendChild(this.highScoreEl);
    this.root.appendChild(this.distanceEl);
    this.root.appendChild(restartButton);
    root.appendChild(this.root);
  }

  show(store: GameStore): void {
    this.scoreEl.textContent = `Score: ${store.score}`;
    this.highScoreEl.textContent = `Best: ${store.highScore}`;
    this.distanceEl.textContent = `Best distance: ${Math.round(store.bestDistance)}m`;
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
