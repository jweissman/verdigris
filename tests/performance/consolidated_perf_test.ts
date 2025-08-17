import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { 
  PerfBudgets, 
  createTestSimulator, 
  timeExecution, 
  profileRules,
  formatPerformanceTable 
} from './perf_support';

describe('Performance Test Suite', () => {
  
  // Test individual rules meet their budgets
  test('Each rule meets budget', () => {
    const sim = createTestSimulator(50);
    const results = profileRules(sim, 100);
    
    for (const [ruleName, timing] of results) {
      test(`${ruleName} should be under ${PerfBudgets.rule_execution_ms}ms`, () => {
        console.log(`  ${ruleName}: median=${timing.median.toFixed(4)}ms`);
        expect(timing.median).toBeLessThan(PerfBudgets.rule_execution_ms);
      });
    }
  });
  
  test('Total step time with 50 units', () => {
    const sim = createTestSimulator(50);
    const result = timeExecution(() => sim.step(), 1000);
    
    console.log(`\nTotal step (50 units): median=${result.median.toFixed(4)}ms, budget=${PerfBudgets.step_50_units_ms}ms`);
    expect(result.median).toBeLessThan(PerfBudgets.step_50_units_ms);
  });
  
  test('Total step time with 100 units', () => {
    const sim = createTestSimulator(100);
    const result = timeExecution(() => sim.step(), 1000);
    
    console.log(`Total step (100 units): median=${result.median.toFixed(4)}ms, budget=${PerfBudgets.step_100_units_ms}ms`);
    expect(result.median).toBeLessThan(PerfBudgets.step_100_units_ms);
  });
  
  test('Step with neutral units (no combat)', () => {
    const sim = new Simulator(50, 50);
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 10,
        abilities: [] // No abilities for neutral units
      });
    }
    
    // Warm up
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const result = timeExecution(() => sim.step(), 1000);
    console.log(`Neutral units: median=${result.median.toFixed(4)}ms`);
    expect(result.median).toBeLessThan(PerfBudgets.step_50_units_ms);
  });
  
  test('Step with stationary units', () => {
    const sim = new Simulator(50, 50);
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 10
        // No intendedMove
      });
    }
    
    // Warm up
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const result = timeExecution(() => sim.step(), 1000);
    console.log(`Stationary units: median=${result.median.toFixed(4)}ms`);
    expect(result.median).toBeLessThan(PerfBudgets.step_50_units_ms);
  });
  
  test('Proxy overhead is acceptable', () => {
    const sim = new Simulator(50, 50);
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 10
      });
    }
    
    const proxyManager = (sim as any).proxyManager;
    const arrays = (sim as any).unitArrays;
    
    const proxyResult = timeExecution(() => {
      for (let i = 0; i < arrays.activeCount; i++) {
        const proxy = proxyManager.getProxy(i);
        const _ = proxy.pos.x + proxy.pos.y;
      }
    }, 1000);
    
    const directResult = timeExecution(() => {
      for (let i = 0; i < arrays.activeCount; i++) {
        const _ = arrays.posX[i] + arrays.posY[i];
      }
    }, 1000);
    
    const overhead = proxyResult.median / directResult.median;
    console.log(`\nProxy overhead: ${overhead.toFixed(1)}x (budget: ${PerfBudgets.proxy_overhead_multiplier}x)`);
    expect(overhead).toBeLessThan(PerfBudgets.proxy_overhead_multiplier);
  });
  
  test('Scales linearly with unit count', () => {
    const sizes = [10, 20, 40, 80];
    const timings: number[] = [];
    
    console.log('\n=== Scaling Analysis ===');
    for (const size of sizes) {
      const sim = createTestSimulator(size);
      const result = timeExecution(() => sim.step(), 100);
      timings.push(result.median);
      console.log(`${size} units: ${result.median.toFixed(4)}ms`);
    }
    
    for (let i = 1; i < sizes.length; i++) {
      const sizeRatio = sizes[i] / sizes[i-1];
      const timeRatio = timings[i] / timings[i-1];
      const efficiency = sizeRatio / timeRatio;
      
      console.log(`${sizes[i-1]} → ${sizes[i]}: efficiency=${efficiency.toFixed(2)}`);
      expect(efficiency).toBeGreaterThan(PerfBudgets.scaling_efficiency_min);
    }
  });
  
  test('Performance summary', () => {
    const sim = createTestSimulator(50);
    const results = profileRules(sim, 100);
    
    console.log('\n' + formatPerformanceTable(results));
    
    // Calculate total
    let totalMedian = 0;
    for (const [_, timing] of results) {
      totalMedian += timing.median;
    }
    
    console.log(`\nBudget: ${PerfBudgets.total_step_ms}ms`);
    console.log(`Actual: ${totalMedian.toFixed(4)}ms`);
    console.log(`Performance: ${((PerfBudgets.total_step_ms / totalMedian) * 100).toFixed(0)}% of budget used`);
    
    expect(totalMedian).toBeLessThan(PerfBudgets.total_step_ms);
  });
});