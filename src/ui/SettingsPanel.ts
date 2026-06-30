import { SettingsStore } from '../game/SettingsState.ts';

export class SettingsPanel {
  private readonly panel: HTMLDivElement;
  private readonly checkbox: HTMLInputElement;

  constructor(root: HTMLElement, store: SettingsStore) {
    const gearButton = document.createElement('button');
    gearButton.type = 'button';
    gearButton.className = 'settings-gear';
    gearButton.textContent = '⚙';
    gearButton.setAttribute('aria-label', 'Settings');

    this.panel = document.createElement('div');
    this.panel.className = 'settings-panel hidden';

    const label = document.createElement('label');
    label.className = 'settings-toggle';

    this.checkbox = document.createElement('input');
    this.checkbox.type = 'checkbox';
    this.checkbox.checked = store.aimAssist;
    this.checkbox.addEventListener('change', () => store.setAimAssist(this.checkbox.checked));

    const labelText = document.createElement('span');
    labelText.textContent = 'Aim Assist';

    label.appendChild(this.checkbox);
    label.appendChild(labelText);
    this.panel.appendChild(label);

    gearButton.addEventListener('pointerup', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.panel.classList.toggle('hidden');
    });

    root.appendChild(gearButton);
    root.appendChild(this.panel);

    store.subscribe(() => {
      this.checkbox.checked = store.aimAssist;
    });
  }
}
