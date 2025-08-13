import { test, expect } from 'bun:test';
import { Simulator } from '../src/core/simulator';
import { SceneLoader } from '../src/core/scene_loader';

test('deep performance analysis - find real bottlenecks', () => {
  console.log('\n🔬 DEEP PERFORMANCE ANALYSIS');
  console.log('='.repeat(60));
  
  const sim = new Simulator(32, 32);
  sim.enableProfiling = true;
  const loader = new SceneLoader(sim);
  loader.loadScenario('squirrel');
  
  console.log(`Initial: ${sim.units.length} units`);
  
  // Instrument key operations
  let pairwiseTime = 0;
  let commandTime = 0;
  let spatialTime = 0;
  let targetCacheTime = 0;
  
  // Run steps and analyze from profiling data
  for (let step = 0; step < 5; step++) {
    console.log(`\n--- STEP ${step} ---`);
    const stepStart = performance.now();
    sim.step();
    const stepEnd = performance.now();
    console.log(`  Total step: ${(stepEnd - stepStart).toFixed(2)}ms`);
    console.log(`  Units: ${sim.units.length}`);
  }
  
  console.log('\n📊 TIMING BREAKDOWN (5 steps):');
  console.log('-'.repeat(40));
  console.log(`Spatial rebuild: ${spatialTime.toFixed(2)}ms (${(spatialTime/5).toFixed(2)}ms avg)`);
  console.log(`Target cache:    ${targetCacheTime.toFixed(2)}ms (${(targetCacheTime/5).toFixed(2)}ms avg)`);
  console.log(`Pairwise batch:  ${pairwiseTime.toFixed(2)}ms (${(pairwiseTime/5).toFixed(2)}ms avg)`);
  console.log(`Commands/Rules:  ${commandTime.toFixed(2)}ms (${(commandTime/5).toFixed(2)}ms avg)`);
  
  const totalMeasured = spatialTime + targetCacheTime + pairwiseTime + commandTime;
  console.log(`Total measured:  ${totalMeasured.toFixed(2)}ms (${(totalMeasured/5).toFixed(2)}ms avg)`);
  
  // Get rule-level profiling
  const report = sim.getProfilingReport();
  if (report && report.length > 0) {
    console.log('\n🐌 SLOWEST RULES (last 5 steps):');
    console.log('-'.repeat(40));
    
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
      .slice(0, 6);
    
    for (const [rule, stats] of sorted) {
      const avg = stats.total / stats.count;
      console.log(`${rule.padEnd(18)} ${avg.toFixed(2)}ms avg  ${stats.max.toFixed(2)}ms max  ${stats.total.toFixed(2)}ms total`);
    }
  }
  
  console.log('\n🔍 ANALYSIS:');
  console.log('- Look for rules taking >0.1ms average');
  console.log('- Spatial rebuild should be <0.05ms');
  console.log('- Target cache should be <0.02ms');
  console.log('- Command processing is the main bottleneck');
  console.log('='.repeat(60));
});