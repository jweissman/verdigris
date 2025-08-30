import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';

describe('Hero MWE Regression Tests', () => {
  test('hero MWE should not crash when using abilities', () => {
    const sim = new Simulator(30, 30);
    const playerControl = sim.rules.find(r => r instanceof PlayerControl) as PlayerControl;
    
    const hero = sim.addUnit({
      id: 'hero',
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
    
    // Add some enemies
    for (let i = 0; i < 3; i++) {
      sim.addUnit({
        id: `enemy_${i}`,
        pos: { x: 12 + i * 2, y: 10 },
        team: 'hostile',
        hp: 50,
      });
    }
    
    // Test fire ability - should not crash
    expect(() => {
      playerControl.setKeyState('q', true);
      sim.step();
      playerControl.setKeyState('q', false);
    }).not.toThrow();
    
    // Switch to freeze
    hero.meta.primaryAction = 'freeze';
    
    // Test freeze ability - should not crash
    expect(() => {
      playerControl.setKeyState('q', true);
      sim.step();
      playerControl.setKeyState('q', false);
    }).not.toThrow();
    
    // Switch to strike
    hero.meta.primaryAction = 'strike';
    
    // Test strike ability - should not crash
    expect(() => {
      playerControl.setKeyState('q', true);
      sim.step();
      playerControl.setKeyState('q', false);
    }).not.toThrow();
  });
  
  test('player control should handle all primary actions without errors', () => {
    const sim = new Simulator(30, 30);
    const playerControl = sim.rules.find(r => r instanceof PlayerControl) as PlayerControl;
    
    const hero = sim.addUnit({
      id: 'hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      maxHp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
      },
    });
    
    const actions = ['strike', 'bolt', 'heal', 'freeze', 'fire'];
    
    for (const action of actions) {
      hero.meta.primaryAction = action;
      
      // Should not throw any errors
      expect(() => {
        playerControl.setKeyState('q', true);
        sim.step();
        playerControl.setKeyState('q', false);
        sim.step();
      }).not.toThrow();
    }
  });
  
  test('freeze should work with no enemies', () => {
    const sim = new Simulator(30, 30);
    const playerControl = sim.rules.find(r => r instanceof PlayerControl) as PlayerControl;
    
    const hero = sim.addUnit({
      id: 'hero',
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
    
    // Should not crash even with no enemies
    expect(() => {
      playerControl.setKeyState('q', true);
      sim.step();
      playerControl.setKeyState('q', false);
      sim.step();
    }).not.toThrow();
  });
  
  test('fire should work with no enemies', () => {
    const sim = new Simulator(30, 30);
    const playerControl = sim.rules.find(r => r instanceof PlayerControl) as PlayerControl;
    
    const hero = sim.addUnit({
      id: 'hero',
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
    
    // Should not crash even with no enemies
    expect(() => {
      playerControl.setKeyState('q', true);
      sim.step();
      playerControl.setKeyState('q', false);
      sim.step();
    }).not.toThrow();
  });
});