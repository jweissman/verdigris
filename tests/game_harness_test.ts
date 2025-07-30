import { describe, it, expect } from 'bun:test';
import { Freehold } from '../src/freehold.ts';

// This is a pseudo-test for browser harness logic. In a real browser test, use jsdom or Playwright.
describe('Game harness', () => {
  it('spawns a worm on keypress and updates sim', async () => {
    // Minimal DOM stub
    const canvas = { width: 320, height: 200, getContext: () => ({ clearRect: () => {}, fillRect: () => {}, fillStyle: '' }) } as any;
    let inputCallback: ((e: { key: string }) => void) | null = null;
    // Dynamically import Game
    // const { Game } = await import('../src/game.ts');
    const game = new Freehold(canvas, {
      addInputListener: (cb) => { inputCallback = cb; },
      animationFrame: (cb) => {} // no-op for test
    });
    // Simulate keydown
    inputCallback && inputCallback({ key: 'w' });
    expect(game.sim.units.length).toBe(1);
    expect(game.sim.units[0].sprite).toBe('worm');
  });
});
