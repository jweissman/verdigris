import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Performance Bottleneck Analysis', () => {
  test('profile simulation step components', () => {
    const sim = new Simulator(50, 50);
    

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
    

    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    

    const configs = [
      { name: '100 units, minimal rules', setup: () => { 
      }},
      { name: '100 units, all rules', setup: () => {

        const newSim = new Simulator(50, 50);
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
    

    console.log('\n--- Component Timing ---');
    

    const testArray = new Float32Array(1000);
    const start = performance.now();
    for (let step = 0; step < 1000; step++) {
      for (let i = 0; i < 1000; i++) {
        testArray[i] += 0.1;
      }
    }
    const arrayTime = performance.now() - start;
    console.log(`Raw array ops (1000x1000): ${arrayTime.toFixed(3)}ms total, ${(arrayTime/1000).toFixed(3)}ms per iteration`);
    

    const proxyStart = performance.now();
    for (let i = 0; i < 10000; i++) {
      const units = sim.units; // This creates proxies!
    }
    const proxyTime = performance.now() - proxyStart;
    console.log(`Proxy creation (10000x): ${proxyTime.toFixed(3)}ms total`);
    

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