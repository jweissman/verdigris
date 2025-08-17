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


    for (let t = 0; t < 100; t++) {
      if (t === 0 || t === 1 || t === 99) {
        const giant = sim.units.find(u => u.id === 'giant');
        const minion0 = sim.units.find(u => u.id === 'minion0');
        console.debug(`Step ${t}: giant at (${giant?.pos.x},${giant?.pos.y}) hp=${giant?.hp}`);
        console.debug(`  minion0 at (${minion0?.pos.x},${minion0?.pos.y}) hp=${minion0?.hp} intendedMove=(${minion0?.intendedMove.x},${minion0?.intendedMove.y})`);
      }
      sim.step();
    }


    const giantAfter = sim.units.find(u => u.id === 'giant');
    expect(giantAfter?.state).not.toBe('dead');
    expect(giantAfter?.hp).toBeGreaterThan(0);
    

    for (let i = 0; i < 10; i++) {
      const minion = sim.units.find(u => u.id === `minion${i}`);
      expect(minion).toBeUndefined(); // Dead units are culled
    }
    

    expect(sim.units.length).toBe(1);
    expect(sim.units[0].id).toBe('giant');
  });
});
