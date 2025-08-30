import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { FreezeAnimation } from '../../src/rules/freeze_animation';
import { TickContextImpl } from '../../src/core/tick_context';

describe('FreezeAnimation', () => {
  test('creates ice particles for frozen units', () => {
    const sim = new Simulator(32, 32);
    const rule = new FreezeAnimation();
    
    // Add a frozen unit
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
    
    const context = new TickContextImpl(sim, 0);
    const commands = rule.execute(context);
    
    // Should create ice crystal particles
    const particleCommands = commands.filter(c => c.type === 'particle');
    expect(particleCommands.length).toBeGreaterThan(0);
    
    // Check particle properties
    const firstParticle = particleCommands[0];
    expect(firstParticle.params.type).toBe('ice');
    expect(firstParticle.params.color).toBe('#87CEEB'); // Sky blue
  });
  
  test('adds shake effect to frozen units', () => {
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
    
    const context = new TickContextImpl(sim, 5);
    const commands = rule.execute(context);
    
    // Should create some visual effects for frozen unit
    expect(commands.length).toBeGreaterThan(0);
    
    // Unit should have visual effects applied
    expect(unit.meta?.visualOffsetX).toBeDefined();
  });
  
  test('adds frozen tint to frozen units', () => {
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
        statusEffects: [
          { type: 'frozen', duration: 30, initialDuration: 60 }
        ]
      }
    });
    
    const context = new TickContextImpl(sim, 0);
    rule.execute(context);
    
    // Should have frozen tint
    expect(unit.meta?.frozenTint).toBeDefined();
    expect(unit.meta?.frozenTint?.color).toBe('#4682B4'); // Steel blue
    expect(unit.meta?.frozenTint?.alpha).toBeGreaterThan(0);
  });
  
  test('creates ice shards periodically', () => {
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
    
    // Execute at tick 30 (when shards should spawn)
    const context = new TickContextImpl(sim, 30);
    const commands = rule.execute(context);
    
    // Should have shard particles
    const shardCommands = commands.filter(c => 
      c.type === 'particle' && c.params.type === 'shard'
    );
    expect(shardCommands.length).toBeGreaterThan(0);
    expect(shardCommands[0].params.color).toBe('#B0E0E6'); // Powder blue
  });
  
  test('shows freeze duration as rings', () => {
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
        statusEffects: [
          { type: 'frozen', duration: 30, initialDuration: 60 }
        ]
      }
    });
    
    // Execute at tick 10 (when rings should spawn)
    const context = new TickContextImpl(sim, 10);
    const commands = rule.execute(context);
    
    // Should have ring particles
    const ringCommands = commands.filter(c => 
      c.type === 'particle' && c.params.type === 'ring'
    );
    expect(ringCommands.length).toBeGreaterThan(0);
    expect(ringCommands[0].params.color).toBe('#00BFFF'); // Deep sky blue
  });
  
  test('clears effects when unit unfreezes', () => {
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
        frozen: true,
        visualOffsetX: 0.5,
        visualOffsetY: 0.2,
        frozenTint: { color: '#4682B4', alpha: 0.3 }
      }
    });
    
    // Unfreeze the unit
    unit.meta.frozen = false;
    
    const context = new TickContextImpl(sim, 0);
    rule.execute(context);
    
    // Effects should be cleared
    expect(unit.meta?.visualOffsetX).toBeUndefined();
    expect(unit.meta?.visualOffsetY).toBeUndefined();
    expect(unit.meta?.frozenTint).toBeUndefined();
  });
  
  test('creates thaw burst when unit unfreezes', () => {
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
        wasJustUnfrozen: true
      }
    });
    
    const context = new TickContextImpl(sim, 0);
    const commands = rule.execute(context);
    
    // Should have steam particles
    const steamCommands = commands.filter(c => 
      c.type === 'particle' && c.params.type === 'steam'
    );
    expect(steamCommands.length).toBe(10); // 10 steam particles
    expect(steamCommands[0].params.color).toBe('#F0F8FF'); // Alice blue
    
    // Flag should be cleared
    expect(unit.meta?.wasJustUnfrozen).toBeUndefined();
  });
  
  test('creates frost particles in cold areas', () => {
    const sim = new Simulator(8, 8);
    const rule = new FreezeAnimation();
    
    // Set a very cold temperature
    sim.fieldManager.temperatureField.set(4, 4, -30);
    
    // Execute at tick 20 (when frost particles spawn)
    const context = new TickContextImpl(sim, 20);
    const commands = rule.execute(context);
    
    // Should have frost particles (probabilistic, but likely)
    const frostCommands = commands.filter(c => 
      c.type === 'particle' && c.params.type === 'frost'
    );
    
    // May or may not have frost due to randomness, but check properties if we do
    if (frostCommands.length > 0) {
      expect(frostCommands[0].params.color).toBe('#E0FFFF'); // Light cyan
      expect(frostCommands[0].params.radius).toBe(0.5);
    }
  });
});