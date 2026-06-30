import { COMBO_WINDOW_SECONDS } from '../game/constants.ts';
import { GameStore } from '../game/GameState.ts';

export class HUD {
  private readonly scoreEl: HTMLDivElement;
  private readonly distanceEl: HTMLDivElement;
  private readonly comboEl: HTMLDivElement;
  private readonly comboLabelEl: HTMLSpanElement;
  private readonly comboBarFillEl: HTMLDivElement;
  private readonly livesEl: HTMLDivElement;

  constructor(root: HTMLElement, store: GameStore) {
    const hud = document.createElement('div');
    hud.className = 'hud';

    const leftColumn = document.createElement('div');
    leftColumn.className = 'hud-left';

    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'hud-score';

    this.distanceEl = document.createElement('div');
    this.distanceEl.className = 'hud-distance';

    this.comboEl = document.createElement('div');
    this.comboEl.className = 'hud-combo hidden';
    this.comboLabelEl = document.createElement('span');
    this.comboLabelEl.className = 'hud-combo-label';
    const comboBar = document.createElement('div');
    comboBar.className = 'hud-combo-bar';
    this.comboBarFillEl = document.createElement('div');
    this.comboBarFillEl.className = 'hud-combo-bar-fill';
    comboBar.appendChild(this.comboBarFillEl);
    this.comboEl.appendChild(this.comboLabelEl);
    this.comboEl.appendChild(comboBar);

    leftColumn.appendChild(this.scoreEl);
    leftColumn.appendChild(this.distanceEl);
    leftColumn.appendChild(this.comboEl);

    this.livesEl = document.createElement('div');
    this.livesEl.className = 'hud-lives';

    hud.appendChild(leftColumn);
    hud.appendChild(this.livesEl);
    root.appendChild(hud);

    store.subscribe(() => this.render(store));
    this.render(store);
    this.setDistance(0);
  }

  /** Called every frame with the live combo countdown (bypasses the store's notify, which only fires on discrete combo changes). */
  setComboTimeRemaining(seconds: number): void {
    const fraction = Math.max(0, Math.min(1, seconds / COMBO_WINDOW_SECONDS));
    this.comboBarFillEl.style.width = `${fraction * 100}%`;
  }

  /** Called every frame with the frog's current distance from the origin. */
  setDistance(meters: number): void {
    this.distanceEl.textContent = `${Math.round(meters)}m`;
  }

  private render(store: GameStore): void {
    this.scoreEl.textContent = `${store.score}`;
    this.comboEl.classList.toggle('hidden', store.combo === 0);
    this.comboLabelEl.textContent = `🔥 x${store.combo}`;

    this.livesEl.innerHTML = '';
    for (let i = 0; i < store.lives; i++) {
      const heart = document.createElement('span');
      heart.className = 'hud-life';
      heart.textContent = '🐸';
      this.livesEl.appendChild(heart);
    }
  }
}
