import { test, expect } from 'bun:test';
import { Simulator } from '../src/core/simulator';
import { SceneLoader } from '../src/core/scene_loader';

test.skip('profile squirrel scenario bottlenecks', () => {
  const sim = new Simulator(32, 32);

  const loader = new SceneLoader(sim);
  
  console.debug('\n🔍 PROFILING SQUIRREL SCENARIO');
  console.debug('='.repeat(50));
  

  loader.loadScenario('squirrel');
  console.debug(`Loaded ${sim.units.length} units`);
  

  let totalStepTime = 0;
  for (let step = 0; step < 10; step++) {
    const stepStart = performance.now();
    sim.step();
    const stepEnd = performance.now();
    const stepTime = stepEnd - stepStart;
    totalStepTime += stepTime;
    
    if (step < 3) {
      console.debug(`Step ${step}: ${stepTime.toFixed(2)}ms (${sim.units.length} units)`);
    }
  }
  
  const avgStepTime = totalStepTime / 10;
  console.debug(`Average: ${avgStepTime.toFixed(2)}ms per step`);
  


  const report = null;
  if (report && report.length > 0) {
    console.debug('\n📊 RULE BREAKDOWN (last 10 steps):');
    console.debug('-'.repeat(40));
    

    const ruleStats: { [key: string]: { total: number, count: number, max: number } } = {};
    
    for (const entry of report) {
      if (!ruleStats[entry.name]) {
        ruleStats[entry.name] = { total: 0, count: 0, max: 0 };
      }
      ruleStats[entry.name].total += entry.duration;
      ruleStats[entry.name].count++;
      ruleStats[entry.name].max = Math.max(ruleStats[entry.name].max, entry.duration);
    }
    

    const sorted = Object.entries(ruleStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8);
    
    for (const [rule, stats] of sorted) {
      const avg = stats.total / stats.count;
      const pct = (stats.total / totalStepTime) * 100;
      console.debug(`${rule.padEnd(20)} ${avg.toFixed(2)}ms avg  ${stats.max.toFixed(2)}ms max  ${pct.toFixed(1)}%`);
    }
  }
  
  console.debug('='.repeat(50));
});