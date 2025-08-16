import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Simulator Overhead Analysis', () => {
  test('measure overhead of each sim.step() phase', () => {
    const sim = new Simulator(50, 50);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        intendedMove: { x: 0.1, y: 0.1 },
        team: 'neutral',
        hp: 10,
        abilities: []
      });
    }
    

    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    

    const configs = [
      { 
        name: 'Full simulation', 
        setup: () => {

        }
      },
      {
        name: 'No rules',
        setup: () => {
        }
      },
      {
        name: 'Just movement rule',
        setup: () => {
            r.constructor.name === 'UnitMovement'
          );
        }
      }
    ];
    
    configs.forEach(config => {
      config.setup();
      
      const times = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        sim.step();
        const elapsed = performance.now() - start;
        times.push(elapsed);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      console.log(`\n${config.name}:`);
      console.log(`  Avg: ${avg.toFixed(3)}ms`);
      console.log(`  Min: ${min.toFixed(3)}ms`);
      console.log(`  Max: ${max.toFixed(3)}ms`);
    });
    

    console.log('\n=== Direct SoA Movement ===');
    const arrays = (sim as any).unitArrays;
    const times = [];
    
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      

      for (let j = 0; j < arrays.capacity; j++) {
        if (arrays.active[j]) {
          arrays.posX[j] += 0.1;
          arrays.posY[j] += 0.1;
        }
      }
      
      const elapsed = performance.now() - start;
      times.push(elapsed);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Direct array update: ${avg.toFixed(4)}ms per step`);
    console.log(`That's ${(1.25 / avg).toFixed(0)}x faster than current!`);
  });
});