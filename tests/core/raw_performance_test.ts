import { describe, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Raw Performance (no profiling)', () => {
  it('should measure actual step time without overhead', () => {
    const sim = new Simulator(32, 32);
    
    // Create a realistic scenario
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: Math.random() * 32, y: Math.random() * 32 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        maxHp: 20,
        mass: 1
      });
    }
    
    // Warm up
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Measure 100 steps
    const times: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      sim.step();
      const elapsed = performance.now() - start;
      times.push(elapsed);
    }
    
    // Calculate statistics
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    const median = times.sort((a, b) => a - b)[50];
    
    console.log('\n=== Raw Performance Stats (50 units, 100 steps) ===');
    console.log(`Average: ${avgTime.toFixed(3)}ms`);
    console.log(`Median: ${median.toFixed(3)}ms`);
    console.log(`Min: ${minTime.toFixed(3)}ms`);
    console.log(`Max: ${maxTime.toFixed(3)}ms`);
    console.log(`FPS at avg: ${(1000 / avgTime).toFixed(0)} fps (sim only)`);
    
    // Test with more units
    for (let i = 50; i < 200; i++) {
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: Math.random() * 32, y: Math.random() * 32 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        maxHp: 20,
        mass: 1
      });
    }
    
    const times200: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      sim.step();
      const elapsed = performance.now() - start;
      times200.push(elapsed);
    }
    
    const avgTime200 = times200.reduce((a, b) => a + b, 0) / times200.length;
    const median200 = times200.sort((a, b) => a - b)[50];
    
    console.log('\n=== With 200 units ===');
    console.log(`Average: ${avgTime200.toFixed(3)}ms`);
    console.log(`Median: ${median200.toFixed(3)}ms`);
    console.log(`FPS at avg: ${(1000 / avgTime200).toFixed(0)} fps (sim only)`);
    
    // Identify the scaling factor
    const scalingFactor = avgTime200 / avgTime;
    console.log(`\nScaling: ${scalingFactor.toFixed(2)}x slower with 4x units`);
    if (scalingFactor > 10) {
      console.log('❌ O(n²) scaling detected!');
    } else if (scalingFactor > 4) {
      console.log('⚠️ Worse than linear scaling');
    } else {
      console.log('✅ Near-linear scaling');
    }
  });
});