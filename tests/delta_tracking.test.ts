import { test, expect } from 'bun:test';
import { Simulator } from '../src/core/simulator';

test('delta tracking system works', () => {
  const sim = new Simulator(10, 10);
  sim.enableProfiling = true; // Enable debug tracking
  
  // Add a unit
  const unit = sim.addUnit({
    id: 'test-unit',
    sprite: 'soldier',
    hp: 100,
    maxHp: 100,
    state: 'idle',
    pos: { x: 5, y: 5 }
  });
  
  console.log('After addUnit, dirtyUnits:', Array.from((sim as any).dirtyUnits));
  
  // Initial step - should have all units as "changed" since they're new
  sim.step();
  console.log('After step, changedUnits:', Array.from((sim as any).changedUnits));
  let changedUnits = sim.getChangedUnits();
  console.log('getChangedUnits returned:', changedUnits);
  expect(changedUnits).toContain('test-unit');
  
  // Step without changes - should have fewer changed units
  sim.step();
  changedUnits = sim.getChangedUnits();
  
  // Move the unit via the command system
  sim.queuedCommands.push({
    type: 'move',
    params: { unitId: 'test-unit', x: 6, y: 5 }
  });
  sim.step();
  changedUnits = sim.getChangedUnits();
  expect(changedUnits).toContain('test-unit');
  
  // Check individual unit change tracking
  expect(sim.hasUnitChanged('test-unit')).toBe(true);
  expect(sim.hasUnitChanged('nonexistent-unit')).toBe(false);
  
  console.debug(`Changed units this frame: ${changedUnits.length}/${sim.units.length}`);
});