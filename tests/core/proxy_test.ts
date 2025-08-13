import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Unit Proxy System', () => {
  it('should always return proxies with working meta getter', () => {
    const sim = new Simulator(32, 32);
    
    // Add a unit
    const unit = sim.addUnit({
      id: 'test1',
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: 'friendly',
      state: 'idle'
    });
    
    // Verify the returned unit has meta
    expect(unit.meta).toBeDefined();
    expect(typeof unit.meta).toBe('object');
    
    // Access through units getter
    const units = sim.units;
    expect(units.length).toBe(1);
    
    const firstUnit = units[0];
    expect(firstUnit).toBeDefined();
    expect(firstUnit.meta).toBeDefined();
    expect(typeof firstUnit.meta).toBe('object');
    
    // Test accessing properties on meta
    expect(firstUnit.meta.phantom).toBeUndefined(); // Should be undefined but not error
    expect(!firstUnit.meta.phantom).toBe(true); // Should work without error
  });
  
  it('should maintain proxy consistency after reset', () => {
    const sim = new Simulator(32, 32);
    
    // Add initial unit
    sim.addUnit({
      id: 'before',
      pos: { x: 5, y: 5 },
      hp: 50,
      team: 'neutral'
    });
    
    // Reset
    sim.reset();
    
    // Add new unit
    sim.addUnit({
      id: 'after',
      pos: { x: 15, y: 15 },
      hp: 75,
      team: 'hostile'
    });
    
    // Check units getter
    const units = sim.units;
    expect(units.length).toBe(1);
    expect(units[0].id).toBe('after');
    expect(units[0].meta).toBeDefined();
    expect(typeof units[0].meta).toBe('object');
  });
});