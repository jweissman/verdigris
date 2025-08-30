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
      state: 'stunned' as const
    });
    
    console.log('Unit state:', unit.state);
    console.log('Unit meta:', unit.meta);
    
    const context = new TickContextImpl(sim, 5);
    const commands = rule.execute(context);
    
    console.log('Commands generated:', commands.length);
    console.log('Unit after execute:', unit.meta);
    
    // Check that we generate particle effects for stunned/frozen units
    const particleCommands = commands.filter(c => c.type === 'particle');
    expect(particleCommands.length).toBeGreaterThan(0);
    
    // Visual effects should be applied directly to the unit
    expect(unit.meta?.visualOffsetX).toBeDefined();
    expect(unit.meta?.frozenTint).toBeDefined();
  });
});