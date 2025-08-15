import { describe, it, expect, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('End-to-end combat', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });
  it('giant defeats swarm of small creatures', () => {
    const sim = new Simulator();
    sim.sceneBackground = 'arena'; // Non-ambient scene to prevent spawning
    let giant = sim.create({ 
      id: 'giant', 
      pos: { x: 0, y: 0 }, 
      intendedMove: { x: 0, y: 0 }, 
      team: 'hostile', 
      sprite: 'giant', 
      state: 'idle', 
      hp: 100, 
      mass: 10, 
      meta: { 
        meleeDamage: 15,  // High damage to kill minions quickly
        meleeRange: 2     // Extended range for giant
      }, 
      maxHp: 100, 
      abilities: ['melee'], // Use the standard melee ability
      tags: ['giant']
    });

    // Add 5 small friendlies with hunt behavior
    for (let i = 0; i < 5; i++) {
      sim.addUnit({ 
        id: `minion${i}`, 
        pos: { x: 5 + i, y: 0 }, 
        intendedMove: { x: 0, y: 0 }, 
        team: 'friendly', 
        sprite: 'tiny', 
        hp: 10, 
        maxHp: 10, 
        mass: 1, 
        state: 'idle', 
        abilities: [],
        tags: ['hunt'] // Make them hunt the giant
      });
    }

    // Simulate 100 steps (enough for them to meet and fight multiple times)
    for (let t = 0; t < 100; t++) {
      if (t === 0 || t === 1 || t === 99) {
        console.debug(`Step ${t}: giant at (${sim.roster.giant?.pos.x},${sim.roster.giant?.pos.y}) hp=${sim.roster.giant?.hp}`);
        console.debug(`  minion0 at (${sim.roster.minion0?.pos.x},${sim.roster.minion0?.pos.y}) hp=${sim.roster.minion0?.hp} intendedMove=(${sim.roster.minion0?.intendedMove.x},${sim.roster.minion0?.intendedMove.y})`);
      }
      sim.step();
    }

    // Expect giant to survive, minions to be culled (dead units removed)
    expect(sim.roster.giant.state).not.toBe('dead');
    expect(sim.roster.giant.hp).toBeGreaterThan(0);
    
    // Minions should be dead and culled from battlefield
    for (let i = 0; i < 10; i++) {
      expect(sim.roster[`minion${i}`]).toBeUndefined(); // Dead units are culled
    }
    
    // Should only have the giant left
    expect(sim.units.length).toBe(1);
    expect(sim.units[0].id).toBe('giant');
  });
});
