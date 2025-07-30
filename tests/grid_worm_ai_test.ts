import { describe, it, expect } from 'bun:test';
import { Simulator } from '../src/simulator';
import { UnitOperations } from '../src/UnitOperations';
import { UnitMovement } from '../src/rules/unit_movement';

describe('Grid Worm AI', () => {
  it('worms move on a grid and wander randomly', () => {
    UnitMovement.wanderRate = 1; // Set wander rate for testing
    const sim = new Simulator();
    sim.addUnit({
      id: 'worm1',
      pos: { x: 48, y: 48 },
      vel: { x: 1, y: 0 },
      team: 'hostile',
      sprite: 'worm',
      state: 'idle',
      hp: 10,
      mass: 1,
      tags: ['wanderer']
    });
    const start = { x: sim.units[0].pos.x, y: sim.units[0].pos.y };
    let last = { x: -1, y: -1 };
    let moved = false;
    for (let i = 0; i < 20; i++) {
      sim.step();
      const unit = sim.units[0];
      // console.log(`step ${i+1}: pos=(${unit.pos.x},${unit.pos.y}) vel=(${unit.vel.x},${unit.vel.y})`);
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
