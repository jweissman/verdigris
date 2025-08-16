import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe.skip('Performance Profiling', () => {
  it('should measure time to first update (TTFU)', () => {
    const measurements = [];
    
    for (let run = 0; run < 5; run++) {
      Encyclopaedia.counts = {};
      

      const t0 = performance.now();
      const sim = new Simulator(32, 24);
      const t1 = performance.now();
      

      for (let i = 0; i < 20; i++) {
        sim.addUnit({
          id: `unit_${i}`,
          pos: { x: i % 32, y: Math.floor(i / 32) },
          intendedMove: { x: 0, y: 0 },
          team: i % 2 === 0 ? 'friendly' : 'hostile',
          sprite: 'soldier',
          state: 'idle',
          hp: 10,
          maxHp: 10,
          mass: 1,
          abilities: ['melee'],
          tags: ['hunt'],
          meta: {}
        });
      }
      const t2 = performance.now();
      

      sim.step();
      const t3 = performance.now();
      

      const steadyTimes = [];
      for (let i = 0; i < 5; i++) {
        const s0 = performance.now();
        sim.step();
        const s1 = performance.now();
        steadyTimes.push(s1 - s0);
      }
      
      measurements.push({
        construction: t1 - t0,
        unitSetup: t2 - t1,
        firstStep: t3 - t2,
        steadyAvg: steadyTimes.reduce((a, b) => a + b, 0) / steadyTimes.length
      });
    }
    

    const avg = {
      construction: measurements.reduce((a, b) => a + b.construction, 0) / measurements.length,
      unitSetup: measurements.reduce((a, b) => a + b.unitSetup, 0) / measurements.length,
      firstStep: measurements.reduce((a, b) => a + b.firstStep, 0) / measurements.length,
      steadyAvg: measurements.reduce((a, b) => a + b.steadyAvg, 0) / measurements.length
    };
    
    console.debug('\n=== Time to First Update (TTFU) ===');
    console.debug(`Simulator construction: ${avg.construction.toFixed(2)}ms`);
    console.debug(`Unit setup (20 units):  ${avg.unitSetup.toFixed(2)}ms`);
    console.debug(`First step:             ${avg.firstStep.toFixed(2)}ms`);
    console.debug(`Steady state avg:       ${avg.steadyAvg.toFixed(2)}ms`);
    console.debug(`---`);
    console.debug(`Total TTFU: ${(avg.construction + avg.unitSetup + avg.firstStep).toFixed(2)}ms`);
    console.debug(`First step overhead: ${(avg.firstStep - avg.steadyAvg).toFixed(2)}ms`);
    
    expect(avg.firstStep).toBeLessThan(5);
    expect(avg.steadyAvg).toBeLessThan(2);
  });
  
  it('should profile unit movement specifically', () => {
    const sim = new Simulator(20, 20);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: Math.random() * 20, y: Math.random() * 20 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        maxHp: 20,
        mass: 1,
        tags: ['wander']
      });
    }
    
    sim.startProfiling();
    

    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const report = sim.getProfilingReport();
    const movement = report.find(r => r.ruleName === 'UnitMovement');
    const combat = report.find(r => r.ruleName === 'MeleeCombat');
    const knockback = report.find(r => r.ruleName === 'Knockback');
    
    console.debug('\n=== Movement & Combat Profiling ===');
    if (movement) {
      console.debug(`UnitMovement: ${movement.avgTime.toFixed(2)}ms avg, ${movement.maxTime.toFixed(2)}ms max`);
    }
    if (combat) {
      console.debug(`MeleeCombat: ${combat.avgTime.toFixed(2)}ms avg, ${combat.maxTime.toFixed(2)}ms max`);
    }
    if (knockback) {
      console.debug(`Knockback: ${knockback.avgTime.toFixed(2)}ms avg, ${knockback.maxTime.toFixed(2)}ms max`);
    }
  });
});