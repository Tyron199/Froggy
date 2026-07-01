const INSTRUCTIONS = [
  'Pull back and release to jump between lily pads',
  'Tap a fly within reach to catch it with your tongue',
  "Land on a lily pad — don't fall in the water",
  "Logs are unstable, don't linger on them too long",
];

export class MainMenu {
  private readonly root: HTMLDivElement;

  constructor(root: HTMLElement, onPlay: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'main-menu';

    const title = document.createElement('div');
    title.className = 'main-menu-title';
    title.textContent = 'Froggy Leap';

    const instructions = document.createElement('ul');
    instructions.className = 'main-menu-instructions';
    for (const line of INSTRUCTIONS) {
      const item = document.createElement('li');
      item.textContent = line;
      instructions.appendChild(item);
    }

    const playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'main-menu-play';
    playButton.textContent = 'Play';
    playButton.addEventListener('pointerup', (event) => {
      event.preventDefault();
      onPlay();
    });

    this.root.appendChild(title);
    this.root.appendChild(instructions);
    this.root.appendChild(playButton);
    root.appendChild(this.root);
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
