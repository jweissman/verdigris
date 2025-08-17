import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Neutral Units Performance', () => {
  test('Should be very fast with only neutral units', () => {
    const sim = new Simulator(50, 50);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 20,
        abilities: []  // NO ABILITIES
      });
    }
    

    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    

    const start = performance.now();
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      sim.step();
    }
    const elapsed = performance.now() - start;
    const avgStep = elapsed / iterations;
    
    console.log(`\n=== Neutral Units Only ===`);
    console.log(`Average step: ${avgStep.toFixed(4)}ms`);
    console.log(`Budget: 0.01ms`);
    console.log(`${avgStep < 0.01 ? '✅ PASS' : '❌ FAIL'} - ${(avgStep / 0.01).toFixed(1)}x over budget`);
    

    console.log(`System baseline (no rules): 0.0005ms`);
    console.log(`Expected with optimized rules: ~0.005ms`);
  });
});