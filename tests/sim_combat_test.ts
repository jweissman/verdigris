import { describe, it, expect } from 'bun:test';
import { Simulator } from '../src/simulator.ts';

describe('End-to-end combat', () => {
  it('giant defeats swarm of small creatures', () => {
    const sim = new Simulator();
    let giant = sim.create({ id: 'giant', pos: { x: 0, y: 0 }, intendedMove: { x: 0, y: 0 }, team: 'hostile', sprite: 'giant', state: 'idle', hp: 100, mass: 10, maxHp: 100 });

    // Add 5 small friendlies
    for (let i = 0; i < 5; i++) {
      sim.addUnit({ id: `minion${i}`, pos: { x: 5 + i, y: 0 }, intendedMove: { x: -1, y: 0 }, team: 'friendly', sprite: 'tiny', posture: 'pursue', hp: 10, mass: 1, state: 'idle', intendedTarget: giant.id });
    }

    // Simulate 30 steps (enough for them to meet and fight)
    for (let t = 0; t < 30; t++) {
      sim.step();
    }

    // Expect giant to survive, minions to be culled (dead units removed)
    expect(sim.roster.giant.state).not.toBe('dead');
    expect(sim.roster.giant.hp).toBeGreaterThan(0);
    
    // Minions should be dead and culled from battlefield
    for (let i = 0; i < 10; i++) {
      // console.log(`Minion ${i} state:`, sim.roster[`minion${i}`]);
      expect(sim.roster[`minion${i}`]).toBeUndefined(); // Dead units are culled
    }
    
    // Should only have the giant left
    expect(sim.units.length).toBe(1);
    expect(sim.units[0].id).toBe('giant');
  });
});
