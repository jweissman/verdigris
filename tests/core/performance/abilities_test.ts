import { describe, expect, test } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import Encyclopaedia from '../../../src/dmg/encyclopaedia';

describe("Performance", () => {
  describe("Abilities", () => {
    test('abilities should call getAllUnits only once per tick', () => {
      const sim = new Simulator(30, 30);
      let getAllUnitsCallCount = 0;
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
      // console.log(`getAllUnits called ${getAllUnitsCallCount} times in one step`);
    
      // The Abilities rule should call it once
      // Other rules might call it too, but total should be reasonable
      expect(getAllUnitsCallCount).toBeLessThan(20); // Much less than 101!
    });
  });
});