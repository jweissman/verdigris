import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import type { Unit } from '../../../src/types/Unit';

describe('Hero Regeneration', () => {
  it('should heal hero periodically when damaged', () => {
    const sim = new Simulator();

    const hero: Unit = {
      id: 'hero',
      pos: { x: 10, y: 10 },
      intendedMove: { x: 10, y: 10 },
      team: 'friendly',
      sprite: 'hero',
      state: 'idle',
      hp: 50, // Damaged hero
      maxHp: 100,
      mass: 1,
      abilities: ['heroRegeneration'],
      lastAbilityTick: {},
      tags: ['hero'],
      dmg: 15,
      meta: {}
    };

    sim.addUnit(hero);
    
    const initialHp = 50;
    
    // Step once to trigger first heal
    sim.step();
    sim.step(); // Process the heal  
    
    const heroAfterFirstHeal = sim.units.find(u => u.id === 'hero');
    expect(heroAfterFirstHeal).toBeDefined();
    expect(heroAfterFirstHeal!.hp).toBe(52); // Healed 2 HP
    
    // The ability should now be on cooldown for 30 ticks
    // Step 28 ticks (we already did 2)
    for (let i = 0; i < 28; i++) {
      sim.step();
    }
    
    // Hero should still be at same HP (cooldown not met)
    const heroBeforeSecondHeal = sim.units.find(u => u.id === 'hero');
    expect(heroBeforeSecondHeal!.hp).toBe(52);
    
    // Step 2 more times to meet cooldown and process heal
    sim.step();
    sim.step();
    
    const heroAfterSecondHeal = sim.units.find(u => u.id === 'hero');
    expect(heroAfterSecondHeal!.hp).toBe(54); // Another 2 HP healed
  });
  
  it('should not heal hero when at max HP', () => {
    const sim = new Simulator();

    const hero: Unit = {
      id: 'hero',
      pos: { x: 10, y: 10 },
      intendedMove: { x: 10, y: 10 },
      team: 'friendly',
      sprite: 'hero',
      state: 'idle',
      hp: 100, // Full HP
      maxHp: 100,
      mass: 1,
      abilities: ['heroRegeneration'],
      lastAbilityTick: {},
      tags: ['hero'],
      dmg: 15,
      meta: {}
    };

    sim.addUnit(hero);
    
    // Step - should not trigger heal
    sim.step();
    
    const heroAfter = sim.units.find(u => u.id === 'hero');
    expect(heroAfter).toBeDefined();
    expect(heroAfter!.hp).toBe(100); // Should stay at 100
    
    // Verify no heal events were generated
    const healEvents = sim.processedEvents.filter(e => e.kind === 'heal');
    expect(healEvents.length).toBe(0);
  });
  
  it('should not overheal beyond max HP', () => {
    const sim = new Simulator();

    const hero: Unit = {
      id: 'hero',
      pos: { x: 10, y: 10 },
      intendedMove: { x: 10, y: 10 },
      team: 'friendly',
      sprite: 'hero',
      state: 'idle',
      hp: 99, // Almost full HP
      maxHp: 100,
      mass: 1,
      abilities: ['heroRegeneration'],
      lastAbilityTick: {},
      tags: ['hero'],
      dmg: 15,
      meta: {}
    };

    sim.addUnit(hero);
    
    // Step - should heal but cap at max HP
    sim.step();
    
    const heroAfter = sim.units.find(u => u.id === 'hero');
    expect(heroAfter).toBeDefined();
    expect(heroAfter!.hp).toBe(100); // Should cap at 100, not 101
  });
});