import { describe, it, expect } from 'bun:test'
import { Freehold } from '../../src/freehold'
import Input from '../../src/core/input'

describe('Game harness', () => {
  const canvas = { width: 320, height: 200, getContext: () => ({ clearRect: () => {}, fillRect: () => {}, fillStyle: '' }) } as any;
  let inputCallback: ((e: { key: string }) => void) = null as any;
  const game = new Freehold(canvas, {
    addInputListener: (cb) => { inputCallback = cb; },
    animationFrame: (cb) => {}
  });

  it('spawns a worm on keypress and updates sim', async () => {
    game.bootstrap();
    inputCallback && inputCallback({ key: 'w' });
    expect(game.sim.units.length).toBe(1);
    expect(game.sim.units[0].sprite).toBe('worm');
  });

  // Input.beastKeys.forEach((key, beastName) => {
  // Object.entries(Input.beastKeys).forEach(([key, beastName]) => {
  //   it(`spawns beast ${beastName} on ${key}`, () => {
  //     game.bootstrap();
  //     // Simulate keydown
  //     inputCallback && inputCallback({ key });
  //     expect(game.sim.units.length).toBe(1);
  //     expect(game.sim.units[0].type).toBe(beastName);
  //   });
  // });
});
