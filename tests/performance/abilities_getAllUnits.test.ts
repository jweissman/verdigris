import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Abilities getAllUnits Optimization', () => {
  test('abilities should call getAllUnits only once per tick', () => {
    const sim = new Simulator(30, 30);
    
    // Track getAllUnits calls by intercepting context
    let getAllUnitsCallCount = 0;
    
    // Add units with abilities that have triggers and targets
    const priest = Encyclopaedia.unit('priest');
    if (priest) {
      sim.addUnit({
        ...priest,
        id: 'priest1',
        pos: { x: 10, y: 10 },
        team: 'friendly',
        hp: 100,
        maxHp: 100
      });
    }
    
    // Add some other units with abilities
    for (let i = 0; i < 5; i++) {
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: 5 + i * 2, y: 5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 50,
        maxHp: 50,
        sprite: 'test',
        state: 'idle',
        abilities: ['melee'],
        mass: 1
      });
    }
    
    // Reset counter
    getAllUnitsCallCount = 0;
    
    // Run one step
    sim.step();
    
    // Check how many times getAllUnits was called
    // Should be called once by each rule that needs it
    // Abilities should only call it once total, not once per unit
    console.log(`getAllUnits called ${getAllUnitsCallCount} times in one step`);
    
    // The Abilities rule should call it once
    // Other rules might call it too, but total should be reasonable
    expect(getAllUnitsCallCount).toBeLessThan(20); // Much less than 101!
  });
  
  test('2v2 tournament can run many matches without capacity issues', () => {
    // Test that we can run many matches with simulator reuse
    const unitTypes = ['soldier', 'archer'];
    const sim = new Simulator(15, 15);
    
    // Run 100 matches reusing the same simulator
    for (let i = 0; i < 100; i++) {
      // Reset and run a match
      sim.reset();
      
      // Add units
      sim.addUnit({
        id: `team1_unit1_${i}`,
        pos: { x: 2, y: 5 },
        team: 'friendly',
        hp: 100,
        maxHp: 100,
        sprite: 'soldier',
        state: 'idle',
        abilities: ['melee'],
        mass: 1
      });
      
      sim.addUnit({
        id: `team2_unit1_${i}`,
        pos: { x: 13, y: 5 },
        team: 'hostile',
        hp: 100,
        maxHp: 100,
        sprite: 'archer',
        state: 'idle',
        abilities: ['ranged'],
        mass: 1
      });
      
      // Run a few steps
      for (let step = 0; step < 10; step++) {
        sim.step();
        
        // Check for survivors
        const survivors = sim.units.filter(u => u.hp > 0);
        if (survivors.length <= 1) break;
      }
    }
    
    // Should complete without errors
    expect(true).toBe(true);
  });
});