import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Tournament Capacity Bug', () => {
  test('repeated matches with shared simulator accumulate units', () => {
    const sim = new Simulator(15, 15);
    
    // Simulate running many matches with reset between
    for (let match = 0; match < 100; match++) {
      // Reset like tournament does
      sim.reset();
      
      // Add 2v2 units
      sim.addUnit({
        id: `match${match}_unit1`,
        type: 'toymaker',
        pos: { x: 1, y: 5 },
        hp: 25,
        maxHp: 25,
        team: "friendly",
        sprite: "toymaker",
        state: "idle",
        intendedMove: { x: 0, y: 0 },
        mass: 1,
        dmg: 1,
        abilities: ['deployBot'],
        meta: {}
      });
      
      sim.addUnit({
        id: `match${match}_unit2`,
        type: 'toymaker',
        pos: { x: 1, y: 10 },
        hp: 25,
        maxHp: 25,
        team: "friendly",
        sprite: "toymaker",
        state: "idle",
        intendedMove: { x: 0, y: 0 },
        mass: 1,
        dmg: 1,
        abilities: ['deployBot'],
        meta: {}
      });
      
      sim.addUnit({
        id: `match${match}_unit3`,
        type: 'toymaker',
        pos: { x: 14, y: 5 },
        hp: 25,
        maxHp: 25,
        team: "hostile",
        sprite: "toymaker",
        state: "idle",
        intendedMove: { x: 0, y: 0 },
        mass: 1,
        dmg: 1,
        abilities: ['deployBot'],
        meta: {}
      });
      
      sim.addUnit({
        id: `match${match}_unit4`,
        type: 'toymaker',
        pos: { x: 14, y: 10 },
        hp: 25,
        maxHp: 25,
        team: "hostile",
        sprite: "toymaker",
        state: "idle",
        intendedMove: { x: 0, y: 0 },
        mass: 1,
        dmg: 1,
        abilities: ['deployBot'],
        meta: {}
      });
      
      // Run match for up to 500 steps
      for (let step = 0; step < 500; step++) {
        sim.step();
        
        // Check for combat end
        const friendlies = sim.units.filter(u => u.team === 'friendly' && u.hp > 0);
        const hostiles = sim.units.filter(u => u.team === 'hostile' && u.hp > 0);
        
        if (friendlies.length === 0 || hostiles.length === 0) {
          break; // Match over
        }
      }
      
      // Check if we're leaking units
      if (match > 0 && match % 20 === 0) {
        // After reset, we should have clean arrays
        // Check how many slots are marked as active
        let activeSlots = 0;
        for (let i = 0; i < sim['unitArrays'].capacity; i++) {
          if (sim['unitArrays'].active[i] === 1) {
            activeSlots++;
          }
        }
        console.log(`After ${match} matches, ${activeSlots} slots still marked active after reset`);
      }
    }
    
    // Reset after last match to check if arrays are properly cleared
    sim.reset();
    
    // After reset, should be completely empty
    let finalActiveSlots = 0;
    for (let i = 0; i < sim['unitArrays'].capacity; i++) {
      if (sim['unitArrays'].active[i] === 1) {
        finalActiveSlots++;
      }
    }
    
    console.log(`Final active slots after reset: ${finalActiveSlots}`);
    expect(finalActiveSlots).toBe(0); // Should be 0 after reset
  });
});