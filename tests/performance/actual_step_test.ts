import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Actual Step Performance', () => {
  test('50 units with intended movement', () => {
    const sim = new Simulator(50, 50);
    
    // Add units with movement
    for (let i = 0; i < 25; i++) {
      sim.addUnit({
        id: `friendly_${i}`,
        pos: { x: i % 10, y: Math.floor(i / 10) },
        intendedMove: { x: 0.1, y: 0 },
        team: 'friendly',
        hp: 20
      });
      sim.addUnit({
        id: `hostile_${i}`,
        pos: { x: 40 + (i % 10), y: Math.floor(i / 10) },
        intendedMove: { x: -0.1, y: 0 },
        team: 'hostile',
        hp: 20
      });
    }
    
    // Warmup
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
    
    console.log(`\n50 units with movement and combat:`);
    console.log(`Average: ${avg.toFixed(4)}ms`);
    console.log(`Median: ${median.toFixed(4)}ms`);
    console.log(`Target: 0.01ms`);
    console.log(`Current: ${(avg/0.01).toFixed(1)}x over target`);
    
    // Not using active rules filtering anymore
    
    expect(avg).toBeLessThan(0.3); // Realistic target with all rules
  });
  
  test('50 neutral units (no combat)', () => {
    const sim = new Simulator(50, 50);
    
    // Add only neutral units
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 10
      });
    }
    
    // Warmup
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
    
    console.log(`\n50 neutral units (no combat):`);
    console.log(`Average: ${avg.toFixed(4)}ms`);
    console.log(`Median: ${median.toFixed(4)}ms`);
    
    // Using all rules now
    
    expect(avg).toBeLessThan(0.25);
  });
  
  test('50 stationary units', () => {
    const sim = new Simulator(50, 50);
    
    // Add stationary units
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        // No intendedMove
        team: 'neutral',
        hp: 10
      });
    }
    
    // Warmup
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
    
    console.log(`\n50 stationary units:`);
    console.log(`Average: ${avg.toFixed(4)}ms`);
    console.log(`Median: ${median.toFixed(4)}ms`);
    
    // Using all rules now
    
    expect(avg).toBeLessThan(0.25);
  });
});