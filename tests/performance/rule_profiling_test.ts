import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Rule Performance Profiling', () => {
  test('profile individual rules', () => {
    const sim = new Simulator(50, 50);
    
    // Add 50 units
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: Math.random() * 50, y: Math.random() * 50 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        abilities: []
      });
    }
    
    // Store all rules
    const allRules = [...sim.rulebook];
    
    // Test each rule individually
    const timings: { name: string, time: number }[] = [];
    
    for (const rule of allRules) {
      // Set only this rule
      sim.rulebook = [rule];
      
      // Warm up
      for (let i = 0; i < 100; i++) {
        sim.step();
      }
      
      // Measure
      const times: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const start = performance.now();
        sim.step();
        times.push(performance.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      timings.push({ name: rule.constructor.name, time: avg });
    }
    
    // Sort by slowest first
    timings.sort((a, b) => b.time - a.time);
    
    console.log('\n=== Rule Performance Profile (50 units) ===');
    console.log('Rule Name                    | Time (ms) | % of Budget (0.10ms)');
    console.log('---------------------------- | --------- | --------------------');
    
    let total = 0;
    for (const { name, time } of timings) {
      const percent = (time / 0.10) * 100;
      const bar = '█'.repeat(Math.min(50, Math.floor(percent / 2)));
      console.log(`${name.padEnd(28)} | ${time.toFixed(4).padStart(9)} | ${percent.toFixed(0).padStart(3)}% ${bar}`);
      total += time;
    }
    
    console.log('---------------------------- | --------- | --------------------');
    console.log(`TOTAL                        | ${total.toFixed(4).padStart(9)} | ${((total / 0.10) * 100).toFixed(0).padStart(3)}%`);
    console.log(`\nTarget: 0.10ms | Current Total: ${total.toFixed(4)}ms | ${(total / 0.10).toFixed(1)}x over budget`);
    
    // Now test with no rules at all
    sim.rulebook = [];
    const baseTimes: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      sim.step();
      baseTimes.push(performance.now() - start);
    }
    const baseTime = baseTimes.reduce((a, b) => a + b, 0) / baseTimes.length;
    
    console.log(`\nBase overhead (no rules): ${baseTime.toFixed(4)}ms`);
    console.log(`Rules overhead: ${(total - baseTime * allRules.length).toFixed(4)}ms`);
  });
});