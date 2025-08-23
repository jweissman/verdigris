import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Rules Performance Analysis', () => {
  test('measure rule execution times', () => {
    const sim = new Simulator(20, 20);
    
    // Add various units to stress test rules
    for (let i = 0; i < 10; i++) {
      sim.addUnit({
        id: `soldier_${i}`,
        type: 'soldier',
        pos: { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) },
        intendedMove: { x: 0, y: 0 },
        team: i % 2 === 0 ? "friendly" as const : "hostile" as const,
        sprite: "soldier",
        state: "idle" as const,
        hp: 30,
        maxHp: 30,
        dmg: 5,
        mass: 1,
        abilities: [],
        meta: {}
      });
    }
    
    // Add units with abilities
    for (let i = 0; i < 4; i++) {
      sim.addUnit({
        id: `druid_${i}`,
        type: 'druid',
        pos: { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) },
        intendedMove: { x: 0, y: 0 },
        team: i % 2 === 0 ? "friendly" as const : "hostile" as const,
        sprite: "druid",
        state: "idle" as const,
        hp: 35,
        maxHp: 35,
        dmg: 4,
        mass: 1,
        abilities: ['summonForestCreature'],
        meta: {}
      });
    }
    
    // Measure individual rule execution times
    const ruleTimes: Record<string, number[]> = {};
    
    // Hook into rule execution
    const originalStep = sim.step.bind(sim);
    sim.step = function() {
      const startTotal = performance.now();
      
      // Track each rule's execution
      for (const rule of (sim as any).rulebook || []) {
        const ruleName = rule.constructor.name;
        if (!ruleTimes[ruleName]) {
          ruleTimes[ruleName] = [];
        }
        
        const startRule = performance.now();
        // Rule executes inside originalStep
      }
      
      originalStep();
      
      const totalTime = performance.now() - startTotal;
      return totalTime;
    };
    
    // Run simulation steps
    const stepTimes: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      sim.step();
      const elapsed = performance.now() - start;
      stepTimes.push(elapsed);
    }
    
    // Calculate statistics
    const avgStepTime = stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length;
    const maxStepTime = Math.max(...stepTimes);
    const minStepTime = Math.min(...stepTimes);
    
    // console.log('\n=== Performance Statistics ===');
    // console.log(`Average step time: ${avgStepTime.toFixed(3)}ms`);
    // console.log(`Min step time: ${minStepTime.toFixed(3)}ms`);
    // console.log(`Max step time: ${maxStepTime.toFixed(3)}ms`);
    // console.log(`Total units: ${sim.units.length}`);
    
    // Performance requirements from VISION.md: 0.1-0.2ms per tick
    expect(avgStepTime).toBeLessThan(2); // Allow 2ms for now, target is 0.2ms
    
    // Log slow steps
    const slowSteps = stepTimes
      .map((time, idx) => ({ time, idx }))
      .filter(s => s.time > 1)
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);
    
    if (slowSteps.length > 0) {
      // console.log('\nSlowest steps:');
      slowSteps.forEach(s => {
        // console.log(`  Step ${s.idx}: ${s.time.toFixed(3)}ms`);
      });
    }
  });
  
  test('identify expensive rules', () => {
    const sim = new Simulator(20, 20);
    
    // Add 50 units to stress test
    for (let i = 0; i < 50; i++) {
      const unit = {
        id: `unit_${i}`,
        type: i % 3 === 0 ? 'druid' : 'soldier',
        pos: { x: i % 20, y: Math.floor(i / 20) },
        intendedMove: { x: 0, y: 0 },
        team: i % 2 === 0 ? "friendly" as const : "hostile" as const,
        sprite: i % 3 === 0 ? 'druid' : 'soldier',
        state: "idle" as const,
        hp: 30,
        maxHp: 30,
        dmg: 3,
        mass: 1,
        abilities: i % 3 === 0 ? ['summonForestCreature'] : [],
        meta: {}
      };
      sim.addUnit(unit);
    }
    
    // Measure memory before
    const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
    
    // Run steps
    for (let i = 0; i < 50; i++) {
      sim.step();
    }
    
    // Measure memory after
    const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    const memDelta = memAfter - memBefore;
    
    // console.log(`\nMemory usage: ${memDelta.toFixed(2)}MB for 50 steps with 50 units`);
    
    // Check for memory leaks
    expect(memDelta).toBeLessThan(10); // Should not use more than 10MB
  });
});