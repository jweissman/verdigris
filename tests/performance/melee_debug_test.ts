import { describe, test, expect } from 'bun:test';
import { createTestSimulator } from './perf_support';

describe('MeleeCombat Debug', () => {
  test('profile melee combat operations', () => {
    const sim = createTestSimulator(50);
    const context = sim.getTickContext();
    const meleeRule = sim.rulebook.find(r => r.constructor.name === 'MeleeCombat');
    
    if (!meleeRule) {
      throw new Error('MeleeCombat rule not found');
    }
    
    // Add instrumentation
    const original = meleeRule.execute.bind(meleeRule);
    let gridChecks = 0;
    let distanceChecks = 0;
    let unitsProcessed = 0;
    
    (meleeRule as any).performMeleeCombat = function(ctx: any, commands: any[]) {
      const arrays = (ctx as any).sim?.unitArrays;
      if (arrays) {
        console.log(`Active units: ${arrays.activeIndices.length}`);
        
        for (const i of arrays.activeIndices) {
          unitsProcessed++;
          // Count how many units we check against
          let checksForThisUnit = 0;
          for (const j of arrays.activeIndices) {
            if (i !== j) {
              checksForThisUnit++;
              distanceChecks++;
            }
          }
          if (checksForThisUnit > 0) {
            console.log(`Unit ${i} checked against ${checksForThisUnit} other units`);
          }
        }
      }
    };
    
    const start = performance.now();
    meleeRule.execute(context);
    const elapsed = performance.now() - start;
    
    console.log(`\nMeleeCombat took ${elapsed.toFixed(4)}ms`);
    console.log(`Units processed: ${unitsProcessed}`);
    console.log(`Distance checks: ${distanceChecks}`);
    console.log(`That's ${distanceChecks / unitsProcessed} checks per unit (should be ~4-8 with spatial grid)`);
    
    expect(distanceChecks).toBeLessThan(unitsProcessed * unitsProcessed); // Should be much less than n²
  });
});