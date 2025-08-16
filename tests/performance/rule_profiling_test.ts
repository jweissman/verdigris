import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Rule Performance Profiling', () => {
  const budget = 0.1; // 100ms budget
  test('profile individual rules', () => {
    const sim = new Simulator(50, 50);
    

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
    

    const allRules = [...sim.rulebook];
    

    const timings: { name: string, time: number }[] = [];
    
    for (const rule of allRules) {

      

      for (let i = 0; i < 100; i++) {
        sim.step();
      }
      

      const times: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const start = performance.now();
        sim.step();
        times.push(performance.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      timings.push({ name: rule.constructor.name, time: avg });
    }
    

    timings.sort((a, b) => b.time - a.time);
    
    console.log('\n=== Rule Performance Profile (50 units) ===');
    console.log(`Rule Name                    | Time (ms) | % of Budget (${budget}ms)`);
    console.log('---------------------------- | --------- | --------------------');
    
    let total = 0;
    for (const { name, time } of timings) {
      const percent = (time / budget) * 100;
      const bar = '█'.repeat(Math.min(50, Math.floor(percent / 2)));
      console.log(`${name.padEnd(28)} | ${time.toFixed(4).padStart(9)} | ${percent.toFixed(0).padStart(3)}% ${bar}`);
      total += time;
    }
    
    console.log('---------------------------- | --------- | --------------------');
    console.log(`TOTAL                        | ${total.toFixed(4).padStart(9)} | ${((total / budget) * 100).toFixed(0).padStart(3)}%`);
    console.log(`\nTarget: ${budget}ms | Current Total: ${total.toFixed(4)}ms | ${(total / budget).toFixed(1)}x over budget`);


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