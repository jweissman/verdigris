import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Minimal Simulation Test', () => {
  test('absolute minimal step', () => {
    const sim = new Simulator(50, 50);
    
    // Add 50 units
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        intendedMove: { x: 0.1, y: 0 },
        team: 'neutral',
        hp: 10
      });
    }
    
    // Clear all rules
    sim.rulebook = [];
    
    // Disable everything we can
    (sim as any).pairwiseBatcher = null;
    
    // Measure raw step time
    const times: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      sim.step();
      const elapsed = performance.now() - start;
      times.push(elapsed);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const median = times.sort((a, b) => a - b)[500];
    
    console.log('\n=== Absolute Minimal Step (50 units, no rules) ===');
    console.log(`Average: ${avg.toFixed(4)}ms`);
    console.log(`Median: ${median.toFixed(4)}ms`);
    console.log(`Min: ${min.toFixed(4)}ms`);
    console.log(`Max: ${max.toFixed(4)}ms`);
    console.log(`\nTarget: 0.15ms`);
    console.log(`Current: ${avg.toFixed(4)}ms (${(avg/0.15).toFixed(1)}x slower)`);
    
    // Now test with just the movement rule
    const UnitMovement = (sim as any).rulebook.find((r: any) => 
      r.constructor.name === 'UnitMovement'
    );
    
    if (UnitMovement) {
      sim.rulebook = [UnitMovement];
      
      const times2: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const start = performance.now();
        sim.step();
        const elapsed = performance.now() - start;
        times2.push(elapsed);
      }
      
      const avg2 = times2.reduce((a, b) => a + b, 0) / times2.length;
      console.log(`\nWith movement rule: ${avg2.toFixed(4)}ms`);
    }
  });
});