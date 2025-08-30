import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';

describe('Hero Fire and Freeze Abilities', () => {
  test('fire ability should increase temperature at target location', () => {
    const sim = new Simulator(30, 30);
    const playerControl = sim.rules.find(r => r.constructor === PlayerControl) as PlayerControl;

    const hero = sim.addUnit({
      id: 'fire_hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      maxHp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
        primaryAction: 'fire',
      },
    });

    // Add an enemy to target
    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 13, y: 10 },
      team: 'hostile',
      hp: 50,
      maxHp: 50,
    });

    // Record initial temperature at enemy position
    const initialTemp = (sim as any).fieldManager?.temperatureField?.get(enemy.pos.x, enemy.pos.y) || 20;
    
    // Use fire action
    playerControl.setKeyState('q', true);
    sim.step();
    playerControl.setKeyState('q', false);
    
    // Process a few steps to let fire execute
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    // Temperature at enemy position should increase
    const finalTemp = (sim as any).fieldManager?.temperatureField?.get(enemy.pos.x, enemy.pos.y) || 20;
    expect(finalTemp).toBeGreaterThan(initialTemp);
    
    // Hero should NOT be damaged by their own fire
    expect(hero.hp).toBe(100);
    
    // Enemy should take damage
    expect(enemy.hp).toBeLessThan(50);
  });

  test('fire ability should not damage the hero', () => {
    const sim = new Simulator(30, 30);
    const playerControl = sim.rules.find(r => r.constructor === PlayerControl) as PlayerControl;

    const hero = sim.addUnit({
      id: 'fire_hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      maxHp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
        primaryAction: 'fire',
      },
    });

    // No enemies, fire will be at hero position
    playerControl.setKeyState('q', true);
    sim.step();
    playerControl.setKeyState('q', false);
    
    // Process many steps to ensure any damage would be applied
    for (let i = 0; i < 20; i++) {
      sim.step();
    }
    
    // Hero should still have full health
    expect(hero.hp).toBe(100);
  });

  test('freeze ability should apply frozen status to enemy', () => {
    const sim = new Simulator(30, 30);
    const playerControl = sim.rules.find(r => r.constructor === PlayerControl) as PlayerControl;

    const hero = sim.addUnit({
      id: 'freeze_hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      maxHp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
        primaryAction: 'freeze',
      },
    });

    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 12, y: 10 },
      team: 'hostile',
      hp: 50,
      maxHp: 50,
      meta: {}
    });

    // Use freeze action
    playerControl.setKeyState('q', true);
    sim.step();
    playerControl.setKeyState('q', false);
    
    // Process more steps to ensure commands are executed
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Enemy should have frozen status effect
    const frozenEffect = enemy.meta?.statusEffects?.find((e: any) => e.type === 'frozen');
    expect(frozenEffect).toBeDefined();
    
    // Enemy should be stunned/frozen
    expect(enemy.meta?.frozen).toBe(true);
    expect(enemy.meta?.stunned).toBe(true);
  });

  test('freeze ability should stop enemy movement', () => {
    const sim = new Simulator(30, 30);
    const playerControl = sim.rules.find(r => r.constructor === PlayerControl) as PlayerControl;

    const hero = sim.addUnit({
      id: 'freeze_hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      maxHp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
        primaryAction: 'freeze',
      },
    });

    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 12, y: 10 },
      team: 'hostile',
      hp: 50,
      maxHp: 50,
      intendedMove: { x: -1, y: 0 }, // Enemy wants to move left
    });

    const initialEnemyX = enemy.pos.x;
    
    // Use freeze action
    playerControl.setKeyState('q', true);
    sim.step();
    playerControl.setKeyState('q', false);
    
    // Process many steps - enemy should not move while frozen
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Enemy should not have moved
    expect(enemy.pos.x).toBe(initialEnemyX);
  });

  test('temperature field should trigger cell effects', () => {
    const sim = new Simulator(30, 30);
    const playerControl = sim.rules.find(r => r.constructor === PlayerControl) as PlayerControl;

    const hero = sim.addUnit({
      id: 'fire_hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      maxHp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
        primaryAction: 'fire',
      },
    });

    // Add enemy to target
    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 13, y: 10 },
      team: 'hostile',
      hp: 50,
    });

    // Use fire action
    playerControl.setKeyState('q', true);
    sim.step();
    playerControl.setKeyState('q', false);
    
    // Process steps
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    // Check that particles were created (fire effects)
    const particles = (sim as any).particleManager?.particles || [];
    const fireParticles = particles.filter((p: any) => 
      p.type === 'fire' || p.type === 'ember' || p.type === 'smoke'
    );
    
    expect(fireParticles.length).toBeGreaterThan(0);
  });

  test('freeze creates visual ice effects', () => {
    const sim = new Simulator(30, 30);
    const playerControl = sim.rules.find(r => r.constructor === PlayerControl) as PlayerControl;

    const hero = sim.addUnit({
      id: 'freeze_hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      maxHp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
        primaryAction: 'freeze',
      },
    });

    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 12, y: 10 },
      team: 'hostile',
      hp: 50,
    });

    // Use freeze action
    playerControl.setKeyState('q', true);
    sim.step();
    playerControl.setKeyState('q', false);
    
    // Process steps
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    // Temperature at enemy position should be cold
    const temp = (sim as any).fieldManager?.temperatureField?.get(enemy.pos.x, enemy.pos.y) || 20;
    expect(temp).toBeLessThan(0);
    
    // Verify freeze happened without checking internal implementation
    expect(sim.ticks).toBeGreaterThan(0);
    
    // Enemy should be affected by freeze
    expect(enemy.meta?.frozen || enemy.meta?.stunned).toBeTruthy();
  });

  test('fire targets nearest enemy, not hero', () => {
    const sim = new Simulator(30, 30);
    const playerControl = sim.rules.find(r => r.constructor === PlayerControl) as PlayerControl;

    const hero = sim.addUnit({
      id: 'fire_hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      maxHp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
        primaryAction: 'fire',
      },
    });

    // Add multiple enemies
    const nearEnemy = sim.addUnit({
      id: 'near_enemy',
      pos: { x: 12, y: 10 },
      team: 'hostile',
      hp: 50,
    });

    const farEnemy = sim.addUnit({
      id: 'far_enemy',
      pos: { x: 20, y: 10 },
      team: 'hostile',
      hp: 50,
    });

    // Use fire action
    playerControl.setKeyState('q', true);
    sim.step();
    playerControl.setKeyState('q', false);
    
    // Process steps
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Near enemy should take damage
    expect(nearEnemy.hp).toBeLessThan(50);
    
    // Far enemy should not take damage
    expect(farEnemy.hp).toBe(50);
    
    // Hero should not take damage
    expect(hero.hp).toBe(100);
  });
});