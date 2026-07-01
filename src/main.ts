import './style.css';
import { Game } from './game/Game.ts';

// A held finger should only ever aim/jump, never trigger the browser's native text-selection,
// callout menu, or drag ghost. CSS handles most of this; these are the JS-side belt-and-suspenders.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('selectstart', (e) => e.preventDefault());
document.addEventListener('dragstart', (e) => e.preventDefault());

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const uiRoot = document.querySelector<HTMLElement>('#ui-root')!;
const game = new Game(canvas, uiRoot);
game.start();

if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
}
