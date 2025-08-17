import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { Worker } from 'worker_threads';

describe('Parallel Rule Execution Potential', () => {
  test('Measure rule independence and parallelization potential', () => {
    const sim = new Simulator(50, 50);
    
    // Add 100 units
    for (let i = 0; i < 100; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        abilities: ['melee', 'ranged']
      });
    }
    
    // Warm up
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const context = sim.getTickContext();
    
    // Test 1: Sequential execution (current)
    const seqStart = performance.now();
    const seqCommands = [];
    for (let i = 0; i < 100; i++) {
      for (const rule of sim.rulebook) {
        const commands = rule.execute(context);
        if (commands?.length) {
          seqCommands.push(...commands);
        }
      }
    }
    const seqTime = performance.now() - seqStart;
    
    // Test 2: Simulated parallel (batch rules that don't conflict)
    // Group rules by whether they only read or also write
    const readOnlyRules = ['BiomeEffects', 'AmbientSpawning', 'LightningStorm'];
    const combatRules = ['MeleeCombat', 'Abilities', 'Knockback'];
    const movementRules = ['UnitMovement', 'UnitBehavior', 'AmbientBehavior'];
    
    const parStart = performance.now();
    const parCommands = [];
    for (let i = 0; i < 100; i++) {
      // Simulate parallel execution of independent rule groups
      const batch1Start = performance.now();
      for (const rule of sim.rulebook.filter(r => readOnlyRules.includes(r.constructor.name))) {
        const commands = rule.execute(context);
        if (commands?.length) parCommands.push(...commands);
      }
      const batch1Time = performance.now() - batch1Start;
      
      const batch2Start = performance.now();
      for (const rule of sim.rulebook.filter(r => combatRules.includes(r.constructor.name))) {
        const commands = rule.execute(context);
        if (commands?.length) parCommands.push(...commands);
      }
      const batch2Time = performance.now() - batch2Start;
      
      const batch3Start = performance.now();
      for (const rule of sim.rulebook.filter(r => movementRules.includes(r.constructor.name))) {
        const commands = rule.execute(context);
        if (commands?.length) parCommands.push(...commands);
      }
      const batch3Time = performance.now() - batch3Start;
      
      // Simulated parallel time is the max of the batches
      // (in real parallel execution, they'd run simultaneously)
    }
    const parTime = performance.now() - parStart;
    
    // Test 3: Measure individual rule times to find parallelization opportunity
    const ruleTimes = new Map<string, number>();
    for (const rule of sim.rulebook) {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        rule.execute(context);
      }
      ruleTimes.set(rule.constructor.name, performance.now() - start);
    }
    
    // Find rules that could run in parallel
    const sorted = Array.from(ruleTimes.entries()).sort((a, b) => b[1] - a[1]);
    const top5Time = sorted.slice(0, 5).reduce((sum, [_, time]) => sum + time, 0);
    const totalTime = sorted.reduce((sum, [_, time]) => sum + time, 0);
    
    console.log('\n=== Parallel Rule Execution Analysis ===');
    console.log(`Sequential (current):     ${seqTime.toFixed(2)}ms`);
    console.log(`Batched (simulated):      ${parTime.toFixed(2)}ms`);
    console.log(`Potential speedup:        ${(seqTime / parTime).toFixed(1)}x`);
    
    console.log('\n=== Top 5 Heaviest Rules ===');
    for (let i = 0; i < 5 && i < sorted.length; i++) {
      const [name, time] = sorted[i];
      const percent = (time / totalTime * 100).toFixed(1);
      console.log(`${name.padEnd(20)} ${(time/100).toFixed(4)}ms (${percent}%)`);
    }
    
    console.log(`\nTop 5 rules take ${(top5Time/totalTime*100).toFixed(1)}% of total time`);
    console.log(`If parallelized: ${(totalTime/100).toFixed(2)}ms → ~${(Math.max(...sorted.map(([_,t]) => t))/100).toFixed(2)}ms`);
    
    const maxRuleTime = Math.max(...sorted.map(([_,t]) => t)) / 100;
    const theoreticalSpeedup = (totalTime / 100) / maxRuleTime;
    console.log(`Theoretical max speedup: ${theoreticalSpeedup.toFixed(1)}x`);
  });
});