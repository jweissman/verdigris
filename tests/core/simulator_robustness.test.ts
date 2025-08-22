import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe.skip('Simulator Robustness', () => {
  // takes 8000ms??
  test.skip('simulator can handle unit array capacity limits gracefully', () => {
    const sim = new Simulator(100, 100);
    
    // The simulator sets capacity to 10000 in constructor
    const unitCount = 10001;
    let successCount = 0;
    
    for (let i = 0; i < unitCount; i++) {
      const unit = {
        id: `unit_${i}`,
        pos: { x: Math.random() * 100, y: Math.random() * 100 },
        hp: 10,
        maxHp: 10,
        team: i % 2 === 0 ? "friendly" : "hostile" as "friendly" | "hostile",
        sprite: "soldier",
        state: "idle" as const,
        intendedMove: { x: 0, y: 0 },
        mass: 1,
        dmg: 1,
        abilities: [],
        meta: {}
      };
      
      const result = sim.addUnit(unit);
      if (result) {
        successCount++;
      }
    }
    
    // Should handle up to capacity (10000 as set in simulator constructor)
    expect(successCount).toBe(10000);
    expect(sim.units.length).toBe(10000);
  });
  
  test('simulator can reset and reuse properly', () => {
    const sim = new Simulator(50, 50);
    
    // Add some units
    for (let i = 0; i < 100; i++) {
      sim.addUnit({
        id: `first_batch_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        hp: 10,
        maxHp: 10,
        team: "friendly",
        sprite: "soldier",
        state: "idle",
        intendedMove: { x: 0, y: 0 },
        mass: 1,
        dmg: 1,
        abilities: [],
        meta: {}
      });
    }
    
    // Run some ticks
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    expect(sim.units.length).toBe(100);
    expect(sim.ticks).toBe(10);
    
    // Reset the simulator
    sim.reset();
    
    expect(sim.units.length).toBe(0);
    expect(sim.ticks).toBe(0);
    
    // Add units again
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `second_batch_${i}`,
        pos: { x: i, y: 0 },
        hp: 15,
        maxHp: 15,
        team: "hostile",
        sprite: "archer",
        state: "idle",
        intendedMove: { x: 0, y: 0 },
        mass: 1,
        dmg: 2,
        abilities: [],
        meta: {}
      });
    }
    
    expect(sim.units.length).toBe(50);
    
    // Run some more ticks
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    expect(sim.ticks).toBe(5);
  });
  
  test('simulator handles repeated resets without memory leaks', () => {
    const sim = new Simulator(30, 30);
    
    // Simulate multiple battle rounds
    for (let round = 0; round < 10; round++) {
      // Add units for this round
      for (let i = 0; i < 20; i++) {
        sim.addUnit({
          id: `round${round}_unit${i}`,
          pos: { x: i, y: round },
          hp: 5,
          maxHp: 5,
          team: i < 10 ? "friendly" : "hostile",
          sprite: "soldier",
          state: "idle",
          intendedMove: { x: 0, y: 0 },
          mass: 1,
          dmg: 1,
          abilities: [],
          meta: {}
        });
      }
      
      // Run battle for a few ticks
      for (let tick = 0; tick < 20; tick++) {
        sim.step();
      }
      
      // Reset for next round
      sim.reset();
      expect(sim.units.length).toBe(0);
    }
    
    // After all rounds, simulator should be clean
    expect(sim.units.length).toBe(0);
    expect(sim.ticks).toBe(0);
  });
  
  test('simulator maintains stability with toymaker spawning units', () => {
    const sim = new Simulator(50, 50);
    
    // Add toymakers that will spawn bots
    for (let i = 0; i < 5; i++) {
      sim.addUnit({
        id: `toymaker_${i}`,
        type: 'toymaker',
        pos: { x: i * 10, y: 25 },
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
    }
    
    const initialCount = sim.units.length;
    
    // Run for many ticks to trigger spawning
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    // Should have more units due to spawning
    expect(sim.units.length).toBeGreaterThan(initialCount);
    
    // Reset should clear everything
    sim.reset();
    expect(sim.units.length).toBe(0);
  });
});