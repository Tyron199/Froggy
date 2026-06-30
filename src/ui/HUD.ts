import { GameStore } from '../game/GameState.ts';

export class HUD {
  private readonly scoreEl: HTMLDivElement;
  private readonly livesEl: HTMLDivElement;

  constructor(root: HTMLElement, store: GameStore) {
    const hud = document.createElement('div');
    hud.className = 'hud';

    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'hud-score';

    this.livesEl = document.createElement('div');
    this.livesEl.className = 'hud-lives';

    hud.appendChild(this.scoreEl);
    hud.appendChild(this.livesEl);
    root.appendChild(hud);

    store.subscribe(() => this.render(store));
    this.render(store);
  }

  private render(store: GameStore): void {
    this.scoreEl.textContent = `${store.score}`;
    this.livesEl.innerHTML = '';
    for (let i = 0; i < store.lives; i++) {
      const heart = document.createElement('span');
      heart.className = 'hud-life';
      heart.textContent = '🐸';
      this.livesEl.appendChild(heart);
    }
  }
}
