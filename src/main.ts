import './style.css';
import { Game } from './game/Game.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const uiRoot = document.querySelector<HTMLElement>('#ui-root')!;
const game = new Game(canvas, uiRoot);
game.start();

if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
}
