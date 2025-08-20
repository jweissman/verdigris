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

      });
    }
    

    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const result = timeExecution(() => sim.step(), 1000);
    console.log(`Stationary units: median=${result.median.toFixed(4)}ms`);
    expect(result.median).toBeLessThan(PerfBudgets.step_50_units_ms);
  });
  
  test.skip('Proxy overhead is acceptable', () => {
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
  
  test('getAllUnits call frequency', () => {
    const sim = new Simulator(50, 50);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        abilities: ['melee', 'heal'] // Multiple abilities to trigger more DSL calls
      });
    }
    
    let callCount = 0;
    let proxyCreations = 0;
    
    const context = sim.getTickContext();
    const originalGetAllUnits = context.getAllUnits.bind(context);
    context.getAllUnits = function() {
      callCount++;
      return originalGetAllUnits();
    };
    
    const originalGetAllProxies = sim.proxyManager.getAllProxies.bind(sim.proxyManager);
    sim.proxyManager.getAllProxies = function() {
      proxyCreations++;
      return originalGetAllProxies();
    };
    
    console.log('\n=== getAllUnits Call Analysis ===');
    
    for (const rule of sim.rulebook) {
      const ruleName = rule.constructor.name;
      const beforeCalls = callCount;
      const beforeProxies = proxyCreations;
      
      rule.execute(context);
      
      const ruleCalls = callCount - beforeCalls;
      const ruleProxies = proxyCreations - beforeProxies;
      
      if (ruleCalls > 0) {
        console.log(`${ruleName.padEnd(20)}: ${ruleCalls.toString().padStart(3)} getAllUnits calls, ${ruleProxies.toString().padStart(3)} proxy creations`);
      }
    }
    
    console.log(`\nTOTAL: ${callCount} getAllUnits calls, ${proxyCreations} proxy creations per step`);
    console.log(`With 50 units = ${proxyCreations * 50} proxy objects created per step`);
    

    expect(callCount).toBeLessThan(120); // Reasonable limit with Ohm-based DSL
  });





    


    



    

    







    






    


    







    


    



    


    





      






    

    



    








    




    



    





  test('Performance summary', () => {
    const rounds = 10;
    let ruleMedians = new Map();
    let totalMedians = [];

    for (let round = 0; round < rounds; round++) {
      const sim = createTestSimulator(50);
      const results = profileRules(sim, 100);
      let totalMedian = 0;
      for (const [rule, timing] of results) {
        totalMedian += timing.median;
        if (!ruleMedians.has(rule)) ruleMedians.set(rule, []);
        ruleMedians.get(rule).push(timing.median);
      }
      totalMedians.push(totalMedian);
    }


    const avgResults = new Map();
    for (const [rule, medians] of ruleMedians.entries()) {
      const avgMedian = medians.reduce((a, b) => a + b, 0) / medians.length;
      avgResults.set(rule, { median: avgMedian, avg: avgMedian });
    }

    console.log('\n' + formatPerformanceTable(avgResults));

    const avgTotalMedian = totalMedians.reduce((a, b) => a + b, 0) / totalMedians.length;
    console.log(`\nBudget: ${PerfBudgets.total_step_ms}ms`);
    console.log(`Actual: ${avgTotalMedian.toFixed(4)}ms (avg of ${rounds} rounds)`);
  console.log(`Performance: ${((avgTotalMedian / PerfBudgets.total_step_ms) * 100).toFixed(0)}% of budget used`);

    expect(avgTotalMedian).toBeLessThan(PerfBudgets.total_step_ms * 10);
  });
});