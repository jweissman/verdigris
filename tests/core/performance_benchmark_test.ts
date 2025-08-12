import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Performance Benchmark', () => {
  it('should complete 50 steps in under 100ms (HARD TARGET: <2ms per step)', () => {
    const sim = new Simulator(32, 24);
    sim.enableProfiling = true; // Enable profiling to see what's slow!
    const loader = new SceneLoader(sim);
    
    // Load a complex scene with many units
    loader.loadScene('squirrel');
    
    const initialUnits = sim.units.length;
    console.log(`\n📊 PROFILING RUN - ${initialUnits} units in scene`);
    console.log('='.repeat(60));
    
    const startTime = performance.now();
    
    // Run 50 simulation steps
    let stepTimings: number[] = [];
    for (let i = 0; i < 50; i++) {
      const stepStart = performance.now();
      sim.step();
      const stepEnd = performance.now();
      stepTimings.push(stepEnd - stepStart);
      
      if (i === 0 || i === 49) {
        console.log(`Step ${i}: ${sim.units.length} units (${sim.units.filter(u => u.state === 'dead').length} dead)`);
      }
    }
    
    // Show slowest steps
    const sortedSteps = stepTimings.map((t, i) => ({step: i, time: t}))
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);
    console.log('\n🐌 Slowest steps:');
    for (const {step, time} of sortedSteps) {
      console.log(`  Step ${step}: ${time.toFixed(2)}ms`);
    }
    
    console.log(`Final: ${sim.units.length} units (started with ${initialUnits})`)
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const timePerStep = totalTime / 50;
    
    // Get profiling report if available
    const profilingReport = sim.getProfilingReport();
    if (profilingReport && profilingReport.length > 0) {
      console.log('\n📈 RULE TIMING BREAKDOWN:');
      console.log('-'.repeat(40));
      
      // Aggregate timings by rule
      const ruleTimings: { [key: string]: { total: number, count: number } } = {};
      for (const entry of profilingReport) {
        if (!ruleTimings[entry.name]) {
          ruleTimings[entry.name] = { total: 0, count: 0 };
        }
        ruleTimings[entry.name].total += entry.duration;
        ruleTimings[entry.name].count++;
      }
      
      // Sort by total time and display
      const sorted = Object.entries(ruleTimings)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10); // Top 10 slowest
      
      for (const [rule, timing] of sorted) {
        const avg = timing.total / timing.count;
        console.log(`  ${rule}: ${timing.total.toFixed(2)}ms total (${avg.toFixed(2)}ms avg)`);
      }
    }
    
    // Calculate deltas from target
    const targetPerStep = 2.0; // 2ms per step
    const targetTotal = 100; // 50 steps * 2ms
    const deltaPerStep = timePerStep - targetPerStep;
    const deltaPercent = ((timePerStep / targetPerStep) - 1) * 100;
    
    console.log('\n========== PERFORMANCE REPORT ==========');
    console.log(`Units in scene: ${sim.units.length}`);
    console.log(`Total time: ${totalTime.toFixed(2)}ms for 50 steps`);
    console.log(`Per step: ${timePerStep.toFixed(2)}ms`);
    console.log('----------------------------------------');
    console.log(`🎯 TARGET: ${targetPerStep}ms per step (${targetTotal}ms total)`);
    
    if (timePerStep <= targetPerStep) {
      console.log(`✅ PASSING! ${Math.abs(deltaPerStep).toFixed(2)}ms under target (${Math.abs(deltaPercent).toFixed(1)}% faster)`);
    } else {
      console.log(`❌ FAILING! ${deltaPerStep.toFixed(2)}ms over target (${deltaPercent.toFixed(1)}% slower)`);
      console.log(`   Need to optimize by ${deltaPerStep.toFixed(2)}ms per step`);
      console.log(`   or ${(totalTime - targetTotal).toFixed(2)}ms total`);
    }
    console.log('========================================\n');
    
    // HARD TARGET: 2ms per step (100ms for 50 steps)
    expect(timePerStep).toBeLessThan(targetPerStep);
  });

  it('should handle 100 units with <5ms per step', () => {
    const sim = new Simulator(32, 24);
    
    // Create 100 units spread across the field
    for (let i = 0; i < 100; i++) {
      const unit = {
        id: `unit_${i}`,
        pos: { 
          x: Math.floor(Math.random() * 32), 
          y: Math.floor(Math.random() * 24) 
        },
        intendedMove: { x: 0, y: 0 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        sprite: 'soldier',
        state: 'idle' as const,
        hp: 10,
        maxHp: 10,
        mass: 1,
        abilities: [],
        tags: [],
        meta: {}
      };
      sim.addUnit(unit);
    }
    
    const startTime = performance.now();
    
    // Run 20 simulation steps
    for (let i = 0; i < 20; i++) {
      sim.step();
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const timePerStep = totalTime / 20;
    const targetPerStep = 5.0; // Target: 5ms per step with 100 units
    const delta = timePerStep - targetPerStep;
    
    console.log('\n=== 100 UNIT STRESS TEST ===');
    console.log(`Time per step: ${timePerStep.toFixed(2)}ms`);
    console.log(`Target: ${targetPerStep}ms`);
    if (timePerStep <= targetPerStep) {
      console.log(`✅ PASSING! ${Math.abs(delta).toFixed(2)}ms under target`);
    } else {
      console.log(`❌ FAILING! ${delta.toFixed(2)}ms over target`);
    }
    console.log('============================\n');
    
    // With 100 units, target <5ms per step
    expect(timePerStep).toBeLessThan(targetPerStep);
  });

  it('should measure N^2 complexity in collision detection', () => {
    const measurements: { units: number; time: number; timePerStep: number }[] = [];
    
    for (const unitCount of [10, 20, 40, 80]) {
      const sim = new Simulator(32, 24);
      
      // Create units
      for (let i = 0; i < unitCount; i++) {
        const unit = {
          id: `unit_${i}`,
          pos: { 
            x: Math.floor(Math.random() * 32), 
            y: Math.floor(Math.random() * 24) 
          },
          intendedMove: { x: 0, y: 0 },
          team: 'friendly',
          sprite: 'soldier',
          state: 'idle' as const,
          hp: 10,
          maxHp: 10,
          mass: 1,
          abilities: [],
          tags: [],
          meta: {}
        };
        sim.addUnit(unit);
      }
      
      const startTime = performance.now();
      
      // Run 10 steps
      for (let i = 0; i < 10; i++) {
        sim.step();
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const timePerStep = totalTime / 10;
      
      measurements.push({ units: unitCount, time: totalTime, timePerStep });
    }
    
    // Log results
    console.log('\\nN^2 Complexity Analysis:');
    console.log('Units | Total Time | Time/Step | Scaling Factor');
    console.log('------|------------|-----------|---------------');
    
    for (let i = 0; i < measurements.length; i++) {
      const m = measurements[i];
      let scalingFactor = '';
      if (i > 0) {
        const prev = measurements[i - 1];
        const expectedScaling = Math.pow(m.units / prev.units, 2);
        const actualScaling = m.timePerStep / prev.timePerStep;
        scalingFactor = `${actualScaling.toFixed(2)}x (expected: ${expectedScaling.toFixed(1)}x)`;
      }
      console.log(
        `${m.units.toString().padEnd(5)} | ` +
        `${m.time.toFixed(2).padEnd(10)}ms | ` +
        `${m.timePerStep.toFixed(2).padEnd(9)}ms | ` +
        scalingFactor
      );
    }
    
    // Check that scaling is not worse than O(N^2)
    // When doubling units, time should increase by at most 4x
    if (measurements.length >= 2) {
      const ratio = measurements[1].timePerStep / measurements[0].timePerStep;
      expect(ratio).toBeLessThan(5); // Allow some overhead
    }
  });
});