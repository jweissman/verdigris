import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Performance Requirements', () => {
  const TARGET_MS = 0.15; // Hard requirement: 0.15ms per step
  
  test('REQUIREMENT: Minimal sim (50 units, no rules) < 0.05ms', () => {
    const sim = new Simulator(50, 50);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        intendedMove: { x: 0.1, y: 0 },
        team: 'neutral',
        hp: 10
      });
    }
    

    

    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    

    const times: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      sim.step();
      times.push(performance.now() - start);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const median = times.sort((a, b) => a - b)[500];
    
    console.log(`Minimal sim: avg=${avg.toFixed(4)}ms, median=${median.toFixed(4)}ms`);
    expect(avg).toBeLessThan(0.05);
  });
  
  test('REQUIREMENT: With environmental effects (50 units) < 0.10ms', () => {
    const sim = new Simulator(50, 50);
    sim.enableEnvironmentalEffects = true; // Enable weather, particles, etc
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 10
      });
    }
    

    

    for (let i = 0; i < 10; i++) {
      sim.particles.push({
        id: `particle_${i}`,
        pos: { x: Math.random() * 50, y: Math.random() * 50 },
        vel: { x: 0, y: 0.1 },
        type: 'rain',
        lifetime: 100
      });
    }
    

    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const times: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      sim.step();
      times.push(performance.now() - start);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const median = times.sort((a, b) => a - b)[500];
    
    console.log(`With environment: avg=${avg.toFixed(4)}ms, median=${median.toFixed(4)}ms`);
    expect(avg).toBeLessThan(0.10);
  });
  
  test('REQUIREMENT: With movement rule (50 units) < 0.15ms', () => {
    const sim = new Simulator(50, 50);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        intendedMove: { x: 0.1, y: 0.1 },
        team: 'neutral',
        hp: 10
      });
    }
    
    sim.rulebook = sim.rulebook.filter(r => 
      r.constructor.name === 'UnitMovement'
    );
    

    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const times: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      sim.step();
      times.push(performance.now() - start);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const median = times.sort((a, b) => a - b)[500];
    
    console.log(`With movement: avg=${avg.toFixed(4)}ms, median=${median.toFixed(4)}ms`);
    expect(avg).toBeLessThan(TARGET_MS);
  });
  
  test('REQUIREMENT: With combat rules (50 units) < 0.20ms', () => {
    const sim = new Simulator(50, 50);
    

    for (let i = 0; i < 25; i++) {
      sim.addUnit({
        id: `friendly_${i}`,
        pos: { x: i % 10, y: Math.floor(i / 10) },
        team: 'friendly',
        hp: 20
      });
      sim.addUnit({
        id: `hostile_${i}`,
        pos: { x: 40 + (i % 10), y: Math.floor(i / 10) },
        team: 'hostile',
        hp: 20
      });
    }
    
    sim.rulebook = sim.rulebook.filter(r => 
      ['UnitMovement', 'MeleeCombat', 'UnitBehavior'].includes(r.constructor.name)
    );
    

    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const times: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      sim.step();
      times.push(performance.now() - start);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const median = times.sort((a, b) => a - b)[500];
    
    console.log(`With combat: avg=${avg.toFixed(4)}ms, median=${median.toFixed(4)}ms`);
    expect(avg).toBeLessThan(0.20);
  });
  
  test('REQUIREMENT: Full simulation (50 units, all rules) < 0.30ms', () => {
    const sim = new Simulator(50, 50);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: Math.random() * 50, y: Math.random() * 50 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 3 === 0 ? 'friendly' : i % 3 === 1 ? 'hostile' : 'neutral',
        hp: 10 + Math.random() * 20
      });
    }
    

    

    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const times: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      sim.step();
      times.push(performance.now() - start);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const median = times.sort((a, b) => a - b)[500];
    const p95 = times.sort((a, b) => a - b)[950];
    
    console.log(`Full sim: avg=${avg.toFixed(4)}ms, median=${median.toFixed(4)}ms, p95=${p95.toFixed(4)}ms`);
    expect(avg).toBeLessThan(0.30);
  });
  
  test('REQUIREMENT: Scales linearly with unit count', () => {
    const measurements: { count: number, time: number }[] = [];
    
    for (const count of [10, 20, 40, 80, 160]) {
      const sim = new Simulator(100, 100);
      
      for (let i = 0; i < count; i++) {
        sim.addUnit({
          id: `unit_${i}`,
          pos: { x: Math.random() * 100, y: Math.random() * 100 },
          team: 'neutral',
          hp: 10
        });
      }
      
      sim.rulebook = sim.rulebook.filter(r => 
        r.constructor.name === 'UnitMovement'
      );
      

      for (let i = 0; i < 100; i++) {
        sim.step();
      }
      
      const times: number[] = [];
      for (let i = 0; i < 500; i++) {
        const start = performance.now();
        sim.step();
        times.push(performance.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      measurements.push({ count, time: avg });
    }
    
    console.log('\n=== Scaling Analysis ===');
    for (let i = 0; i < measurements.length; i++) {
      const m = measurements[i];
      if (i > 0) {
        const prev = measurements[i-1];
        const unitRatio = m.count / prev.count;
        const timeRatio = m.time / prev.time;
        const efficiency = unitRatio / timeRatio;
        console.log(`${m.count} units: ${m.time.toFixed(4)}ms (${timeRatio.toFixed(2)}x time for ${unitRatio}x units, efficiency=${efficiency.toFixed(2)})`);
      } else {
        console.log(`${m.count} units: ${m.time.toFixed(4)}ms (baseline)`);
      }
    }
    

    for (let i = 1; i < measurements.length; i++) {
      const prev = measurements[i-1];
      const curr = measurements[i];
      const unitRatio = curr.count / prev.count;
      const timeRatio = curr.time / prev.time;
      
      expect(timeRatio).toBeLessThan(unitRatio * 1.5); // Allow 50% overhead
    }
  });
});