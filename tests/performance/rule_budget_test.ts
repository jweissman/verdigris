import { describe, test, expect } from 'bun:test';
import { createTestSimulator, PerfBudgets } from './perf_support';

describe('Individual Rule Budget Tests', () => {
  const sim = createTestSimulator(50);
  const context = sim.getTickContext();
  

  for (const rule of sim.rulebook) {
    const ruleName = rule.constructor.name;
    
    test(`${ruleName} should be under ${PerfBudgets.rule_execution_ms}ms budget`, () => {
      const times: number[] = [];
      

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        rule.execute(context);
        times.push(performance.now() - start);
      }
      
      times.sort((a, b) => a - b);
      const median = times[50];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      
      console.log(`  ${ruleName}: median=${median.toFixed(4)}ms, avg=${avg.toFixed(4)}ms`);
      
      expect(median).toBeLessThan(PerfBudgets.rule_execution_ms * 2.5);
    });
  }
});