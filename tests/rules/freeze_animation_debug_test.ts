import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { FreezeAnimation } from '../../src/rules/freeze_animation';
import { TickContextImpl } from '../../src/core/tick_context';

describe('FreezeAnimation Debug', () => {
  test('debug frozen detection', () => {
    const sim = new Simulator(32, 32);
    const rule = new FreezeAnimation();
    
    const unit = sim.addUnit({
      id: 'frozen_unit',
      pos: { x: 10, y: 10 },
      hp: 50,
      maxHp: 50,
      team: 'hostile',
      sprite: 'soldier',
      meta: {
        frozen: true
      }
    });
    
    const context = new TickContextImpl(sim);
    const commands = rule.execute(context);
    
    // Check that we generate effects for frozen units
    expect(commands.length).toBeGreaterThan(0);
    
    // Visual effects should be applied directly to the unit
    expect(unit.meta?.visualOffsetX).toBeDefined();
    expect(unit.meta?.frozenTint).toBeDefined();
  });
});