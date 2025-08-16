import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Minimal Simulation Test', () => {
  test('Measure overhead sources', () => {
    // Test 1: Empty sim, no rules, no units
    {
      const sim = new Simulator(50, 50);
      sim.rulebook = [];
      
      // Warmup
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
      console.log(`\n=== Performance Breakdown ===`);
      console.log(`Empty sim (no rules, no units): ${avg.toFixed(4)}ms`);
    }
    
    // Test 2: 50 units, no rules
    {
      const sim = new Simulator(50, 50);
      sim.rulebook = [];
      
      for (let i = 0; i < 50; i++) {
        sim.addUnit({
          id: `unit_${i}`,
          pos: { x: i % 50, y: Math.floor(i / 50) },
          team: 'neutral',
          hp: 10
        });
      }
      
      // Warmup
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
      console.log(`50 units, no rules: ${avg.toFixed(4)}ms`);
    }
    
    // Test 3: 50 units, all rules
    {
      const sim = new Simulator(50, 50);
      
      for (let i = 0; i < 50; i++) {
        sim.addUnit({
          id: `unit_${i}`,
          pos: { x: i % 50, y: Math.floor(i / 50) },
          team: 'neutral',
          hp: 10
        });
      }
      
      console.log(`Total rules: ${sim.rulebook.length}`);
      
      // Warmup
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
      console.log(`50 units, all rules: ${avg.toFixed(4)}ms`);
    }
    
    // Test 4: Rule iteration overhead
    {
      const sim = new Simulator(50, 50);
      
      for (let i = 0; i < 50; i++) {
        sim.addUnit({
          id: `unit_${i}`,
          pos: { x: i % 50, y: Math.floor(i / 50) },
          team: 'neutral',
          hp: 10
        });
      }
      
      // Create empty rules
      class EmptyRule {
        execute(context: any) { return []; }
      }
      
      for (const ruleCount of [1, 5, 10, 20]) {
        sim.rulebook = [];
        for (let i = 0; i < ruleCount; i++) {
          sim.rulebook.push(new EmptyRule() as any);
        }
        
        // Warmup
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
        console.log(`${ruleCount} empty rules: ${avg.toFixed(4)}ms`);
      }
    }
    
    console.log(`\nTarget: 0.01ms per step`);
  });
});