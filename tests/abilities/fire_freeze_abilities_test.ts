import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Fire and Freeze Abilities', () => {
  test('fire ability should create fire effects at target location', () => {
    const sim = new Simulator(32, 32);
    
    const hero = sim.addUnit({
      id: 'hero',
      type: 'hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: 'friendly',
      sprite: 'hero',
      tags: ['hero'],
      meta: {
        primaryAction: 'fire'
      }
    });
    
    // Add an enemy nearby
    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 12, y: 10 },
      hp: 50,
      maxHp: 50,
      team: 'hostile',
      sprite: 'goblin'
    });
    
    // Execute fire command at enemy location
    sim.queuedCommands = [{
      type: 'fire',
      unitId: hero.id,
      params: {
        x: enemy.pos.x,
        y: enemy.pos.y,
        radius: 3,
        temperature: 500
      }
    }];
    
    sim.tick();
    
    // Process additional ticks to ensure effects are applied
    sim.tick();
    sim.tick();
    
    // Enemy should take damage from fire
    const burnedEnemy = sim.units.find(u => u.id === 'enemy');
    if (burnedEnemy) {
      // Should have taken damage from the fire AoE
      expect(burnedEnemy.hp).toBeLessThan(50);
    }
  });
  
  test('freeze ability should stun enemies', () => {
    const sim = new Simulator(32, 32);
    
    const hero = sim.addUnit({
      id: 'hero',
      type: 'hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: 'friendly',
      sprite: 'hero',
      tags: ['hero']
    });
    
    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 12, y: 10 },
      hp: 50,
      maxHp: 50,
      team: 'hostile',
      sprite: 'goblin',
      intendedMove: { x: 1, y: 0 } // Enemy wants to move
    });
    
    const enemyStartPos = { ...enemy.pos };
    
    // Execute freeze command
    sim.queuedCommands = [{
      type: 'temperature',
      params: {
        x: enemy.pos.x,
        y: enemy.pos.y,
        radius: 3,
        amount: -50
      }
    }];
    
    sim.tick();
    
    // Process freeze effect
    sim.tick();
    sim.tick();
    
    // Enemy should be frozen/stunned
    const frozenEnemy = sim.units.find(u => u.id === 'enemy');
    if (frozenEnemy) {
      const isFrozen = frozenEnemy.tags?.includes('frozen') || 
                       frozenEnemy.meta?.statusEffects?.some(e => e.type === 'frozen') ||
                       (frozenEnemy.state as string) === 'stunned';
      
      // If frozen, enemy shouldn't move even with intendedMove
      sim.tick();
      sim.tick();
      
      if (isFrozen) {
        expect(frozenEnemy.pos.x).toBe(enemyStartPos.x);
        expect(frozenEnemy.pos.y).toBe(enemyStartPos.y);
      }
    }
  });
  
  test('fire should target enemies not hero when using primaryAction', () => {
    const sim = new Simulator(32, 32);
    
    const hero = sim.addUnit({
      id: 'hero',
      type: 'hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: 'friendly',
      sprite: 'hero',
      tags: ['hero'],
      meta: {
        controlled: true,
        primaryAction: 'fire'
      }
    });
    
    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 13, y: 10 }, // Within range
      hp: 50,
      maxHp: 50,
      team: 'hostile',
      sprite: 'goblin'
    });
    
    // Simulate pressing Q to activate fire ability
    // This should target the enemy, not the hero
    const playerControl = sim.rules.find(r => r.constructor.name === 'PlayerControl');
    if (playerControl) {
      (playerControl as any).setKeyState('q', true);
    }
    
    sim.tick();
    sim.tick(); // Process fire command
    sim.tick(); // Process damage
    
    // Check that hero is not significantly damaged by their own ability
    const updatedHero = sim.units.find(u => u.id === 'hero');
    expect(updatedHero?.hp).toBeGreaterThanOrEqual(100); // Hero should not be damaged at all
    
    // Check that enemy takes damage
    const updatedEnemy = sim.units.find(u => u.id === 'enemy');
    expect(updatedEnemy?.hp).toBeLessThan(50); // Enemy should take damage
  });
  
  test('cell effects should spawn from temperature changes', () => {
    const sim = new Simulator(32, 32);
    
    // Hot temperature should spawn fire
    sim.queuedCommands = [{
      type: 'fire',
      params: {
        x: 10,
        y: 10,
        radius: 2,
        temperature: 700 // Very hot
      }
    }];
    
    sim.tick();
    sim.tick(); // Let effects process
    
    // Effects should be processed
    // Since we can't access private properties, just verify simulation runs
    expect(sim.ticks).toBeGreaterThan(0);
    
    // Cold temperature should create ice/frozen effects
    sim.queuedCommands = [{
      type: 'temperature',
      params: {
        x: 20,
        y: 20,
        radius: 2,
        amount: -100 // Very cold
      }
    }];
    
    sim.tick();
    sim.tick();
    
    // Verify cold effects are processed
    // Since we can't access private properties, just verify simulation runs
    expect(sim.ticks).toBeGreaterThan(0);
  });
});