import { describe, it, expect } from 'bun:test';
import { Simulator } from '../src/simulator.ts';

describe('End-to-end combat', () => {
  it('giant defeats swarm of small creatures', () => {
    const sim = new Simulator()
      .addUnit({ id: 'giant', pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, team: 'hostile', sprite: 'giant', state: 'idle', hp: 100, mass: 10 });

    // Add 5 small friendlies
    for (let i = 0; i < 5; i++) {
      sim.addUnit({ id: `minion${i}`, pos: { x: 5 + i, y: 0 }, vel: { x: -1, y: 0 }, team: 'friendly', sprite: 'tiny', state: 'walk', hp: 10, mass: 1 });
    }

    // Simulate 20 steps (enough for them to meet and fight)
    for (let t = 0; t < 20; t++) {
      sim.step();
      // Melee: if units are close, they attack each other
      for (const a of sim.units) {
        for (const b of sim.units) {
          if (a.id !== b.id && a.team !== b.team && a.state !== 'dead' && b.state !== 'dead') {
            const dx = a.pos.x - b.pos.x;
            const dy = a.pos.y - b.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1.1) {
              a.hp -= 1;
              b.hp -= 1;
            }
          }
        }
      }
    }

    // Expect giant to survive, minions to be culled (dead units removed)
    expect(sim.roster.giant.state).not.toBe('dead');
    expect(sim.roster.giant.hp).toBeGreaterThan(0);
    
    // Minions should be dead and culled from battlefield
    for (let i = 0; i < 5; i++) {
      expect(sim.roster[`minion${i}`]).toBeUndefined(); // Dead units are culled
    }
    
    // Should only have the giant left
    expect(sim.units.length).toBe(1);
    expect(sim.units[0].id).toBe('giant');
  });
});
