import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Melee Combat Mechanics', () => {
  test('units should deal damage in melee', () => {
    const sim = new Simulator(10, 10);
    
    // Add two units next to each other
    const soldier1 = {
      id: 'soldier1',
      type: 'soldier',
      pos: { x: 5, y: 5 },
      intendedMove: { x: 0, y: 0 },
      team: "friendly" as const,
      sprite: "soldier",
      state: "idle" as const,
      hp: 30,
      maxHp: 30,
      dmg: 5,
      mass: 1,
      abilities: [],
      meta: {}
    };
    
    const soldier2 = {
      id: 'soldier2',
      type: 'soldier',
      pos: { x: 6, y: 5 },
      intendedMove: { x: 0, y: 0 },
      team: "hostile" as const,
      sprite: "soldier",
      state: "idle" as const,
      hp: 30,
      maxHp: 30,
      dmg: 5,
      mass: 1,
      abilities: [],
      meta: {}
    };
    
    sim.addUnit(soldier1);
    sim.addUnit(soldier2);
    
    console.log('Initial HP - Soldier1:', soldier1.hp, 'Soldier2:', soldier2.hp);
    
    // Run one step
    sim.step();
    
    const s1 = sim.units.find(u => u.id === 'soldier1');
    const s2 = sim.units.find(u => u.id === 'soldier2');
    
    console.log('After step 1 - Soldier1 HP:', s1?.hp, 'Soldier2 HP:', s2?.hp);
    
    // Units should have damaged each other
    expect(s1?.hp).toBeLessThan(30);
    expect(s2?.hp).toBeLessThan(30);
    
    // Run more steps to see combat progress
    for (let i = 0; i < 10; i++) {
      sim.step();
      const s1 = sim.units.find(u => u.id === 'soldier1');
      const s2 = sim.units.find(u => u.id === 'soldier2');
      console.log(`Step ${i+2} - S1 HP: ${s1?.hp || 'dead'}, S2 HP: ${s2?.hp || 'dead'}`);
      
      if (!s1 || s1.hp <= 0 || !s2 || s2.hp <= 0) {
        console.log('Combat ended!');
        break;
      }
    }
    
    // One should be dead
    const survivor1 = sim.units.find(u => u.id === 'soldier1' && u.hp > 0);
    const survivor2 = sim.units.find(u => u.id === 'soldier2' && u.hp > 0);
    
    // At least one should be dead
    expect(!survivor1 || !survivor2).toBe(true);
  });
  
  test('mirror matches should not draw when units have damage', () => {
    const sim = new Simulator(10, 10);
    
    // Add identical teams
    sim.addUnit({
      id: 'team1_1',
      type: 'soldier',
      pos: { x: 3, y: 5 },
      intendedMove: { x: 0, y: 0 },
      team: "friendly" as const,
      sprite: "soldier",
      state: "idle" as const,
      hp: 30,
      maxHp: 30,
      dmg: 5,
      mass: 1,
      abilities: [],
      meta: {}
    });
    
    sim.addUnit({
      id: 'team2_1',
      type: 'soldier',
      pos: { x: 7, y: 5 },
      intendedMove: { x: 0, y: 0 },
      team: "hostile" as const,
      sprite: "soldier",
      state: "idle" as const,
      hp: 30,
      maxHp: 30,
      dmg: 5,
      mass: 1,
      abilities: [],
      meta: {}
    });
    
    let steps = 0;
    const maxSteps = 100;
    
    while (steps < maxSteps) {
      sim.step();
      steps++;
      
      const alive1 = sim.units.filter(u => u.team === 'friendly' && u.hp > 0);
      const alive2 = sim.units.filter(u => u.team === 'hostile' && u.hp > 0);
      
      if (alive1.length === 0 || alive2.length === 0) {
        console.log(`Combat resolved in ${steps} steps`);
        break;
      }
    }
    
    expect(steps).toBeLessThan(maxSteps);
  });
});