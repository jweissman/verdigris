import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { timeExecution } from './perf_support';
import DSL from '../../src/rules/dsl';

describe('Abilities Performance Breakdown', () => {
  test('Profile DSL vs non-DSL units', () => {
    // Test with units that have abilities but NO enemies (so DSL shouldn't run much)
    const sim1 = new Simulator(50, 50);
    for (let i = 0; i < 25; i++) {
      sim1.addUnit({
        id: `friendly_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'friendly',
        hp: 20,
        abilities: ['melee', 'heal']  // These have enemy triggers
      });
    }
    
    const context1 = sim1.getTickContext();
    const abilities1 = sim1.rulebook.find(r => r.constructor.name === 'Abilities');
    
    const noEnemiesResult = timeExecution(() => {
      abilities1?.execute(context1);
    }, 1000);
    
    console.log(`\nNo enemies (25 units with abilities): ${noEnemiesResult.median.toFixed(4)}ms`);
    
    // Test with enemies present
    const sim2 = new Simulator(50, 50);
    for (let i = 0; i < 25; i++) {
      sim2.addUnit({
        id: `friendly_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'friendly',
        hp: 20,
        abilities: ['melee', 'heal']
      });
    }
    for (let i = 0; i < 25; i++) {
      sim2.addUnit({
        id: `hostile_${i}`,
        pos: { x: (i + 25) % 50, y: Math.floor((i + 25) / 50) },
        team: 'hostile',
        hp: 20,
        abilities: ['melee']
      });
    }
    
    const context2 = sim2.getTickContext();
    const abilities2 = sim2.rulebook.find(r => r.constructor.name === 'Abilities');
    
    const withEnemiesResult = timeExecution(() => {
      abilities2?.execute(context2);
    }, 1000);
    
    console.log(`With enemies (50 units with abilities): ${withEnemiesResult.median.toFixed(4)}ms`);
    console.log(`Difference: ${(withEnemiesResult.median / noEnemiesResult.median).toFixed(1)}x`);
    
    // Test DSL evaluation directly
    const units = context2.getAllUnits();
    const testUnit = units[0];
    
    const dslResult = timeExecution(() => {
      DSL.evaluate('closest.enemy()', testUnit, context2, undefined, units);
    }, 1000);
    
    console.log(`\nSingle DSL evaluation (closest.enemy()): ${dslResult.median.toFixed(4)}ms`);
    console.log(`DSL cost for 50 units (if all evaluated): ${(dslResult.median * 50).toFixed(4)}ms`);
  });
  
  test('Profile ability trigger checking', () => {
    const sim = new Simulator(50, 50);
    
    // Add units with different ability patterns
    for (let i = 0; i < 10; i++) {
      sim.addUnit({
        id: `no_ability_${i}`,
        pos: { x: i, y: 0 },
        team: 'friendly',
        hp: 20,
        abilities: []  // No abilities
      });
    }
    
    for (let i = 0; i < 10; i++) {
      sim.addUnit({
        id: `simple_ability_${i}`,
        pos: { x: i, y: 1 },
        team: 'friendly',
        hp: 20,
        abilities: ['heal']  // Simple ability
      });
    }
    
    for (let i = 0; i < 10; i++) {
      sim.addUnit({
        id: `complex_ability_${i}`,
        pos: { x: i, y: 2 },
        team: 'friendly',
        hp: 20,
        abilities: ['melee', 'ranged', 'heal']  // Multiple abilities
      });
    }
    
    // Add some enemies
    for (let i = 0; i < 10; i++) {
      sim.addUnit({
        id: `enemy_${i}`,
        pos: { x: i + 20, y: 0 },
        team: 'hostile',
        hp: 20,
        abilities: ['melee']
      });
    }
    
    const context = sim.getTickContext();
    const abilities = sim.rulebook.find(r => r.constructor.name === 'Abilities');
    
    console.log('\n=== Ability Checking Performance ===');
    
    const result = timeExecution(() => {
      abilities?.execute(context);
    }, 1000);
    
    console.log(`40 units (30 with abilities): ${result.median.toFixed(4)}ms`);
    console.log(`Per unit with abilities: ${(result.median / 30).toFixed(4)}ms`);
    console.log(`Target per unit: 0.0002ms (0.01ms / 50 units)`);
  });
});