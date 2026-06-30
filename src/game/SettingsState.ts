const STORAGE_KEY = 'froggy-leap-settings';

interface PersistedSettings {
  aimAssist: boolean;
}

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { aimAssist: true };
    const parsed = JSON.parse(raw);
    return { aimAssist: parsed.aimAssist ?? true };
  } catch {
    return { aimAssist: true };
  }
}

type Listener = () => void;

export class SettingsStore {
  aimAssist: boolean;

  private listeners: Listener[] = [];

  constructor() {
    this.aimAssist = loadSettings().aimAssist;
  }

  subscribe(listener: Listener): void {
    this.listeners.push(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ aimAssist: this.aimAssist }));
  }

  setAimAssist(value: boolean): void {
    this.aimAssist = value;
    this.persist();
    this.notify();
  }
}
