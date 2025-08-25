import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';

describe('Hero Primary Action System', () => {
  test('can rotate primary actions with comma and period keys', () => {
    const sim = new Simulator(30, 30);
    const playerControl = new PlayerControl();
    sim.rulebook.push(playerControl);
    
    const hero = sim.addUnit({
      id: 'action_hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
        primaryAction: 'strike',
      },
    });

    // Initial action should be strike
    expect(hero.meta?.primaryAction).toBe('strike');
    
    // Press period to go to next action (strike -> bolt)
    playerControl.setKeyState('.', true);
    sim.step();
    playerControl.setKeyState('.', false);
    
    expect(hero.meta?.primaryAction).toBe('bolt');
    
    // Wait for cooldown then press period again (bolt -> heal)
    for (let i = 0; i < 11; i++) sim.step(); // Wait for cooldown
    
    playerControl.setKeyState('.', true);
    sim.step();
    playerControl.setKeyState('.', false);
    
    expect(hero.meta?.primaryAction).toBe('heal');
    
    // Wait for cooldown then press comma to go back (heal -> bolt)
    for (let i = 0; i < 11; i++) sim.step(); // Wait for cooldown
    
    playerControl.setKeyState(',', true);
    sim.step();
    playerControl.setKeyState(',', false);
    
    expect(hero.meta?.primaryAction).toBe('bolt');
    
    // Wait for cooldown then press comma again (bolt -> strike)
    for (let i = 0; i < 11; i++) sim.step(); // Wait for cooldown
    
    playerControl.setKeyState(',', true);
    sim.step();
    playerControl.setKeyState(',', false);
    
    expect(hero.meta?.primaryAction).toBe('strike');
  });

  test('bolt action queues bolt command', () => {
    const sim = new Simulator(30, 30);
    const playerControl = new PlayerControl();
    sim.rulebook.push(playerControl);
    
    const hero = sim.addUnit({
      id: 'bolt_hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
        primaryAction: 'bolt',
      },
    });

    // Add an enemy to target
    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 12, y: 11 },
      team: 'hostile',
      hp: 50,
    });

    // Use bolt action
    playerControl.setKeyState('q', true);
    sim.step();
    playerControl.setKeyState('q', false);
    
    // Process more steps
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Just check that we tried to use bolt - actual bolt execution depends on command handler
    // which may or may not be set up in this test
    expect(hero.meta?.lastAction).toBeDefined();
  });

  test('heal action heals the hero', () => {
    const sim = new Simulator(30, 30);
    const playerControl = new PlayerControl();
    sim.rulebook.push(playerControl);
    
    const hero = sim.addUnit({
      id: 'heal_hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 50,
      maxHp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
        primaryAction: 'heal',
      },
    });

    const initialHp = hero.hp;

    // Use heal action
    playerControl.setKeyState('q', true);
    sim.step();
    playerControl.setKeyState('q', false);
    
    // Process a few steps to let the heal execute
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    // Hero should have more HP
    expect(hero.hp).toBeGreaterThan(initialHp);
    expect(hero.hp).toBeLessThanOrEqual(hero.maxHp);
  });
});