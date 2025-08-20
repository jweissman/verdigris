import { test, expect } from 'bun:test';
import { Simulator } from '../src/core/simulator';

test('delta tracking system works', () => {
  const sim = new Simulator(10, 10);

  

  const unit = sim.addUnit({
    id: 'test-unit',
    sprite: 'soldier',
    hp: 100,
    maxHp: 100,
    state: 'idle',
    pos: { x: 5, y: 5 }
  });
  

  sim.step();
  let changedUnits = sim.getChangedUnits();
  expect(changedUnits).toContain('test-unit');
  

  sim.step();
  changedUnits = sim.getChangedUnits();
  

  sim.queuedCommands.push({
    type: 'move',
    params: { unitId: 'test-unit', x: 6, y: 5 }
  });
  sim.step();
  changedUnits = sim.getChangedUnits();
  expect(changedUnits).toContain('test-unit');
  

  expect(sim.hasUnitChanged('test-unit')).toBe(true);
  expect(sim.hasUnitChanged('nonexistent-unit')).toBe(false);
  
  console.debug(`Changed units this frame: ${changedUnits.length}/${sim.units.length}`);
});