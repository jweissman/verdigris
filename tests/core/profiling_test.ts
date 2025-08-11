import { describe, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Performance Profiling', () => {
  it('should profile complex scenario to identify bottlenecks', () => {
    const sim = new Simulator(32, 32);
    const loader = new SceneLoader(sim);
    
    // Enable profiling
    sim.startProfiling();
    
    // Load complex scenario
    loader.loadScenario('complex');
    
    // Run for 20 steps to get meaningful data
    for (let i = 0; i < 20; i++) {
      sim.step();
    }
    
    // Get profiling report
    const report = sim.getProfilingReport();
    
    // Print report
    console.log('\n=== Profiling Results ===');
    const totalTime = report.reduce((sum, r) => sum + r.totalTime, 0);
    console.log(`Total simulation time: ${totalTime.toFixed(2)}ms`);
    console.log(`Average per step: ${(totalTime / 20).toFixed(2)}ms\n`);
    
    // Find the top bottlenecks
    const topBottlenecks = report.slice(0, 5);
    console.log('Top 5 bottlenecks:');
    for (const rule of topBottlenecks) {
      const percentage = (rule.totalTime / totalTime * 100).toFixed(1);
      console.log(`  ${rule.ruleName}: ${rule.totalTime.toFixed(2)}ms (${percentage}%)`);
    }
    
    sim.stopProfiling();
  });
  
  it('should profile unit movement specifically', () => {
    const sim = new Simulator(20, 20);
    
    // Create many moving units
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
    
    // Run for 10 steps
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const report = sim.getProfilingReport();
    const movement = report.find(r => r.ruleName === 'UnitMovement');
    const combat = report.find(r => r.ruleName === 'MeleeCombat');
    const knockback = report.find(r => r.ruleName === 'Knockback');
    
    console.log('\n=== Movement & Combat Profiling ===');
    if (movement) {
      console.log(`UnitMovement: ${movement.avgTime.toFixed(2)}ms avg, ${movement.maxTime.toFixed(2)}ms max`);
    }
    if (combat) {
      console.log(`MeleeCombat: ${combat.avgTime.toFixed(2)}ms avg, ${combat.maxTime.toFixed(2)}ms max`);
    }
    if (knockback) {
      console.log(`Knockback: ${knockback.avgTime.toFixed(2)}ms avg, ${knockback.maxTime.toFixed(2)}ms max`);
    }
  });
});