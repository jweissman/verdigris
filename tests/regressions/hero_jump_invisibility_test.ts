import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Regression: Hero Invisibility After Jump', () => {
  test('hero should not render at x=0 when smoothX is set to null', () => {
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
        useRig: true,
        onRooftop: true,
      }
    });
    
    // Jump
    sim.queuedCommands = [{
      type: 'jump',
      params: { targetX: 15, targetY: 10 },
      unitId: hero.id
    }];
    
    // Process jump
    for (let i = 0; i < 12; i++) {
      sim.tick();
    }
    
    // After jump, check that smoothX is properly cleared
    expect(hero.meta?.smoothX).toBeNil();
    expect(hero.meta?.smoothY).toBeNil();
    expect(hero.meta?.jumping).toBe(false);
    
    // Hero should be at target position
    expect(hero.pos.x).toBe(15);
    expect(hero.pos.y).toBe(10);
    
    // Simulate what isometric view does
    let renderX = hero.pos.x;
    let renderY = hero.pos.y;
    
    // This was the bug: checking !== undefined but not !== null
    if (hero.meta?.smoothX !== undefined && hero.meta?.smoothX !== null) {
      renderX = hero.meta.smoothX;
    }
    if (hero.meta?.smoothY !== undefined && hero.meta?.smoothY !== null) {
      renderY = hero.meta.smoothY;
    }
    
    // renderX should still be the hero's actual position, not 0 or null
    expect(renderX).toBe(15);
    expect(renderY).toBe(10);
  });
  
  test('isometric view should handle null smoothX/smoothY correctly', () => {
    // Direct test of the bug condition
    const unit = {
      pos: { x: 16, y: 10 },
      meta: {
        smoothX: null as number | null | undefined,
        smoothY: null as number | null | undefined,
      }
    };
    
    let renderX = unit.pos.x;
    let renderY = unit.pos.y;
    
    // Bug: This would set renderX to null
    if (unit.meta?.smoothX !== undefined) {
      renderX = unit.meta.smoothX as any;
    }
    
    // This would make renderX = null = 0 when converted to number
    expect(renderX).toBeNull();
    
    // Fixed version:
    renderX = unit.pos.x;
    if (unit.meta?.smoothX !== undefined && unit.meta?.smoothX !== null) {
      renderX = unit.meta.smoothX;
    }
    
    // Now renderX stays as the unit's position
    expect(renderX).toBe(16);
  });
});