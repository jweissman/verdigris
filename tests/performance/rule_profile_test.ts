import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Rule Performance Profiling', () => {
  test('Profile individual rule execution times', () => {
    const sim = new Simulator(50, 50);
    
    // Add 50 units
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: i % 3 === 0 ? 'friendly' : i % 3 === 1 ? 'hostile' : 'neutral',
        hp: 20,
        abilities: i < 5 ? ['melee'] : []
      });
    }
    
    // Warm up
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const context = sim.getTickContext();
    const ruleTimes = new Map<string, { count: number, total: number, commands: number }>();
    
    // Profile each rule over many iterations
    const iterations = 1000;
    
    for (let iter = 0; iter < iterations; iter++) {
      for (const rule of sim.rulebook) {
        const ruleName = rule.constructor.name;
        
        const start = performance.now();
        const commands = rule.execute(context);
        const elapsed = performance.now() - start;
        
        if (!ruleTimes.has(ruleName)) {
          ruleTimes.set(ruleName, { count: 0, total: 0, commands: 0 });
        }
        
        const stats = ruleTimes.get(ruleName)!;
        stats.count++;
        stats.total += elapsed;
        stats.commands += (commands?.length || 0);
      }
    }
    
    // Sort by total time
    const sorted = Array.from(ruleTimes.entries())
      .sort((a, b) => b[1].total - a[1].total);
    
    console.log('\n=== Rule Performance Analysis (1000 iterations) ===');
    console.log('Rule                     | Avg Time (ms) | Total (ms) | Commands | % of Total');
    console.log('------------------------ | ------------- | ---------- | -------- | ----------');
    
    let totalTime = 0;
    for (const stats of ruleTimes.values()) {
      totalTime += stats.total;
    }
    
    for (const [ruleName, stats] of sorted) {
      const avgTime = stats.total / stats.count;
      const avgCommands = stats.commands / stats.count;
      const percent = (stats.total / totalTime) * 100;
      
      console.log(
        `${ruleName.padEnd(24)} | ${avgTime.toFixed(4).padStart(13)} | ${stats.total.toFixed(2).padStart(10)} | ${avgCommands.toFixed(1).padStart(8)} | ${percent.toFixed(1).padStart(9)}%`
      );
    }
    
    console.log('------------------------ | ------------- | ---------- | -------- | ----------');
    console.log(`TOTAL                    |               | ${totalTime.toFixed(2).padStart(10)} |          |      100.0%`);
    console.log(`\nAverage total per step: ${(totalTime / iterations).toFixed(4)}ms`);
    console.log(`Budget: 0.01ms per step`);
    console.log(`Over budget by: ${((totalTime / iterations) / 0.01).toFixed(1)}x`);
  });
});