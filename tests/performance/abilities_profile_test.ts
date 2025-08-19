import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { Abilities } from '../../src/rules/abilities';

describe('Abilities Performance Profile', () => {
  it('should identify performance bottlenecks', () => {
    console.log('\n=== Testing with real compiled functions ===');
    const sim = new Simulator(100, 100);
    
    // Add units with different abilities
    for (let i = 0; i < 20; i++) {
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: Math.random() * 100, y: Math.random() * 100 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 30,
        maxHp: 30,
        sprite: 'soldier',
        abilities: i < 10 ? ['attack'] : [],
        state: 'idle',
        intendedMove: { x: 0, y: 0 }
      } as any);
    }
    
    const abilities = new Abilities();
    const context = sim.getTickContext();
    
    // Measure different phases
    const measurements: Record<string, number[]> = {
      total: [],
      unitLoop: [],
      abilityCheck: [],
      precompiled: []
    };
    
    // Warm up
    for (let i = 0; i < 10; i++) {
      abilities.execute(context);
    }
    
    // Measure
    for (let i = 0; i < 100; i++) {
      const totalStart = performance.now();
      
      // Manually execute to measure phases
      (abilities as any).commands = [];
      const allUnits = context.getAllUnits();
      (abilities as any).cachedAllUnits = allUnits;
      
      const loopStart = performance.now();
      const relevantUnits = allUnits.filter(u => 
        u.state !== "dead" && 
        u.hp > 0 && 
        (u.abilities?.length > 0 || u.meta?.burrowed)
      );
      measurements.unitLoop.push(performance.now() - loopStart);
      
      for (const unit of relevantUnits) {
        if (unit.abilities) {
          for (const abilityName of unit.abilities) {
            const checkStart = performance.now();
            const ability = (Abilities as any).precompiledAbilities?.get(abilityName);
            if (ability) {
              // Check trigger
              if (ability.trigger) {
                const triggerResult = ability.trigger(unit, context);
                if (!triggerResult) continue;
              }
              
              // Get target
              if (ability.target) {
                const target = ability.target(unit, context);
                if (!target) continue;
              }
            }
            measurements.abilityCheck.push(performance.now() - checkStart);
          }
        }
      }
      
      measurements.total.push(performance.now() - totalStart);
    }
    
    // Calculate stats
    const getStats = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return {
        median: sorted[Math.floor(sorted.length / 2)],
        avg: arr.reduce((a, b) => a + b, 0) / arr.length,
        min: sorted[0],
        max: sorted[sorted.length - 1]
      };
    };
    
    const totalStats = getStats(measurements.total);
    const loopStats = getStats(measurements.unitLoop);
    const checkStats = getStats(measurements.abilityCheck);
    
    console.log('\n=== Performance Breakdown ===');
    console.log(`Total execution: ${totalStats.median.toFixed(4)}ms median`);
    console.log(`Unit filtering: ${loopStats.median.toFixed(4)}ms median`);
    console.log(`Ability checks: ${checkStats.median.toFixed(4)}ms median`);
    console.log(`Ability checks per execute: ${measurements.abilityCheck.length / 100}`);
    
    // The target is 0.01ms
    expect(totalStats.median).toBeLessThan(0.02); // Allow 2x for now
  });
});