import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';
import perfConfig from '../perf.json';

const PerfBudgets = perfConfig.budgets;


function timeExecution(fn: () => void, iterations: number = 1000): { median: number; avg: number } {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return {
    median: times[Math.floor(times.length / 2)],
    avg: times.reduce((a, b) => a + b, 0) / times.length
  };
}

describe('Performance Suite', () => {
  

  test('Each rule meets budget', () => {
    const sim = new Simulator(50, 50);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: Math.random() * 50, y: Math.random() * 50 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        abilities: ['melee', 'ranged']
      });
    }
    

    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const context = sim.getTickContext();
    let failures = 0;
    
    for (const rule of sim.rulebook) {
      const ruleName = rule.constructor.name;
      const result = timeExecution(() => rule.execute(context), 100);
      
      console.log(`  ${ruleName}: ${result.median.toFixed(4)}ms`);
      
      if (result.median > PerfBudgets.rule_execution_ms) {
        console.log(`    ❌ Over budget (${PerfBudgets.rule_execution_ms}ms)`);
        failures++;
      }
    }
    
    expect(failures).toBe(0);
  });
  

  test('Step performance with 50 units', () => {
    const sim = new Simulator(50, 50);
    
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: Math.random() * 50, y: Math.random() * 50 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        abilities: ['melee', 'ranged']
      });
    }
    

    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const result = timeExecution(() => sim.step(), 1000);
    console.log(`\n50 units: median=${result.median.toFixed(4)}ms (budget: ${PerfBudgets.step_50_units_ms}ms)`);
    
    expect(result.median).toBeLessThan(PerfBudgets.step_50_units_ms);
  });
  
  test('Step performance with 100 units', () => {
    const sim = new Simulator(50, 50);
    
    for (let i = 0; i < 100; i++) {
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: Math.random() * 50, y: Math.random() * 50 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        abilities: i < 50 ? ['melee'] : []  // Only half have abilities
      });
    }
    

    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const result = timeExecution(() => sim.step(), 1000);
    console.log(`100 units: median=${result.median.toFixed(4)}ms (budget: ${PerfBudgets.step_100_units_ms}ms)`);
    
    expect(result.median).toBeLessThan(PerfBudgets.step_100_units_ms);
  });
  
  test.skip('Scaling efficiency', () => {
    const sizes = [10, 20, 40, 80];
    const timings: number[] = [];
    for (const size of sizes) {
      const sim = new Simulator(50, 50);
      
      for (let i = 0; i < size; i++) {
        sim.addUnit({
          id: `unit${i}`,
          pos: { x: Math.random() * 50, y: Math.random() * 50 },
          intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
          team: i % 2 === 0 ? 'friendly' : 'hostile',
          hp: 20,
          abilities: ['melee']
        });
      }
      

      for (let i = 0; i < 100; i++) {
        sim.step();
      }
      
      const result = timeExecution(() => sim.step(), 100);
      timings.push(result.median);
      console.log(`${size} units: ${result.median.toFixed(4)}ms`);
    }
    

    for (let i = 1; i < sizes.length; i++) {
      const sizeRatio = sizes[i] / sizes[i-1];
      const timeRatio = timings[i] / timings[i-1];
      const efficiency = sizeRatio / timeRatio;
      
      console.log(`  ${sizes[i-1]} → ${sizes[i]}: efficiency=${efficiency.toFixed(2)}`);
      expect(efficiency).toBeGreaterThan(PerfBudgets.scaling_efficiency_min);
    }
  });
  
  test.skip('Scenario performance', () => {
    const scenarios = ['simple', 'complex'];
    const STEPS = 100;
    
    for (const scenario of scenarios) {
      const sim = new Simulator(32, 32);
      const loader = new SceneLoader(sim);
      loader.loadScenario(scenario);
      
      const start = performance.now();
      for (let i = 0; i < STEPS; i++) {
        sim.step();
      }
      const elapsed = performance.now() - start;
      const perStep = elapsed / STEPS;
      
      console.log(`${scenario}: ${perStep.toFixed(4)}ms per step`);
      expect(perStep).toBeLessThan(PerfBudgets.total_step_ms);
    }
  });
});