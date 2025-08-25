import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Jump Z Debug', () => {
  test('trace Z values during jump step by step', () => {
    const sim = new Simulator(40, 40);
    const _hero = sim.addUnit({
      id: 'z_debug_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    sim.queuedCommands.push({
      type: 'jump',
      unitId: 'z_debug_hero',
      params: { distance: 3, height: 5 }
    });
    for (let step = 0; step < 20; step++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'z_debug_hero');
      if (!h?.meta?.jumping && step > 5) {
        break;
      }
    }
    const final = sim.units.find(u => u.id === 'z_debug_hero');
    expect(final?.meta?.jumping).toBe(false);
    expect(final?.pos.x).not.toBe(10); // Should have moved
  });
});