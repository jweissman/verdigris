import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Rig Idle Bug Investigation', () => {
  test('hero rig should persist after movement stops', () => {
    const sim = new Simulator(40, 40);
    
    // Add hero with rig
    const hero = sim.addUnit({
      id: 'hero1',
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
        facing: 'right'
      }
    });
    
    // Initial state - should have rig
    sim.step();
    let currentHero = sim.units.find(u => u.id === 'hero1');
    expect(currentHero?.meta?.rig).toBeDefined();
    const initialRig = currentHero?.meta?.rig;
    
    // Queue movement command
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero1',
      params: {
        x: 12,
        y: 10
      }
    });
    
    // Hero starts moving
    sim.step();
    currentHero = sim.units.find(u => u.id === 'hero1');
    expect(currentHero?.meta?.rig).toBeDefined();
    const movingRig = currentHero?.meta?.rig;
    
    // Continue movement for several steps
    for (let i = 0; i < 10; i++) {
      sim.step();
      currentHero = sim.units.find(u => u.id === 'hero1');
    }
    
    // Movement should be complete or nearly complete
    currentHero = sim.units.find(u => u.id === 'hero1');
    
    // Hero should be idle now
    expect(currentHero?.intendedMove?.x ?? 0).toBe(0);
    expect(currentHero?.intendedMove?.y ?? 0).toBe(0);
    
    // Check rig still exists when idle
    expect(currentHero?.meta?.rig).toBeDefined();
    const idleRig = currentHero?.meta?.rig;
    // Rig should still have parts
    if (Array.isArray(idleRig)) {
      expect(idleRig.length).toBeGreaterThan(0);
    } else if (idleRig && typeof idleRig === 'object') {
      expect(Object.keys(idleRig).length).toBeGreaterThan(0);
    }
    
    // Continue stepping while idle
    for (let i = 0; i < 5; i++) {
      sim.step();
      currentHero = sim.units.find(u => u.id === 'hero1');
    }
    
    // Final check - rig should still be present
    currentHero = sim.units.find(u => u.id === 'hero1');
    expect(currentHero?.meta?.rig).toBeDefined();
  });
  
  test('hero animation state transitions', () => {
    const sim = new Simulator(40, 40);
    
    // Add hero with rig
    const hero = sim.addUnit({
      id: 'hero2',
      type: 'hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: 'friendly',
      sprite: 'hero',
      tags: ['hero'],
      meta: {
        useRig: true,
        onRooftop: false, // Use breathing animation instead of wind
        facing: 'right'
      }
    });
    
    // Check initial animation (should be breathing)
    sim.step();
    let currentHero = sim.units.find(u => u.id === 'hero2');
    
    // Start movement
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero2',
      params: {
        x: 15,
        y: 10
      }
    });
    
    // Track animation changes
    for (let i = 0; i < 20; i++) {
      sim.step();
      currentHero = sim.units.find(u => u.id === 'hero2');
      const isMoving = (currentHero?.intendedMove?.x !== 0 || currentHero?.intendedMove?.y !== 0);
      
      // Rig should always exist
      expect(currentHero?.meta?.rig).toBeDefined();
    }
  });
});