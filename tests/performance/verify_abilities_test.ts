import { describe, test, expect } from 'bun:test';
import { createTestSimulator } from './perf_support';

describe('Verify Abilities Actually Work', () => {
  test('prove abilities are running and triggering', () => {
    const sim = createTestSimulator(50);
    const context = sim.getTickContext();
    const abilities = sim.rulebook.find(r => r.constructor.name === 'Abilities');
    
    // Check the actual scenario
    const units = context.getAllUnits();
    console.log(`\n=== ACTUAL TEST SCENARIO ===`);
    console.log(`Total units: ${units.length}`);
    
    const friendly = units.filter(u => u.team === 'friendly' && u.state !== 'dead');
    const hostile = units.filter(u => u.team === 'hostile' && u.state !== 'dead');
    console.log(`Friendly: ${friendly.length}, Hostile: ${hostile.length}`);
    
    // Calculate actual distances
    const distances = [];
    for (const f of friendly) {
      for (const h of hostile) {
        const dx = f.pos.x - h.pos.x;
        const dy = f.pos.y - h.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        distances.push(dist);
      }
    }
    distances.sort((a, b) => a - b);
    
    console.log(`\n=== DISTANCES ===`);
    if (distances.length > 0) {
      console.log(`Min distance: ${distances[0]?.toFixed(2)}`);
      console.log(`Max distance: ${distances[distances.length-1]?.toFixed(2)}`);
      console.log(`Units within melee range (<=2): ${distances.filter(d => d <= 2).length}`);
      console.log(`Units within ranged range (<=10): ${distances.filter(d => d <= 10).length}`);
    } else {
      console.log(`No enemy pairs to check!`);
    }
    
    // Run abilities and see what happens
    console.log(`\n=== ABILITIES EXECUTION ===`);
    const commands = abilities.execute(context);
    console.log(`Commands generated: ${commands.length}`);
    
    // Count command types
    const commandTypes = {};
    for (const cmd of commands) {
      commandTypes[cmd.type] = (commandTypes[cmd.type] || 0) + 1;
    }
    console.log(`Command breakdown:`, commandTypes);
    
    // Manually check if abilities SHOULD trigger
    let shouldTriggerCount = 0;
    for (const unit of units) {
      if (!unit.abilities) continue;
      for (const abilityName of unit.abilities) {
        if (abilityName === 'melee') {
          // Check if any enemy within 2 units
          for (const other of units) {
            if (other.team !== unit.team && other.state !== 'dead') {
              const dx = unit.pos.x - other.pos.x;
              const dy = unit.pos.y - other.pos.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= 2) {
                shouldTriggerCount++;
                break;
              }
            }
          }
        } else if (abilityName === 'ranged') {
          // Check if any enemy within 10 units but > 2
          for (const other of units) {
            if (other.team !== unit.team && other.state !== 'dead') {
              const dx = unit.pos.x - other.pos.x;
              const dy = unit.pos.y - other.pos.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= 10 && dist > 2) {
                shouldTriggerCount++;
                break;
              }
            }
          }
        }
      }
    }
    
    console.log(`\n=== VALIDATION ===`);
    console.log(`Abilities that SHOULD trigger: ${shouldTriggerCount}`);
    console.log(`Damage commands generated: ${commandTypes['damage'] || 0}`);
    console.log(`Projectile commands generated: ${commandTypes['projectile'] || 0}`);
    
    // Measure performance
    const times = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      abilities.execute(context);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    
    console.log(`\n=== PERFORMANCE ===`);
    console.log(`Median execution time: ${times[50].toFixed(4)}ms`);
    
    // Sanity check
    if (hostile.length > 0 && friendly.length > 0) {
      if (distances.some(d => d <= 10)) {
        expect(commands.length).toBeGreaterThan(0);
        console.log(`✓ Abilities ARE triggering when enemies in range`);
      } else {
        expect(commands.filter(c => c.type === 'damage' || c.type === 'projectile').length).toBe(0);
        console.log(`✓ Abilities NOT triggering when enemies out of range`);
      }
    }
  });
});