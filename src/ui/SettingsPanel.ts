import { SettingsStore } from '../game/SettingsState.ts';

export class SettingsPanel {
  private readonly panel: HTMLDivElement;
  private readonly aimAssistCheckbox: HTMLInputElement;
  private readonly soundCheckbox: HTMLInputElement;

  constructor(root: HTMLElement, store: SettingsStore) {
    const gearButton = document.createElement('button');
    gearButton.type = 'button';
    gearButton.className = 'settings-gear';
    gearButton.textContent = '⚙';
    gearButton.setAttribute('aria-label', 'Settings');

    this.panel = document.createElement('div');
    this.panel.className = 'settings-panel hidden';

    this.aimAssistCheckbox = this.createToggleRow('Aim Assist', store.aimAssist, (checked) =>
      store.setAimAssist(checked),
    );
    this.soundCheckbox = this.createToggleRow('Sound', store.sound, (checked) => store.setSound(checked));

    gearButton.addEventListener('pointerup', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.panel.classList.toggle('hidden');
    });

    root.appendChild(gearButton);
    root.appendChild(this.panel);

    store.subscribe(() => {
      this.aimAssistCheckbox.checked = store.aimAssist;
      this.soundCheckbox.checked = store.sound;
    });
  }

  private createToggleRow(labelText: string, initial: boolean, onChange: (checked: boolean) => void): HTMLInputElement {
    const label = document.createElement('label');
    label.className = 'settings-toggle';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = initial;
    checkbox.addEventListener('change', () => onChange(checkbox.checked));

    const text = document.createElement('span');
    text.textContent = labelText;

    label.appendChild(checkbox);
    label.appendChild(text);
    this.panel.appendChild(label);

    return checkbox;
  }
}
