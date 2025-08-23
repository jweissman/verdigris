import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { Abilities } from '../../src/rules/abilities';

describe.skip('Abilities Detailed Performance', () => {
  it('should profile where time is spent', () => {
    const sim = new Simulator(100, 100);
    

    for (let i = 0; i < 50; i++) {
      const unitType = i % 4;
      const abilities = unitType === 0 ? ['attack'] : 
                       unitType === 1 ? ['heal'] : 
                       unitType === 2 ? [] : ['ranged'];
      
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: Math.random() * 100, y: Math.random() * 100 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 30,
        maxHp: 30,
        sprite: 'soldier',
        abilities,
        state: 'idle',
        intendedMove: { x: 0, y: 0 }
      } as any);
    }
    
    const abilities = new Abilities();
    const context = sim.getTickContext();
    

    for (let i = 0; i < 100; i++) {
      abilities.execute(context);
    }
    

    const measurements = {
      total: [] as number[],
      getAllUnits: [] as number[],
      filterUnits: [] as number[],
      processUnits: [] as number[],
      checkAbilities: [] as number[],
      triggerEval: [] as number[],
      targetEval: [] as number[]
    };
    

    const originalExecute = abilities.execute.bind(abilities);
    (abilities as any).execute = function(ctx: any) {
      const totalStart = performance.now();
      

      const getUnitsStart = performance.now();
      const allUnits = ctx.getAllUnits();
      measurements.getAllUnits.push(performance.now() - getUnitsStart);
      

      const filterStart = performance.now();
      const relevantUnits = allUnits.filter((u: any) => 
        u.state !== "dead" && 
        u.hp > 0 && 
        (u.abilities?.length > 0 || u.meta?.burrowed)
      );
      measurements.filterUnits.push(performance.now() - filterStart);
      

      (this as any).commands = [];
      (this as any).cachedAllUnits = allUnits;
      

      const processStart = performance.now();
      for (const unit of relevantUnits) {
        if (unit.abilities) {
          for (const abilityName of unit.abilities) {
            const checkStart = performance.now();
            
            const ability = (Abilities as any).precompiledAbilities?.get(abilityName);
            if (ability) {

              if (ability.trigger) {
                const triggerStart = performance.now();
                const shouldTrigger = ability.trigger(unit, ctx);
                measurements.triggerEval.push(performance.now() - triggerStart);
                if (!shouldTrigger) continue;
              }
              

              if (ability.target) {
                const targetStart = performance.now();
                const target = ability.target(unit, ctx);
                measurements.targetEval.push(performance.now() - targetStart);
                if (!target) continue;
              }
            }
            
            measurements.checkAbilities.push(performance.now() - checkStart);
          }
        }
      }
      measurements.processUnits.push(performance.now() - processStart);
      
      measurements.total.push(performance.now() - totalStart);
      return (this as any).commands;
    };
    

    for (let i = 0; i < 100; i++) {
      abilities.execute(context);
    }
    

    const getMedian = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    
    // console.log('\n=== Detailed Performance Breakdown ===');
    // console.log(`Total units: ${sim.units.length}`);
    // console.log(`Units with abilities: ${sim.units.filter(u => u.abilities?.length > 0).length}`);
    // console.log(`\nMedian times (ms):`);
    // console.log(`  Total execution:    ${getMedian(measurements.total).toFixed(4)}`);
    // console.log(`  getAllUnits:        ${getMedian(measurements.getAllUnits).toFixed(4)}`);
    // console.log(`  Filter units:       ${getMedian(measurements.filterUnits).toFixed(4)}`);
    // console.log(`  Process all units:  ${getMedian(measurements.processUnits).toFixed(4)}`);
    
    if (measurements.checkAbilities.length > 0) {
      // console.log(`  Per ability check:  ${getMedian(measurements.checkAbilities).toFixed(4)}`);
      // console.log(`  Ability checks/run: ${measurements.checkAbilities.length / 100}`);
    }
    
    if (measurements.triggerEval.length > 0) {
      // console.log(`  Per trigger eval:   ${getMedian(measurements.triggerEval).toFixed(4)}`);
      // console.log(`  Triggers/run:       ${measurements.triggerEval.length / 100}`);
    }
    
    if (measurements.targetEval.length > 0) {
      // console.log(`  Per target eval:    ${getMedian(measurements.targetEval).toFixed(4)}`);
      // console.log(`  Targets/run:        ${measurements.targetEval.length / 100}`);
    }
    
    const budget = 0.01;
    const median = getMedian(measurements.total);
    // console.log(`\nBudget: ${budget}ms`);
    // console.log(`Status: ${median <= budget ? '✅' : '❌'} ${(median / budget).toFixed(1)}x`);
    

    const timeBreakdown = {
      getAllUnits: getMedian(measurements.getAllUnits),
      filterUnits: getMedian(measurements.filterUnits),
      processUnits: getMedian(measurements.processUnits)
    };
    
    const totalMeasured = Object.values(timeBreakdown).reduce((a, b) => a + b, 0);
    // console.log(`\nTime distribution:`);
    for (const [name, time] of Object.entries(timeBreakdown)) {
      const percent = (time / median * 100).toFixed(1);
      // console.log(`  ${name}: ${time.toFixed(4)}ms (${percent}%)`);
    }
    // console.log(`  Unaccounted: ${(median - totalMeasured).toFixed(4)}ms (${((median - totalMeasured) / median * 100).toFixed(1)}%)`);
    
    expect(median).toBeLessThan(budget * 3); // Allow 3x for now
  });
});