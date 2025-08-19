import { describe, test } from 'bun:test';
import { createTestSimulator } from './perf_support';

describe('Abilities Performance Profiling', () => {
  test('profile abilities execution', () => {
    const sim = createTestSimulator(50);
    const context = sim.getTickContext();
    const abilities = sim.rulebook.find(r => r.constructor.name === 'Abilities');
    
    if (!abilities) {
      console.log('No Abilities rule found');
      return;
    }
    

    for (let i = 0; i < 10; i++) {
      abilities.execute(context);
    }
    

    const times = {
      total: [],
      getAllUnits: [],
      filtering: [],
      compilation: [],
      evaluation: [],
      effects: []
    };
    

    const originalExecute = abilities.execute.bind(abilities);
    let phaseStart;
    
    abilities.execute = function(ctx) {
      const start = performance.now();
      

      phaseStart = performance.now();
      const units = ctx.getAllUnits();
      times.getAllUnits.push(performance.now() - phaseStart);
      

      const result = originalExecute(ctx);
      
      times.total.push(performance.now() - start);
      return result;
    };
    

    for (let i = 0; i < 100; i++) {
      abilities.execute(context);
    }
    

    const median = (arr) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    
    console.log('\nAbilities Performance Breakdown:');
    console.log(`  Total: ${median(times.total).toFixed(4)}ms`);
    console.log(`  getAllUnits: ${median(times.getAllUnits).toFixed(4)}ms`);
    console.log(`  Filtering: ~${(median(times.total) - median(times.getAllUnits)).toFixed(4)}ms`);
    

    const allUnits = context.getAllUnits();
    const unitsWithAbilities = allUnits.filter(u => u.abilities?.length > 0);
    console.log(`\nUnits: ${allUnits.length} total, ${unitsWithAbilities.length} with abilities`);
    

    const dslCompiler = require('../../src/dmg/dsl_compiler').dslCompiler;
    console.log(`DSL Cache size: ${dslCompiler.cache.size}`);
  });
});