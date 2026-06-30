const VISIBLE_DURATION_MS = 1400;

export class MilestoneBanner {
  private readonly root: HTMLDivElement;
  private hideTimeout: number | null = null;

  constructor(root: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'milestone-banner';
    root.appendChild(this.root);
  }

  show(text: string): void {
    this.root.textContent = text;
    this.root.classList.add('visible');

    if (this.hideTimeout !== null) window.clearTimeout(this.hideTimeout);
    this.hideTimeout = window.setTimeout(() => {
      this.root.classList.remove('visible');
      this.hideTimeout = null;
    }, VISIBLE_DURATION_MS);
  }
}
