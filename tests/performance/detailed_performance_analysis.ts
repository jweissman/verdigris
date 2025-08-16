import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PerformanceProfiler } from '../../src/core/performance_profiler';

describe('Detailed Performance Analysis', () => {
  test('profile individual rule performance', () => {
    const sim = new Simulator(50, 50);
    const profiler = new PerformanceProfiler();
    
    // Add 50 units to match performance test setup
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        intendedMove: { x: 0.1, y: 0 },
        team: 'neutral',
        hp: 10
      });
    }
    
    // Enable environmental effects to match failing test
    sim.enableEnvironmentalEffects = true;
    
    // Add particles to match test setup  
    for (let i = 0; i < 10; i++) {
      sim.particles.push({
        id: `particle_${i}`,
        pos: { x: Math.random() * 50, y: Math.random() * 50 },
        vel: { x: 0, y: 0.1 },
        type: 'rain',
        lifetime: 100
      });
    }
    
    // Warm up
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    console.log('\n=== PROFILING INDIVIDUAL RULES ===');
    
    // Profile each rule individually
    const ruleNames = sim.rulebook.map(r => r.constructor.name);
    console.log(`Found ${ruleNames.length} rules:`, ruleNames);
    
    // Test each rule in isolation
    for (const ruleName of ruleNames) {
      const testSim = new Simulator(50, 50);
      testSim.enableEnvironmentalEffects = true;
      
      // Same setup as main test
      for (let i = 0; i < 50; i++) {
        testSim.addUnit({
          id: `unit_${i}`,
          pos: { x: i % 50, y: Math.floor(i / 50) },
          intendedMove: { x: 0.1, y: 0 },
          team: 'neutral',
          hp: 10
        });
      }
      
      // Only keep the rule we're testing
      testSim.rulebook = testSim.rulebook.filter(r => r.constructor.name === ruleName);
      
      // Warm up
      for (let i = 0; i < 10; i++) {
        testSim.step();
      }
      
      // Time this rule
      const times: number[] = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        testSim.step();
        times.push(performance.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      
      console.log(`${ruleName.padEnd(20)}: avg=${avg.toFixed(4)}ms, max=${max.toFixed(4)}ms, min=${min.toFixed(4)}ms`);
    }
    
    console.log('\n=== PROFILING STEP COMPONENTS ===');
    
    // Profile different components of the step function
    const testSim = new Simulator(50, 50);
    testSim.enableEnvironmentalEffects = true;
    
    for (let i = 0; i < 50; i++) {
      testSim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        intendedMove: { x: 0.1, y: 0 },
        team: 'neutral',
        hp: 10
      });
    }
    
    // Test proxy creation overhead
    const proxyStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      const units = testSim.units; // Force proxy creation
    }
    const proxyTime = performance.now() - proxyStart;
    console.log(`Proxy creation (1000x): ${proxyTime.toFixed(4)}ms total, ${(proxyTime/1000).toFixed(6)}ms per call`);
    
    // Test spatial rebuild overhead  
    const spatialStart = performance.now();
    for (let i = 0; i < 100; i++) {
      // Force spatial rebuild by changing unit positions
      for (let j = 0; j < 10; j++) {
        const unit = testSim.units[j];
        if (unit) {
          unit.pos.x = Math.random() * 50;
          unit.pos.y = Math.random() * 50;
        }
      }
      testSim.step();
    }
    const spatialTime = performance.now() - spatialStart;
    console.log(`Spatial rebuilds (100x): ${(spatialTime/100).toFixed(4)}ms per step`);
    
    console.log('\n=== ANALYZING ENVIRONMENTAL EFFECTS ===');
    
    // Test environmental effects overhead
    const envSim = new Simulator(50, 50);
    envSim.enableEnvironmentalEffects = false; // Disable first
    
    for (let i = 0; i < 50; i++) {
      envSim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 10
      });
    }
    
    // Time without environmental effects
    const noEnvTimes: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      envSim.step();
      noEnvTimes.push(performance.now() - start);
    }
    const noEnvAvg = noEnvTimes.reduce((a, b) => a + b, 0) / noEnvTimes.length;
    
    // Now enable environmental effects
    envSim.enableEnvironmentalEffects = true;
    
    const withEnvTimes: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      envSim.step();
      withEnvTimes.push(performance.now() - start);
    }
    const withEnvAvg = withEnvTimes.reduce((a, b) => a + b, 0) / withEnvTimes.length;
    
    console.log(`Without env effects: ${noEnvAvg.toFixed(4)}ms per step`);
    console.log(`With env effects: ${withEnvAvg.toFixed(4)}ms per step`);
    console.log(`Environmental overhead: ${(withEnvAvg - noEnvAvg).toFixed(4)}ms per step (${((withEnvAvg/noEnvAvg - 1) * 100).toFixed(1)}% increase)`);
    
    console.log('\n=== SCALAR FIELD ANALYSIS ===');
    
    // Test scalar field operations
    const fieldStart = performance.now();
    for (let i = 0; i < 100; i++) {
      const field = envSim.temperatureField;
      // Simulate the decayAndDiffuse operation if it exists
      if (field && typeof (field as any).decayAndDiffuse === 'function') {
        (field as any).decayAndDiffuse(0.002, 0.05);
      }
    }
    const fieldTime = performance.now() - fieldStart;
    console.log(`Scalar field operations (100x): ${(fieldTime/100).toFixed(4)}ms per operation`);
  });
  
  test('analyze memory allocation patterns', () => {
    const sim = new Simulator(50, 50);
    
    console.log('\n=== MEMORY ALLOCATION ANALYSIS ===');
    
    // Test object creation overhead
    const objectStart = performance.now();
    const tempObjects = [];
    for (let i = 0; i < 10000; i++) {
      tempObjects.push({
        id: `temp_${i}`,
        pos: { x: Math.random(), y: Math.random() },
        vel: { x: 0, y: 0 },
        data: { some: 'data', more: i }
      });
    }
    const objectTime = performance.now() - objectStart;
    console.log(`Object creation (10000x): ${objectTime.toFixed(4)}ms total, ${(objectTime/10000).toFixed(6)}ms per object`);
    
    // Test array operations
    const arrayStart = performance.now();
    const testArray = new Array(1000).fill(0);
    for (let i = 0; i < 1000; i++) {
      testArray.push(i);
      testArray.shift();
    }
    const arrayTime = performance.now() - arrayStart;
    console.log(`Array operations (1000x push/shift): ${arrayTime.toFixed(4)}ms total`);
    
    // Test Map operations  
    const mapStart = performance.now();
    const testMap = new Map();
    for (let i = 0; i < 1000; i++) {
      testMap.set(`key_${i}`, { value: i });
      testMap.get(`key_${i}`);
    }
    const mapTime = performance.now() - mapStart;
    console.log(`Map operations (1000x set/get): ${mapTime.toFixed(4)}ms total`);
  });
});