const STORAGE_KEY = 'froggy-leap-settings';

interface PersistedSettings {
  aimAssist: boolean;
  sound: boolean;
}

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { aimAssist: true, sound: true };
    const parsed = JSON.parse(raw);
    return { aimAssist: parsed.aimAssist ?? true, sound: parsed.sound ?? true };
  } catch {
    return { aimAssist: true, sound: true };
  }
}

type Listener = () => void;

export class SettingsStore {
  aimAssist: boolean;
  sound: boolean;

  private listeners: Listener[] = [];

  constructor() {
    const settings = loadSettings();
    this.aimAssist = settings.aimAssist;
    this.sound = settings.sound;
  }

  subscribe(listener: Listener): void {
    this.listeners.push(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ aimAssist: this.aimAssist, sound: this.sound }));
  }

  setAimAssist(value: boolean): void {
    this.aimAssist = value;
    this.persist();
    this.notify();
  }

  setSound(value: boolean): void {
    this.sound = value;
    this.persist();
    this.notify();
  }
}
