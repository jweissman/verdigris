import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { Jumping } from '../../src/rules/jumping';
import { HeroAnimation } from '../../src/rules/hero_animation';

describe('Hero Position After Jump', () => {
  test('hero position should be correct after jump completes', () => {
    const sim = new Simulator(32, 32);
    
    // Add hero at known position - use same pattern as working test
    const hero = sim.addUnit({
      id: 'hero',
      type: 'hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: 'friendly',
      sprite: 'hero',
      state: 'idle'
    });
    
    expect(hero.pos.x).toBe(10);
    expect(hero.pos.y).toBe(10);
    
    // Queue jump command - exact same format as working test
    sim.queuedCommands = [{
      type: 'jump',
      params: { targetX: 15, targetY: 10, height: 5 },
      unitId: hero.id
    }];
    
    // Check position immediately after jump starts
    sim.tick();

    
    // Run through jump animation (10 ticks)
    for (let i = 0; i < 10; i++) {
      sim.tick();

    }
    

    // Hero should be at target position
    expect(hero.pos.x).toBeCloseTo(15, 1);
    expect(hero.pos.y).toBe(10);
    expect(hero.meta?.jumping).toBe(false);
    expect(hero.meta?.z).toBe(0);
  });
  
  test('hero position should not become negative after jump', () => {
    const sim = new Simulator(32, 32);
    
    // Add hero - same pattern as above
    const hero = sim.addUnit({
      id: 'hero',
      type: 'hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: 'friendly',
      sprite: 'hero',
      state: 'idle'
    });
    
    // Jump to the left - use assignment like working test
    sim.queuedCommands = [{
      type: 'jump',
      params: { targetX: 5, targetY: 10, height: 5 },
      unitId: hero.id
    }];
    
    // Run jump
    for (let i = 0; i < 15; i++) {
      sim.tick();
    }
    
    // Position should never go negative unless intended
    expect(hero.pos.x).toBeGreaterThanOrEqual(0);
    expect(hero.pos.y).toBeGreaterThanOrEqual(0);
    
    // Should be at target
    expect(hero.pos.x).toBeCloseTo(5, 1);
  });
});