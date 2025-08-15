import { describe, it, expect } from 'bun:test';
import { SceneLoader } from '../../src/core/scene_loader';
import { Simulator } from '../../src/core/simulator';

describe('Performance Tests', () => {
  const scenarios = ['simple', 'complex', 'healing', 'projectile', 'squirrel'];
  const SIMULATION_STEPS = 1500;
  const EXECUTION_TIME_PER_STEP = 0.15; // ms per step
  const MAX_EXECUTION_TIME = SIMULATION_STEPS * EXECUTION_TIME_PER_STEP + 10; // xms per step + 10ms buffer

  scenarios.forEach(scenario => {
    describe.skip(scenario, () => {
      it(`${scenario} run ${SIMULATION_STEPS} ticks by ${MAX_EXECUTION_TIME}ms`, () => {
        const sim = new Simulator(32, 32);
        // Performance should be good by default now
      
        // // Detailed profiling for squirrel scenario
        // if (scenario === 'squirrel') {
        //   sim.enableProfiling = true;
        // }
      
        const loader = new SceneLoader(sim);
      
        const startTime = performance.now();
      
        // Load the scenario
        loader.loadScenario(scenario);
      
        // Run simulation for specified steps
        for (let step = 0; step < SIMULATION_STEPS; step++) {
          sim.step();
        
          // Check for runaway unit creation
          const currentUnits = sim.getRealUnits().length;
          expect(currentUnits).toBeLessThan(100); // Sanity check - no unit explosion
        }
      
        const endTime = performance.now();
        const executionTime = endTime - startTime;
      
      
        // Performance assertion
        expect(executionTime).toBeLessThan(MAX_EXECUTION_TIME);
      
        // Correctness assertions
        const outOfBoundsX = sim.units.filter(u => u.pos.x < 0 || u.pos.x >= sim.fieldWidth);
        const outOfBoundsY = sim.units.filter(u => u.pos.y < 0 || u.pos.y >= sim.fieldHeight);
      
        if (outOfBoundsX.length > 0) {
          console.debug(`Units out of bounds X (field width=${sim.fieldWidth}):`,
            outOfBoundsX.map(u => ({ id: u.id, x: u.pos.x, y: u.pos.y })));
        }
        if (outOfBoundsY.length > 0) {
          console.debug(`Units out of bounds Y (field height=${sim.fieldHeight}):`,
            outOfBoundsY.map(u => ({ id: u.id, x: u.pos.x, y: u.pos.y })));
        }
      
        expect(sim.units.every(u => u.pos.x >= 0 && u.pos.x < sim.fieldWidth)).toBe(true);
        expect(sim.units.every(u => u.pos.y >= 0 && u.pos.y < sim.fieldHeight)).toBe(true);
      });
    });
  });

  it('should handle stress test with multiple megasquirrels', () => {
    const sim = new Simulator(20, 20);
    
    // Create a scenario with multiple megasquirrels and worms
    for (let i = 0; i < 3; i++) {
      sim.addUnit({
        id: `mega${i}`,
        pos: { x: 5 + i * 5, y: 5 },
        intendedMove: { x: 0, y: 0 },
        team: 'friendly',
        sprite: 'megasquirrel',
        state: 'idle',
        hp: 40,
        maxHp: 40,
        mass: 8,
        abilities: ['jumps'],
        meta: { huge: true }
      });
    }
    
    // Add some worms as targets
    for (let i = 0; i < 10; i++) {
      sim.addUnit({
        id: `worm${i}`,
        pos: { x: 10 + (i % 5) * 2, y: 10 + Math.floor(i / 5) * 2 },
        intendedMove: { x: 0, y: 0 },
        team: 'hostile',
        sprite: 'worm',
        state: 'idle',
        hp: 10,
        maxHp: 10,
        mass: 1,
        abilities: [],
        meta: {}
      });
    }
    
    const startTime = performance.now();
    const initialUnits = sim.getRealUnits().length;
    
    // Run for 30 steps to allow jumping/landing
    for (let step = 0; step < 30; step++) {
      sim.step();
    }
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    
    // Should complete in reasonable time even with multiple megasquirrels
    expect(executionTime).toBeLessThan(2000); // 1.5 seconds max
  });

  it('should measure actual step time without overhead', () => {
    const sim = new Simulator(32, 32);
    
    // Create a realistic scenario
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: Math.random() * 32, y: Math.random() * 32 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        maxHp: 20,
        mass: 1
      });
    }
    
    // Warm up
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Measure 100 steps
    const times: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      sim.step();
      const elapsed = performance.now() - start;
      times.push(elapsed);
    }
    
    // Calculate statistics
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    const median = times.sort((a, b) => a - b)[50];
    
    console.debug('\n=== Raw Performance Stats (50 units, 100 steps) ===');
    console.debug(`Average: ${avgTime.toFixed(3)}ms`);
    console.debug(`Median: ${median.toFixed(3)}ms`);
    console.debug(`Min: ${minTime.toFixed(3)}ms`);
    console.debug(`Max: ${maxTime.toFixed(3)}ms`);
    console.debug(`FPS at avg: ${(1000 / avgTime).toFixed(0)} fps (sim only)`);
    
    // Test with more units
    for (let i = 50; i < 200; i++) {
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: Math.random() * 32, y: Math.random() * 32 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        maxHp: 20,
        mass: 1
      });
    }
    
    const times200: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      sim.step();
      const elapsed = performance.now() - start;
      times200.push(elapsed);
    }
    
    const avgTime200 = times200.reduce((a, b) => a + b, 0) / times200.length;
    const median200 = times200.sort((a, b) => a - b)[50];
    
    console.debug('\n=== With 200 units ===');
    console.debug(`Average: ${avgTime200.toFixed(3)}ms`);
    console.debug(`Median: ${median200.toFixed(3)}ms`);
    console.debug(`FPS at avg: ${(1000 / avgTime200).toFixed(0)} fps (sim only)`);
    
    // Identify the scaling factor
    const scalingFactor = avgTime200 / avgTime;
    console.debug(`\nScaling: ${scalingFactor.toFixed(2)}x slower with 4x units`);
    if (scalingFactor > 10) {
      console.debug('❌ O(n²) scaling detected!');
    } else if (scalingFactor > 4) {
      console.debug('⚠️ Worse than linear scaling');
    } else {
      console.debug('✅ Near-linear scaling');
    }
  });

  // it('should complete 50 steps in under 100ms (HARD TARGET: <2ms per step)', () => {
  //   const sim = new Simulator(32, 24);
  //   sim.enableProfiling = false; // Disable for clean performance measurement
  //   const loader = new SceneLoader(sim);
    
  //   // Load a complex scene with many units
  //   loader.loadScene('squirrel');
    
  //   const initialUnits = sim.units.length;
  //   console.debug(`\n📊 PROFILING RUN - ${initialUnits} units in scene`);
  //   console.debug('='.repeat(60));
    
  //   const startTime = performance.now();
    
  //   // Run 50 simulation steps
  //   let stepTimings: number[] = [];
  //   for (let i = 0; i < 50; i++) {
  //     const stepStart = performance.now();
  //     sim.step();
  //     const stepEnd = performance.now();
  //     stepTimings.push(stepEnd - stepStart);
      
  //     if (i === 0 || i === 49) {
  //       console.debug(`Step ${i}: ${sim.units.length} units (${sim.units.filter(u => u.state === 'dead').length} dead)`);
  //     }
  //   }
    
  //   // Show slowest steps
  //   const sortedSteps = stepTimings.map((t, i) => ({step: i, time: t}))
  //     .sort((a, b) => b.time - a.time)
  //     .slice(0, 5);
  //   console.debug('\n🐌 Slowest steps:');
  //   for (const {step, time} of sortedSteps) {
  //     console.debug(`  Step ${step}: ${time.toFixed(2)}ms`);
  //   }
    
  //   console.debug(`Final: ${sim.units.length} units (started with ${initialUnits})`)
    
  //   const endTime = performance.now();
  //   const totalTime = endTime - startTime;
  //   const timePerStep = totalTime / 50;
    
  //   // Get profiling report if available
  //   const profilingReport = sim.getProfilingReport();
  //   if (profilingReport && profilingReport.length > 0) {
  //     console.debug('\n📈 RULE TIMING BREAKDOWN:');
  //     console.debug('-'.repeat(40));
      
  //     // Aggregate timings by rule
  //     const ruleTimings: { [key: string]: { total: number, count: number } } = {};
  //     for (const entry of profilingReport) {
  //       if (!ruleTimings[entry.name]) {
  //         ruleTimings[entry.name] = { total: 0, count: 0 };
  //       }
  //       ruleTimings[entry.name].total += entry.duration;
  //       ruleTimings[entry.name].count++;
  //     }
      
  //     // Sort by total time and display
  //     const sorted = Object.entries(ruleTimings)
  //       .sort((a, b) => b[1].total - a[1].total)
  //       .slice(0, 10); // Top 10 slowest
      
  //     for (const [rule, timing] of sorted) {
  //       const avg = timing.total / timing.count;
  //       console.debug(`  ${rule}: ${timing.total.toFixed(2)}ms total (${avg.toFixed(2)}ms avg)`);
  //     }
  //   }
    
  //   // Calculate deltas from target
  //   const targetPerStep = 2.0; // 2ms per step
  //   const targetTotal = 100; // 50 steps * 2ms
  //   const deltaPerStep = timePerStep - targetPerStep;
  //   const deltaPercent = ((timePerStep / targetPerStep) - 1) * 100;
    
  //   console.debug('\n========== PERFORMANCE REPORT ==========');
  //   console.debug(`Units in scene: ${sim.units.length}`);
  //   console.debug(`Total time: ${totalTime.toFixed(2)}ms for 50 steps`);
  //   console.debug(`Per step: ${timePerStep.toFixed(2)}ms`);
  //   console.debug('----------------------------------------');
  //   console.debug(`🎯 TARGET: ${targetPerStep}ms per step (${targetTotal}ms total)`);
    
  //   if (timePerStep <= targetPerStep) {
  //     console.debug(`✅ PASSING! ${Math.abs(deltaPerStep).toFixed(2)}ms under target (${Math.abs(deltaPercent).toFixed(1)}% faster)`);
  //   } else {
  //     console.debug(`❌ FAILING! ${deltaPerStep.toFixed(2)}ms over target (${deltaPercent.toFixed(1)}% slower)`);
  //     console.debug(`   Need to optimize by ${deltaPerStep.toFixed(2)}ms per step`);
  //     console.debug(`   or ${(totalTime - targetTotal).toFixed(2)}ms total`);
  //   }
  //   console.debug('========================================\n');
    
  //   // HARD TARGET: 2ms per step (100ms for 50 steps)
  //   expect(timePerStep).toBeLessThan(targetPerStep);
  // });

  // it('should handle 100 units with <5ms per step', () => {
  //   const sim = new Simulator(32, 24);
    
  //   // Create 100 units spread across the field
  //   for (let i = 0; i < 100; i++) {
  //     const unit = {
  //       id: `unit_${i}`,
  //       pos: { 
  //         x: Math.floor(Math.random() * 32), 
  //         y: Math.floor(Math.random() * 24) 
  //       },
  //       intendedMove: { x: 0, y: 0 },
  //       team: i % 2 === 0 ? 'friendly' : 'hostile',
  //       sprite: 'soldier',
  //       state: 'idle' as const,
  //       hp: 10,
  //       maxHp: 10,
  //       mass: 1,
  //       abilities: [],
  //       tags: [],
  //       meta: {}
  //     };
  //     sim.addUnit(unit);
  //   }
    
  //   const startTime = performance.now();
    
  //   // Run 20 simulation steps
  //   for (let i = 0; i < 20; i++) {
  //     sim.step();
  //   }
    
  //   const endTime = performance.now();
  //   const totalTime = endTime - startTime;
  //   const timePerStep = totalTime / 20;
  //   const targetPerStep = 5.0; // Target: 5ms per step with 100 units
  //   const delta = timePerStep - targetPerStep;
    
  //   console.debug('\n=== 100 UNIT STRESS TEST ===');
  //   console.debug(`Time per step: ${timePerStep.toFixed(2)}ms`);
  //   console.debug(`Target: ${targetPerStep}ms`);
  //   if (timePerStep <= targetPerStep) {
  //     console.debug(`✅ PASSING! ${Math.abs(delta).toFixed(2)}ms under target`);
  //   } else {
  //     console.debug(`❌ FAILING! ${delta.toFixed(2)}ms over target`);
  //   }
  //   console.debug('============================\n');
    
  //   // With 100 units, target <5ms per step
  //   expect(timePerStep).toBeLessThan(targetPerStep);
  // });

  // it('should measure N^2 complexity in collision detection', () => {
  //   const measurements: { units: number; time: number; timePerStep: number }[] = [];
    
  //   for (const unitCount of [10, 20, 40, 80]) {
  //     const sim = new Simulator(32, 24);
      
  //     // Create units
  //     for (let i = 0; i < unitCount; i++) {
  //       const unit = {
  //         id: `unit_${i}`,
  //         pos: { 
  //           x: Math.floor(Math.random() * 32), 
  //           y: Math.floor(Math.random() * 24) 
  //         },
  //         intendedMove: { x: 0, y: 0 },
  //         team: 'friendly',
  //         sprite: 'soldier',
  //         state: 'idle' as const,
  //         hp: 10,
  //         maxHp: 10,
  //         mass: 1,
  //         abilities: [],
  //         tags: [],
  //         meta: {}
  //       };
  //       sim.addUnit(unit);
  //     }
      
  //     const startTime = performance.now();
      
  //     // Run 10 steps
  //     for (let i = 0; i < 10; i++) {
  //       sim.step();
  //     }
      
  //     const endTime = performance.now();
  //     const totalTime = endTime - startTime;
  //     const timePerStep = totalTime / 10;
      
  //     measurements.push({ units: unitCount, time: totalTime, timePerStep });
  //   }
    
  //   // Log results
  //   console.debug('\\nN^2 Complexity Analysis:');
  //   console.debug('Units | Total Time | Time/Step | Scaling Factor');
  //   console.debug('------|------------|-----------|---------------');
    
  //   for (let i = 0; i < measurements.length; i++) {
  //     const m = measurements[i];
  //     let scalingFactor = '';
  //     if (i > 0) {
  //       const prev = measurements[i - 1];
  //       const expectedScaling = Math.pow(m.units / prev.units, 2);
  //       const actualScaling = m.timePerStep / prev.timePerStep;
  //       scalingFactor = `${actualScaling.toFixed(2)}x (expected: ${expectedScaling.toFixed(1)}x)`;
  //     }
  //     console.debug(
  //       `${m.units.toString().padEnd(5)} | ` +
  //       `${m.time.toFixed(2).padEnd(10)}ms | ` +
  //       `${m.timePerStep.toFixed(2).padEnd(9)}ms | ` +
  //       scalingFactor
  //     );
  //   }
    
  //   // Check that scaling is not worse than O(N^2)
  //   // When doubling units, time should increase by at most 4x
  //   if (measurements.length >= 2) {
  //     const ratio = measurements[1].timePerStep / measurements[0].timePerStep;
  //     expect(ratio).toBeLessThan(5); // Allow some overhead
  //   }
    
  // });
});