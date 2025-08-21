import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Unit Cleanup', () => {
  test('dead units are properly removed from arrays', () => {
    const sim = new Simulator(50, 50);
    
    // Add some units
    for (let i = 0; i < 10; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i * 5, y: 25 },
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
    
    expect(sim.units.length).toBe(10);
    
    // Kill half the units
    for (let i = 0; i < 5; i++) {
      const unit = sim.units.find(u => u.id === `unit_${i}`);
      if (unit) {
        sim.getProxyManager().setHp(`unit_${i}`, 0);
        sim.getProxyManager().setState(`unit_${i}`, 'dead');
      }
    }
    
    // Run a tick - cleanup should remove dead units
    sim.step();
    
    // Check that dead units were removed
    expect(sim.units.length).toBe(5);
    
    // Verify the right units remain
    for (let i = 5; i < 10; i++) {
      expect(sim.units.find(u => u.id === `unit_${i}`)).toBeDefined();
    }
    
    // Verify dead units are gone
    for (let i = 0; i < 5; i++) {
      expect(sim.units.find(u => u.id === `unit_${i}`)).toBeUndefined();
    }
  });
  
  test('toymaker spawned units are cleaned up when they die', () => {
    const sim = new Simulator(50, 50);
    
    // Add a toymaker
    sim.addUnit({
      id: 'toymaker1',
      type: 'toymaker',
      pos: { x: 25, y: 25 },
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
    
    const initialCount = sim.units.length;
    
    // Track unit creation
    let unitsCreated = [];
    
    // Run for many ticks to trigger bot spawning
    for (let i = 0; i < 200; i++) {
      const before = sim.units.length;
      sim.step();
      const after = sim.units.length;
      if (after > before) {
        const newUnits = sim.units.slice(before);
        unitsCreated.push(...newUnits.map(u => u.id));
      }
    }
    
    const afterSpawning = sim.units.length;
    expect(afterSpawning).toBeGreaterThan(initialCount);
    
    console.log('Units created during test:', unitsCreated);
    console.log('Toymaker meta after spawning:', sim.units.find(u => u.id === 'toymaker1')?.meta);
    
    // Kill all units except the toymaker
    for (const unit of sim.units) {
      if (unit.id !== 'toymaker1') {
        sim.getProxyManager().setHp(unit.id, 0);
        sim.getProxyManager().setState(unit.id, 'dead');
      }
    }
    
    // Run cleanup
    sim.step();
    
    // Debug: what units are left?
    console.log('Remaining units after cleanup:', sim.units.map(u => ({ id: u.id, hp: u.hp, state: u.state })));
    
    // Should be back to just the toymaker
    expect(sim.units.length).toBe(1);
    expect(sim.units[0].id).toBe('toymaker1');
  });
  
  test('repeated spawning and cleanup cycles work correctly', () => {
    const sim = new Simulator(50, 50);
    
    // Track array slots used over time
    const slotsUsed: number[] = [];
    
    for (let cycle = 0; cycle < 5; cycle++) {
      // Spawn 100 units
      for (let i = 0; i < 100; i++) {
        sim.addUnit({
          id: `cycle${cycle}_unit${i}`,
          pos: { x: i % 50, y: Math.floor(i / 50) * 25 },
          hp: 1,
          maxHp: 1,
          team: "neutral",
          sprite: "soldier",
          state: "idle",
          intendedMove: { x: 0, y: 0 },
          mass: 1,
          dmg: 1,
          abilities: [],
          meta: {}
        });
      }
      
      // Track slots used
      let usedCount = 0;
      for (let i = 0; i < sim['unitArrays'].capacity; i++) {
        if (sim['unitArrays'].active[i] === 1) {
          usedCount++;
        }
      }
      slotsUsed.push(usedCount);
      
      // Kill all units
      for (const unit of sim.units) {
        sim.getProxyManager().setHp(unit.id, 0);
        sim.getProxyManager().setState(unit.id, 'dead');
      }
      
      // Run cleanup
      sim.step();
      
      // All should be removed
      expect(sim.units.length).toBe(0);
    }
    
    // Slots used should be consistent - we're reusing the same slots
    console.log('Slots used per cycle:', slotsUsed);
    expect(Math.max(...slotsUsed)).toBeLessThanOrEqual(100);
  });
});