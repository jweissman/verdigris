import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';
import { formatPerformanceTable, profileRules, createTestSimulator, timeExecution } from './perf_support';
import perfConfig from '../perf.json';
import { Abilities } from '../../src/rules/abilities';
import DSL from '../../src/rules/dsl';

const PerfBudgets = perfConfig.budgets;

describe('Performance Suite', () => {
  describe('Rule Performance', () => {
    test('Each rule meets budget', () => {
      const sim = createTestSimulator(50);
      const results = profileRules(sim, 100);
      const table = formatPerformanceTable(results);
      console.log('\n' + table);
      
      let failures = 0;
      for (const [name, timing] of results) {
        if (timing.median > PerfBudgets.rule_execution_ms) {
          failures++;
        }
      }
      
      expect(failures).toBe(0);
    });
    
    test('Abilities rule breakdown', () => {
      const sim = createTestSimulator(50);
      const context = sim.getTickContext();
      const abilities = new Abilities();
      
      // Test with different unit configurations
      const configs = [
        { desc: 'No enemies (25 units with abilities)', enemyCount: 0 },
        { desc: 'With enemies (50 units with abilities)', enemyCount: 25 }
      ];
      
      for (const config of configs) {
        const testSim = new Simulator(50, 50);
        for (let i = 0; i < 25; i++) {
          testSim.addUnit({
            id: `ally_${i}`,
            pos: { x: Math.random() * 50, y: Math.random() * 50 },
            team: 'friendly',
            hp: 20,
            abilities: ['melee', 'ranged']
          });
        }
        
        if (config.enemyCount > 0) {
          for (let i = 0; i < config.enemyCount; i++) {
            testSim.addUnit({
              id: `enemy_${i}`,
              pos: { x: Math.random() * 50, y: Math.random() * 50 },
              team: 'hostile',
              hp: 20,
              abilities: ['melee']
            });
          }
        }
        
        for (let i = 0; i < 100; i++) testSim.step();
        
        const ctx = testSim.getTickContext();
        const result = timeExecution(() => abilities.execute(ctx), 100);
        console.log(`${config.desc}: ${result.median.toFixed(4)}ms`);
      }
      
      // DSL performance analysis
      const allUnits = context.getAllUnits();
      const subject = allUnits[0];
      console.log('\nSingle DSL evaluation (closest.enemy()): ' + 
        timeExecution(() => DSL.evaluate('closest.enemy()', subject, context, undefined, allUnits), 100).median.toFixed(4) + 'ms');
      
      expect(true).toBe(true);
    });
  });
  
  describe('System Performance', () => {
    test('Proxy overhead analysis', () => {
      const sim = createTestSimulator(50);
      const context = sim.getTickContext();
      
      const getAllUnitsTime = timeExecution(() => context.getAllUnits(), 1000).median;
      const arrays = (context as any).getArrays();
      const iterationTime = timeExecution(() => {
        for (const idx of arrays.activeIndices) {
          const x = arrays.posX[idx];
        }
      }, 1000).median;
      
      console.log('\n=== Proxy Construction Overhead ===');
      console.log(`getAllUnits():          ${getAllUnitsTime.toFixed(4)}ms`);
      console.log(`Array iteration only:   ${iterationTime.toFixed(4)}ms`);
      console.log(`Overhead factor:        ${(getAllUnitsTime / iterationTime).toFixed(1)}x`);
      
      expect(getAllUnitsTime / iterationTime).toBeLessThan(PerfBudgets.proxy_overhead_multiplier);
    });
    
    test('Step performance with varying unit counts', () => {
      const sizes = [10, 25, 50, 100];
      const timings: number[] = [];
      
      console.log('\n=== Scaling Performance ===');
      for (const size of sizes) {
        const sim = new Simulator(50, 50);
        
        for (let i = 0; i < size; i++) {
          sim.addUnit({
            id: `unit${i}`,
            pos: { x: Math.random() * 50, y: Math.random() * 50 },
            intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
            team: i % 2 === 0 ? 'friendly' : 'hostile',
            hp: 20,
            abilities: i < size/2 ? ['melee'] : []
          });
        }
        
        for (let i = 0; i < 100; i++) sim.step();
        
        const result = timeExecution(() => sim.step(), 100);
        timings.push(result.median);
        const budget = size <= 50 ? PerfBudgets.step_50_units_ms : PerfBudgets.step_100_units_ms;
        const status = result.median < budget ? '✅' : '❌';
        console.log(`${size} units: ${result.median.toFixed(4)}ms (budget: ${budget}ms) ${status}`);
      }
      
      // Check scaling efficiency
      for (let i = 1; i < sizes.length; i++) {
        const sizeRatio = sizes[i] / sizes[i-1];
        const timeRatio = timings[i] / timings[i-1];
        const efficiency = sizeRatio / timeRatio;
        console.log(`  ${sizes[i-1]} → ${sizes[i]}: efficiency=${efficiency.toFixed(2)}`);
        expect(efficiency).toBeGreaterThan(PerfBudgets.scaling_efficiency_min);
      }
    });
  });
  
  describe('DSL Performance', () => {
    test('Common expression patterns', () => {
      const sim = createTestSimulator(50);
      const context = sim.getTickContext();
      const allUnits = context.getAllUnits();
      const subject = allUnits[0];
      
      const expressions = [
        { expr: 'true', desc: 'Simple boolean' },
        { expr: 'self.hp < self.maxHp * 0.5', desc: 'HP check (fast path)' },
        { expr: 'distance(closest.enemy()?.pos) <= 10', desc: 'Distance check (fast path)' },
        { expr: 'distance(closest.enemy()?.pos) <= 2', desc: 'Melee range check' },
        { expr: 'closest.ally() != null', desc: 'Ally existence check' },
        { expr: 'weakest.ally()', desc: 'Find weakest ally' },
      ];
      
      console.log('\n=== DSL Expression Performance ===');
      for (const { expr, desc } of expressions) {
        const result = timeExecution(() => 
          DSL.evaluate(expr, subject, context, undefined, allUnits), 100
        );
        console.log(`${desc.padEnd(30)} "${expr}": ${result.median.toFixed(4)}ms`);
      }
      
      expect(true).toBe(true);
    });
  });
});