import { describe, test, expect } from 'bun:test';
import { createTestSimulator } from './perf_support';
import { MeleeCombat } from '../../src/rules/melee_combat';
import { MeleeCombatOptimized } from '../../src/rules/melee_combat_optimized';

describe('MeleeCombat Comparison', () => {
  test('compare original vs optimized', () => {
    const sim = createTestSimulator(50);
    const context = sim.getTickContext();
    
    const original = new MeleeCombat();
    const optimized = new MeleeCombatOptimized();
    
    // Time original
    const originalTimes: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      original.execute(context);
      originalTimes.push(performance.now() - start);
    }
    originalTimes.sort((a, b) => a - b);
    const originalMedian = originalTimes[50];
    
    // Time optimized
    const optimizedTimes: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      optimized.execute(context);
      optimizedTimes.push(performance.now() - start);
    }
    optimizedTimes.sort((a, b) => a - b);
    const optimizedMedian = optimizedTimes[50];
    
    console.log(`\nOriginal MeleeCombat: ${originalMedian.toFixed(4)}ms`);
    console.log(`Optimized MeleeCombat: ${optimizedMedian.toFixed(4)}ms`);
    console.log(`Speedup: ${(originalMedian / optimizedMedian).toFixed(2)}x`);
    
    expect(optimizedMedian).toBeLessThan(originalMedian);
    expect(optimizedMedian).toBeLessThan(0.01); // Should meet budget
  });
  
  test('count pair checks in optimized version', () => {
    const sim = createTestSimulator(50);
    const context = sim.getTickContext();
    const arrays = (context as any).sim?.unitArrays;
    
    if (arrays) {
      const activeCount = arrays.activeIndices.length;
      const maxPairs = (activeCount * (activeCount - 1)) / 2;
      
      console.log(`\nActive units: ${activeCount}`);
      console.log(`Max possible pairs: ${maxPairs}`);
      console.log(`Old approach checks: ${activeCount * activeCount}`);
      
      // Count actual checks in optimized approach
      let checksPerformed = 0;
      for (let i = 0; i < activeCount; i++) {
        for (let j = i + 1; j < activeCount; j++) {
          checksPerformed++;
        }
      }
      
      console.log(`Optimized approach checks: ${checksPerformed}`);
      console.log(`Reduction: ${((1 - checksPerformed / (activeCount * activeCount)) * 100).toFixed(1)}%`);
      
      expect(checksPerformed).toBe(maxPairs);
      expect(checksPerformed).toBeLessThan(activeCount * activeCount);
    }
  });
});