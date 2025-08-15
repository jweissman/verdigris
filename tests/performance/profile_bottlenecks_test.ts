import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Performance Bottleneck Analysis', () => {
  test('profile simulation step components', () => {
    const sim = new Simulator(50, 50);
    
    // Add 100 simple units (no abilities to isolate movement perf)
    for (let i = 0; i < 100; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: Math.floor(i / 10) * 5, y: (i % 10) * 5 },
        intendedMove: { x: 0.1, y: 0.1 },
        team: 'neutral',
        sprite: 'soldier',
        state: 'idle',
        hp: 10,
        maxHp: 10,
        mass: 1,
        abilities: [] // No abilities
      });
    }
    
    // Warm up
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Profile different configurations
    const configs = [
      { name: '100 units, no rules', setup: () => { sim.rulebook = []; } },
      { name: '100 units, minimal rules', setup: () => { 
        sim.rulebook = sim.rulebook.slice(0, 5); // Just first 5 rules
      }},
      { name: '100 units, all rules', setup: () => {
        // Reset to default rulebook (happens in constructor)
        const newSim = new Simulator(50, 50);
        sim.rulebook = newSim.rulebook;
      }}
    ];
    
    configs.forEach(config => {
      config.setup();
      
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        sim.step();
      }
      const end = performance.now();
      const timePerStep = (end - start) / 100;
      
      console.log(`${config.name}: ${timePerStep.toFixed(3)}ms per step`);
    });
    
    // Profile specific operations
    console.log('\n--- Component Timing ---');
    
    // Test raw array performance
    const testArray = new Float32Array(1000);
    const start = performance.now();
    for (let step = 0; step < 1000; step++) {
      for (let i = 0; i < 1000; i++) {
        testArray[i] += 0.1;
      }
    }
    const arrayTime = performance.now() - start;
    console.log(`Raw array ops (1000x1000): ${arrayTime.toFixed(3)}ms total, ${(arrayTime/1000).toFixed(3)}ms per iteration`);
    
    // Test proxy creation overhead
    const proxyStart = performance.now();
    for (let i = 0; i < 10000; i++) {
      const units = sim.units; // This creates proxies!
    }
    const proxyTime = performance.now() - proxyStart;
    console.log(`Proxy creation (10000x): ${proxyTime.toFixed(3)}ms total`);
    
    // Test rule execution without physics
    const newSim = new Simulator(50, 50);
    for (let i = 0; i < 100; i++) {
      newSim.addUnit({
        id: `test_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        sprite: 'soldier',
        state: 'idle',
        hp: 10,
        abilities: []
      });
    }
    
    // Remove physics-related rules
    newSim.rulebook = newSim.rulebook.filter(r => 
      !r.constructor.name.includes('Physics') && 
      !r.constructor.name.includes('Movement')
    );
    
    const ruleStart = performance.now();
    for (let i = 0; i < 100; i++) {
      newSim.step();
    }
    const ruleTime = performance.now() - ruleStart;
    console.log(`Rules only (100 steps): ${(ruleTime/100).toFixed(3)}ms per step`);
  });
});