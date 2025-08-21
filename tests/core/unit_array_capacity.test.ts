import { describe, test, expect } from 'bun:test';
import { UnitArrays } from '../../src/sim/unit_arrays';
import { Simulator } from '../../src/core/simulator';

describe('Unit Array Capacity', () => {
  test('2v2 match with all toymakers hits capacity bug', () => {
    const sim = new Simulator(15, 15);
    
    // Add 4 toymakers like in a 2v2
    sim.addUnit({
      id: 'toymaker1',
      type: 'toymaker',
      pos: { x: 1, y: 5 },
      hp: 25,
      maxHp: 25,
      team: "friendly",
      sprite: "toymaker",
      state: "idle",
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      dmg: 1,
      abilities: ['deployBot'],
      meta: {}
    });
    
    sim.addUnit({
      id: 'toymaker2', 
      type: 'toymaker',
      pos: { x: 1, y: 10 },
      hp: 25,
      maxHp: 25,
      team: "friendly",
      sprite: "toymaker",
      state: "idle",
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      dmg: 1,
      abilities: ['deployBot'],
      meta: {}
    });
    
    sim.addUnit({
      id: 'toymaker3',
      type: 'toymaker',
      pos: { x: 14, y: 5 },
      hp: 25,
      maxHp: 25,
      team: "hostile",
      sprite: "toymaker",
      state: "idle",
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      dmg: 1,
      abilities: ['deployBot'],
      meta: {}
    });
    
    sim.addUnit({
      id: 'toymaker4',
      type: 'toymaker',
      pos: { x: 14, y: 10 },
      hp: 25,
      maxHp: 25,
      team: "hostile",
      sprite: "toymaker",
      state: "idle",
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      dmg: 1,
      abilities: ['deployBot'],
      meta: {}
    });
    
    // Run for 500 steps like a real match
    let maxUnits = 4;
    for (let i = 0; i < 500; i++) {
      sim.step();
      maxUnits = Math.max(maxUnits, sim.units.length);
      
      // Log if we're getting crazy
      if (sim.units.length > 100 && i % 50 === 0) {
        console.log(`Step ${i}: ${sim.units.length} units`);
      }
    }
    
    console.log(`Max units reached: ${maxUnits}`);
    
    // With 4 toymakers, each spawning max 4 units, we should have at most 4 + 16 = 20 units
    // Plus maybe some ambient spawning, but definitely under 50
    expect(maxUnits).toBeLessThan(50);
  });
  
  test('unit arrays properly reuse slots after clear', () => {
    const arrays = new UnitArrays(100);
    
    // Fill it up
    for (let i = 0; i < 100; i++) {
      const idx = arrays.add({
        id: `unit_${i}`,
        pos: { x: i, y: 0 },
        intendedMove: { x: 0, y: 0 },
        hp: 10,
        maxHp: 10,
        dmg: 1,
        mass: 1,
        team: 'neutral',
        state: 'idle'
      });
      expect(idx).toBe(i);
    }
    
    expect(arrays.activeCount).toBe(100);
    
    // Should be full
    const overflow = arrays.add({
      id: 'overflow',
      pos: { x: 0, y: 0 },
      intendedMove: { x: 0, y: 0 },
      hp: 10,
      maxHp: 10,
      dmg: 1,
      mass: 1,
      team: 'neutral',
      state: 'idle'
    });
    expect(overflow).toBe(-1);
    
    // Clear and verify slots are reusable
    arrays.clear();
    expect(arrays.activeCount).toBe(0);
    
    // Should be able to add again
    const newIdx = arrays.add({
      id: 'after_clear',
      pos: { x: 0, y: 0 },
      intendedMove: { x: 0, y: 0 },
      hp: 10,
      maxHp: 10,
      dmg: 1,
      mass: 1,
      team: 'neutral',
      state: 'idle'
    });
    expect(newIdx).toBe(0); // Should reuse first slot
  });
  
  test('remove frees up individual slots', () => {
    const arrays = new UnitArrays(10);
    
    // Add some units
    for (let i = 0; i < 5; i++) {
      arrays.add({
        id: `unit_${i}`,
        pos: { x: i, y: 0 },
        intendedMove: { x: 0, y: 0 },
        hp: 10,
        maxHp: 10,
        dmg: 1,
        mass: 1,
        team: 'neutral',
        state: 'idle'
      });
    }
    
    expect(arrays.activeCount).toBe(5);
    
    // Remove middle unit
    arrays.remove(2);
    expect(arrays.activeCount).toBe(4);
    expect(arrays.active[2]).toBe(0);
    
    // Should reuse that slot
    const newIdx = arrays.add({
      id: 'reused',
      pos: { x: 0, y: 0 },
      intendedMove: { x: 0, y: 0 },
      hp: 10,
      maxHp: 10,
      dmg: 1,
      mass: 1,
      team: 'neutral',
      state: 'idle'
    });
    expect(newIdx).toBe(2); // Should reuse freed slot
  });
});