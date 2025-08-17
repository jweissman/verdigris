import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('No Rules Performance', () => {
  test('Performance with empty rulebook', () => {
    const sim = new Simulator(50, 50);
    
    // Add 50 neutral units
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 20,
        abilities: []
      });
    }
    
    // Clear rulebook entirely
    sim.rulebook = [];
    
    // Warm up
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    // Measure
    const start = performance.now();
    const iterations = 10000;
    for (let i = 0; i < iterations; i++) {
      sim.step();
    }
    const elapsed = performance.now() - start;
    const avgStep = elapsed / iterations;
    
    console.log(`\n=== Empty Rulebook Performance ===`);
    console.log(`Average step: ${avgStep.toFixed(4)}ms`);
    console.log(`Budget: 0.01ms`);
    console.log(`${avgStep < 0.01 ? '✅ PASS' : '❌ FAIL'} - ${(avgStep / 0.01).toFixed(1)}x ${avgStep < 0.01 ? 'under' : 'over'} budget`);
    
    expect(avgStep).toBeLessThan(0.01);
  });
});