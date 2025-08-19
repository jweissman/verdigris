import { describe, test } from 'bun:test';
import { createTestSimulator } from './perf_support';

describe('Debug Test Scenario', () => {
  test('check units', () => {
    const sim = createTestSimulator(50);
    const context = sim.getTickContext();
    const units = context.getAllUnits();
    
    const friendly = units.filter(u => u.team === 'friendly');
    const hostile = units.filter(u => u.team === 'hostile');
    
    console.log(`Friendly units: ${friendly.length}`);
    console.log(`Hostile units: ${hostile.length}`);
    
    // Check closest enemy distances
    let minDist = Infinity;
    for (const f of friendly) {
      for (const h of hostile) {
        const dx = f.pos.x - h.pos.x;
        const dy = f.pos.y - h.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) minDist = dist;
      }
    }
    console.log(`Closest enemy distance: ${minDist.toFixed(2)}`);
    
    // Check abilities
    const abilities = sim.rulebook.find(r => r.constructor.name === 'Abilities');
    
    // Measure with effects
    let times1 = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      const cmds = abilities.execute(context);
      times1.push(performance.now() - start);
    }
    times1.sort((a, b) => a - b);
    console.log(`\nWith effects: ${times1[50].toFixed(4)}ms`);
    const cmds = abilities.execute(context);
    console.log(`Commands generated: ${cmds.length}`);
    
    // Check if abilities are triggering
    let triggeredCount = 0;
    for (const unit of units) {
      if (unit.abilities) {
        for (const ab of unit.abilities) {
          const ability = abilities.ability(ab);
          if (ability?.trigger) {
            const compiled = abilities.constructor.precompiledAbilities.get(ab);
            if (compiled?.trigger) {
              context.cachedUnits = units;
              if (compiled.trigger(unit, context)) {
                triggeredCount++;
              }
            }
          }
        }
      }
    }
    console.log(`Abilities that would trigger: ${triggeredCount}`);
    
    // Now stub out processEffectAsCommand
    const original = abilities.processEffectAsCommand;
    abilities.processEffectAsCommand = () => {}; // Do nothing
    
    let times2 = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      const cmds = abilities.execute(context);
      times2.push(performance.now() - start);
    }
    times2.sort((a, b) => a - b);
    console.log(`\nWithout effects: ${times2[50].toFixed(4)}ms`);
    console.log(`Commands generated: ${abilities.execute(context).length}`);
    
    abilities.processEffectAsCommand = original;
  });
});