import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe.skip('Jumping Responsiveness', () => {
  it('should complete short jumps quickly', () => {
    const sim = new Simulator(20, 20);
    
    // Create a unit with jump ability
    const jumper = {
      id: 'jumper',
      pos: { x: 5, y: 5 },
      team: 'friendly',
      hp: 50,
      maxHp: 50,
      sprite: 'test',
      state: 'idle',
      abilities: ['jumps'],
      lastAbilityTick: { jumps: -100 } // Ready to jump
    };
    
    // Add an enemy to trigger jump
    const enemy = {
      id: 'enemy',
      pos: { x: 8, y: 5 }, // 3 tiles away
      team: 'hostile',
      hp: 30,
      maxHp: 30,
      sprite: 'enemy',
      state: 'idle'
    };
    
    sim.addUnit(jumper);
    sim.addUnit(enemy);
    
    // Force a jump
    sim.queuedCommands = [{
      type: 'jump',
      params: {
        unitId: 'jumper',
        targetX: 8,
        targetY: 5,
        height: 2,
        damage: 5,
        radius: 2
      }
    }];
    
    sim.step(); // Process command
    
    // Check that jump was initiated
    let jumperUnit = sim.units.find(u => u.id === 'jumper');
    expect(jumperUnit?.meta?.jumping).toBe(true);
    
    // Count steps until jump completes
    let jumpSteps = 0;
    const maxSteps = 20;
    
    for (let i = 0; i < maxSteps; i++) {
      sim.step();
      jumpSteps++;
      
      const unit = sim.units.find(u => u.id === 'jumper');
      if (!unit?.meta?.jumping) {
        break;
      }
    }
    
    // Short jump (3 tiles) should complete in ~2-3 steps (0.7 * 3 ≈ 2.1)
    expect(jumpSteps).toBeLessThanOrEqual(4);
    expect(jumpSteps).toBeGreaterThan(0);
  });
  
  it('should scale jump duration with distance', () => {
    const sim = new Simulator(30, 30);
    
    // Test short jump
    const shortJumper = {
      id: 'short-jumper',
      pos: { x: 5, y: 5 },
      team: 'friendly',
      hp: 50,
      maxHp: 50,
      sprite: 'test',
      state: 'idle'
    };
    
    sim.addUnit(shortJumper);
    
    sim.queuedCommands = [{
      type: 'jump',
      params: {
        unitId: 'short-jumper',
        targetX: 7,
        targetY: 5, // 2 tiles
        height: 2,
        damage: 5,
        radius: 2
      }
    }];
    
    sim.step();
    let shortJumpSteps = 0;
    
    for (let i = 0; i < 20; i++) {
      sim.step();
      shortJumpSteps++;
      const unit = sim.units.find(u => u.id === 'short-jumper');
      if (!unit?.meta?.jumping) break;
    }
    
    // Test long jump
    const longJumper = {
      id: 'long-jumper',
      pos: { x: 5, y: 10 },
      team: 'friendly',
      hp: 50,
      maxHp: 50,
      sprite: 'test',
      state: 'idle'
    };
    
    sim.addUnit(longJumper);
    
    sim.queuedCommands = [{
      type: 'jump',
      params: {
        unitId: 'long-jumper',
        targetX: 20,
        targetY: 10, // 15 tiles
        height: 5,
        damage: 10,
        radius: 3
      }
    }];
    
    sim.step();
    let longJumpSteps = 0;
    
    for (let i = 0; i < 20; i++) {
      sim.step();
      longJumpSteps++;
      const unit = sim.units.find(u => u.id === 'long-jumper');
      if (!unit?.meta?.jumping) break;
    }
    
    // Long jump should take more time than short jump
    expect(longJumpSteps).toBeGreaterThan(shortJumpSteps);
    // But not TOO long (15 * 0.7 ≈ 10.5, capped at 15)
    expect(longJumpSteps).toBeLessThanOrEqual(15);
  });
  
  it('should show AoE impact effects on landing', () => {
    const sim = new Simulator(20, 20);
    
    const jumper = {
      id: 'impact-jumper',
      pos: { x: 5, y: 5 },
      team: 'friendly',
      hp: 50,
      maxHp: 50,
      sprite: 'test',
      state: 'idle'
    };
    
    const target = {
      id: 'target',
      pos: { x: 10, y: 5 },
      team: 'hostile',
      hp: 30,
      maxHp: 30,
      sprite: 'enemy',
      state: 'idle'
    };
    
    sim.addUnit(jumper);
    sim.addUnit(target);
    
    sim.queuedCommands = [{
      type: 'jump',
      params: {
        unitId: 'impact-jumper',
        targetX: 10,
        targetY: 5,
        height: 3,
        damage: 10,
        radius: 3
      }
    }];
    
    sim.step();
    
    // Wait for jump to complete
    for (let i = 0; i < 20; i++) {
      sim.step();
      const unit = sim.units.find(u => u.id === 'impact-jumper');
      if (!unit?.meta?.jumping) break;
    }
    
    // Check that AoE event was recorded
    const aoeEvents = sim.processedEvents.filter(e => e.kind === 'aoe');
    expect(aoeEvents.length).toBeGreaterThan(0);
    
    // Check that AoE events have tick information for rendering
    const hasTickInfo = aoeEvents.some(e => e.meta?.tick !== undefined);
    expect(hasTickInfo).toBe(true);
  });
});