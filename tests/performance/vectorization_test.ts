import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Vectorization Performance', () => {
  test('handles 100 units efficiently', () => {
    const sim = new Simulator(50, 50);
    
    // Add 100 units
    for (let i = 0; i < 100; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: Math.floor(i / 10) * 5, y: (i % 10) * 5 },
        intendedMove: { x: 0.1, y: 0.1 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        sprite: 'soldier',
        state: 'idle',
        hp: 10,
        maxHp: 10,
        mass: 1
      });
    }
    
    const startTime = performance.now();
    
    // Run 100 steps
    for (let step = 0; step < 100; step++) {
      sim.step();
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const timePerStep = totalTime / 100;
    
    console.log(`100 units, 100 steps: ${totalTime.toFixed(2)}ms total, ${timePerStep.toFixed(2)}ms per step`);
    
    // Should complete in reasonable time (< 1 second for 100 steps)
    expect(totalTime).toBeLessThan(1000);
    
    // Average time per step should be < 10ms for smooth 60fps
    expect(timePerStep).toBeLessThan(10);
  });
  
  test('all creatures can coexist', () => {
    const sim = new Simulator(50, 50);
    
    // Add various creature types
    const creatureTypes = ['soldier', 'worm', 'squirrel', 'mechatron', 'grappler', 'toymaker'];
    creatureTypes.forEach((name, i) => {
      // Add 5 of each type
      for (let j = 0; j < 5; j++) {
        const creature = Encyclopaedia.unit(name);
        if (creature) {
          sim.addUnit({
            ...creature,
            id: `${name}_${j}`,
            pos: { x: (i * 8) + j, y: 10 + (j * 2) },
            team: i % 2 === 0 ? 'friendly' : 'hostile'
          });
        }
      }
    });
    
    const startTime = performance.now();
    
    // Run 50 steps - all creatures together!
    for (let step = 0; step < 50; step++) {
      sim.step();
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    console.log(`${sim.units.length} creatures (${creatureTypes.length} types), 50 steps: ${totalTime.toFixed(2)}ms`);
    
    // Should handle all creatures without crashing
    expect(sim.units.length).toBeGreaterThan(0);
    
    // Should complete in reasonable time
    expect(totalTime).toBeLessThan(2000);
  });
});