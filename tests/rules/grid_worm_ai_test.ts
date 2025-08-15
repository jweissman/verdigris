import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
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
    const initialPos = { x: sim.units[0].pos.x, y: sim.units[0].pos.y };
    let totalMoves = 0;
    let lastPos = { ...initialPos };
    
    for (let i = 0; i < 20; i++) {
      sim.step();
      const unit = sim.units[0];
      // Check if worm has moved from last pos
      if (unit.pos.x !== lastPos.x || unit.pos.y !== lastPos.y) {
        totalMoves++;
        lastPos = { x: unit.pos.x, y: unit.pos.y };
      }
    }
    
    // Should have moved at least once in 20 ticks
    expect(totalMoves).toBeGreaterThan(0);
    // Final position should be different from initial
    const finalUnit = sim.units[0];
    const moved = finalUnit.pos.x !== initialPos.x || finalUnit.pos.y !== initialPos.y;
    expect(moved).toBe(true);
  });
});
