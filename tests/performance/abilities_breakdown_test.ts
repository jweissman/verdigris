import { describe, test } from 'bun:test';
import { createTestSimulator } from './perf_support';

describe('Abilities Breakdown', () => {
  test('measure each phase', () => {
    const sim = createTestSimulator(50);
    const context = sim.getTickContext();
    const abilities = sim.rulebook.find(r => r.constructor.name === 'Abilities');
    
    if (!abilities) return;
    
    // Count abilities
    const units = context.getAllUnits();
    let totalAbilities = 0;
    let unitsWithAbilities = 0;
    
    for (const unit of units) {
      if (unit.abilities?.length > 0) {
        unitsWithAbilities++;
        totalAbilities += unit.abilities.length;
      }
    }
    
    console.log(`\nUnits: ${units.length} total`);
    console.log(`Units with abilities: ${unitsWithAbilities}`);
    console.log(`Total abilities to check: ${totalAbilities}`);
    console.log(`Average abilities per unit: ${(totalAbilities / unitsWithAbilities).toFixed(1)}`);
    
    // Time the execute
    const times = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      abilities.execute(context);
      times.push(performance.now() - start);
    }
    
    times.sort((a, b) => a - b);
    const median = times[50];
    console.log(`\nMedian execution time: ${median.toFixed(4)}ms`);
    console.log(`Time per ability check: ${(median / totalAbilities).toFixed(4)}ms`);
  });
});