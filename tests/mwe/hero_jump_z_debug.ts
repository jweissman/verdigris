import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Jump Z Debug', () => {
  test('trace Z values during jump step by step', () => {
    const sim = new Simulator(40, 40);
    
    const hero = sim.addUnit({
      id: 'z_debug_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    
    console.log('=== Z-AXIS DEBUG ===');
    console.log('Before jump:', { 
      pos: hero.pos, 
      metaZ: hero.meta?.z, 
      jumping: hero.meta?.jumping 
    });
    
    // Queue jump
    sim.queuedCommands.push({
      type: 'jump',
      unitId: 'z_debug_hero',
      params: { distance: 3, height: 5 }
    });
    
    // Step through jump
    for (let step = 0; step < 20; step++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'z_debug_hero');
      
      console.log(`Step ${step}:`, {
        pos: { x: h?.pos.x.toFixed(2), y: h?.pos.y },
        metaZ: h?.meta?.z?.toFixed(2),
        jumping: h?.meta?.jumping,
        progress: h?.meta?.jumpProgress
      });
      
      // Break when jump completes
      if (!h?.meta?.jumping && step > 5) {
        console.log(`Jump completed at step ${step}`);
        break;
      }
    }
    
    // Verify jump worked
    const final = sim.units.find(u => u.id === 'z_debug_hero');
    expect(final?.meta?.jumping).toBe(false);
    expect(final?.pos.x).not.toBe(10); // Should have moved
  });
});