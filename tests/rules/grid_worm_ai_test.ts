import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/simulator';
import { UnitMovement } from '../../src/rules/unit_movement';

describe('Grid Worm AI', () => {
  it('worms move on a grid and wander randomly', () => {
    UnitMovement.wanderRate = 1; // Set wander rate for testing
    const sim = new Simulator();
    sim.addUnit({
      id: 'worm1',
      pos: { x: 48, y: 48 },
      team: 'hostile',
      sprite: 'worm',
      hp: 10,
      mass: 1,
      tags: ['wander']
    });
    let last = { x: -1, y: -1 };
    let moved = false;
    for (let i = 0; i < 20; i++) {
      sim.step();
      const unit = sim.units[0];
      // Check if worm has moved from last pos
      moved = false;
      if (unit.pos.x !== last.x || unit.pos.y !== last.y) {
        moved = true;
      }
      expect(moved).toBe(true);
      last = { x: unit.pos.x, y: unit.pos.y };
    }
  });
});
