const POOL_SIZE = 6;
const VISIBLE_DURATION_MS = 700;

interface PopupSlot {
  el: HTMLDivElement;
  hideTimeout: number | null;
}

/** Floating "+N" text that pops up at a screen position and drifts up while fading out. */
export class ScorePopup {
  private readonly slots: PopupSlot[] = [];
  private nextSlot = 0;

  constructor(root: HTMLElement) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement('div');
      el.className = 'score-popup';
      root.appendChild(el);
      this.slots.push({ el, hideTimeout: null });
    }
  }

  show(screenX: number, screenY: number, text: string): void {
    const slot = this.slots[this.nextSlot];
    this.nextSlot = (this.nextSlot + 1) % this.slots.length;

    if (slot.hideTimeout !== null) window.clearTimeout(slot.hideTimeout);

    slot.el.textContent = text;
    slot.el.style.left = `${screenX}px`;
    slot.el.style.top = `${screenY}px`;
    slot.el.classList.remove('visible');
    // Force reflow so re-triggering the animation on an already-visible slot restarts cleanly.
    void slot.el.offsetWidth;
    slot.el.classList.add('visible');

    slot.hideTimeout = window.setTimeout(() => {
      slot.el.classList.remove('visible');
      slot.hideTimeout = null;
    }, VISIBLE_DURATION_MS);
  }
}
