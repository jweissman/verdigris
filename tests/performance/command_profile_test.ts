import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Command Performance Profiling', () => {
  test('Profile individual command execution times', () => {
    const sim = new Simulator(50, 50);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: i % 3 === 0 ? 'friendly' : i % 3 === 1 ? 'hostile' : 'neutral',
        hp: 20,
        abilities: i < 10 ? ['melee'] : []
      });
    }
    

    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    

    const commandHandler = sim.commandProcessor;
    const originalExecuteOne = commandHandler.executeOne;
    const commandTimes = new Map<string, { count: number, total: number }>();
    
    commandHandler.executeOne = function(queuedCommand, context) {
      const start = performance.now();
      const result = originalExecuteOne.call(this, queuedCommand, context);
      const elapsed = performance.now() - start;
      
      const type = queuedCommand.type;
      if (!commandTimes.has(type)) {
        commandTimes.set(type, { count: 0, total: 0 });
      }
      const stats = commandTimes.get(type);
      stats.count++;
      stats.total += elapsed;
      
      return result;
    };
    

    const stepStart = performance.now();
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    const totalStepTime = performance.now() - stepStart;
    

    console.log('\n=== Command Performance Analysis (100 steps) ===');
    console.log('Command Type         | Count  | Total (ms) | Avg (μs) | % of Total');
    console.log('-------------------- | ------ | ---------- | -------- | ----------');
    
    let totalCommandTime = 0;
    const sorted = Array.from(commandTimes.entries())
      .sort((a, b) => b[1].total - a[1].total);
    
    for (const [type, stats] of sorted) {
      totalCommandTime += stats.total;
      const avg = (stats.total / stats.count) * 1000; // Convert to microseconds
      const percent = (stats.total / totalStepTime) * 100;
      
      console.log(
        `${type.padEnd(20)} | ${stats.count.toString().padStart(6)} | ${stats.total.toFixed(4).padStart(10)} | ${avg.toFixed(2).padStart(8)} | ${percent.toFixed(1).padStart(9)}%`
      );
    }
    
    console.log('-------------------- | ------ | ---------- | -------- | ----------');
    console.log(`TOTAL                | ${Array.from(commandTimes.values()).reduce((sum, s) => sum + s.count, 0).toString().padStart(6)} | ${totalCommandTime.toFixed(4).padStart(10)} |          | ${((totalCommandTime / totalStepTime) * 100).toFixed(1).padStart(9)}%`);
    
    console.log(`\nTotal simulation time: ${totalStepTime.toFixed(2)}ms`);
    console.log(`Average step time: ${(totalStepTime / 100).toFixed(3)}ms`);
    console.log(`Commands per step: ${(Array.from(commandTimes.values()).reduce((sum, s) => sum + s.count, 0) / 100).toFixed(1)}`);
    

    commandHandler.executeOne = originalExecuteOne;
  });
});