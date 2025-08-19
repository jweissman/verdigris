import { describe, test, expect } from 'bun:test';
import { createTestSimulator } from './perf_support';
import DSL from '../../src/rules/dsl';

describe('DSL Performance Analysis', () => {
  test('DSL evaluation patterns', () => {
    const sim = createTestSimulator(50);
    const context = sim.getTickContext();
    const allUnits = context.getAllUnits();
    const subject = allUnits[0];
    

    const patterns = [

      { expr: 'distance(closest.enemy()?.pos) <= 2', count: 5 },
      { expr: 'distance(closest.enemy()?.pos) <= 1', count: 4 },
      { expr: 'distance(closest.enemy()?.pos) <= 6', count: 3 },
      { expr: 'distance(closest.enemy()?.pos) <= 3', count: 3 },
      { expr: 'self.hp < self.maxHp * 0.5', count: 1 },
      { expr: 'closest.ally() != null', count: 1 },

      { expr: 'closest.enemy()', count: 10 },
      { expr: 'closest.enemy()?.pos', count: 8 },
      { expr: 'self.pos', count: 5 },
      { expr: 'self', count: 3 },
    ];
    
    console.log('\n=== DSL Pattern Performance ===');
    console.log('Pattern                                      | Time (ms) | Occurrences');
    console.log('-------------------------------------------- | --------- | -----------');
    
    let totalTime = 0;
    let totalEvals = 0;
    
    for (const { expr, count } of patterns) {
      const times = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        try {
          DSL.evaluate(expr, subject, context, undefined, allUnits);
        } catch (e) {

        }
        times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);
      const median = times[Math.floor(times.length / 2)];
      const totalForPattern = median * count;
      totalTime += totalForPattern;
      totalEvals += count;
      
      console.log(`${expr.padEnd(44)} | ${median.toFixed(4).padStart(9)} | ${count.toString().padStart(11)}`);
    }
    
    console.log('-------------------------------------------- | --------- | -----------');
    console.log(`TOTAL                                        | ${totalTime.toFixed(4).padStart(9)} | ${totalEvals.toString().padStart(11)}`);
    console.log(`\nAverage per evaluation: ${(totalTime / totalEvals).toFixed(4)}ms`);
    

    console.log('\n=== DSL Component Breakdown ===');
    

    const nounStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      DSL.noun(subject, allUnits, context);
    }
    const nounTime = (performance.now() - nounStart) / 1000;
    console.log(`DSL.noun creation: ${nounTime.toFixed(4)}ms`);
    

    const manualStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      let closest = null;
      let minDist = Infinity;
      for (const u of allUnits) {
        if (u.team !== subject.team && u.state !== 'dead') {
          const dx = u.pos.x - subject.pos.x;
          const dy = u.pos.y - subject.pos.y;
          const dist = dx * dx + dy * dy;
          if (dist < minDist) {
            minDist = dist;
            closest = u;
          }
        }
      }
    }
    const manualTime = (performance.now() - manualStart) / 1000;
    console.log(`Manual closest enemy: ${manualTime.toFixed(4)}ms`);
    

    const evalStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      try {
        eval('true');
      } catch (e) {}
    }
    const evalTime = (performance.now() - evalStart) / 1000;
    console.log(`eval() overhead: ${evalTime.toFixed(4)}ms`);
    
    expect(totalTime).toBeLessThan(1);
  });
});