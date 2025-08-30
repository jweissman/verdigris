import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroRig } from '../../src/rendering/hero_rig';

describe('Hero Idle After Movement Bug', () => {
  test('rig parts should have non-zero offsets when idle after movement', () => {
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
    
    // Initial idle state
    sim.step();
    let currentHero = sim.units.find(u => u.id === 'hero1');
    const initialRig = currentHero?.meta?.rig;
    expect(initialRig).toBeDefined();
    
    // Check initial rig has visible parts
    let hasVisibleParts = false;
    if (Array.isArray(initialRig)) {
      for (const part of initialRig) {
        if (part.offset && (Math.abs(part.offset.x) > 0.1 || Math.abs(part.offset.y) > 0.1)) {
          hasVisibleParts = true;
          break;
        }
      }
    }
    expect(hasVisibleParts).toBe(true);
    console.log('Initial idle - has visible parts:', hasVisibleParts);
    
    // Queue movement
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero1',
      params: {
        x: 12,
        y: 10
      }
    });
    
    // Move for several ticks
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    currentHero = sim.units.find(u => u.id === 'hero1');
    expect(currentHero?.pos.x).toBeGreaterThan(10);
    
    // Now hero should be idle at new position
    // Continue stepping while idle
    for (let i = 0; i < 5; i++) {
      sim.step();
      currentHero = sim.units.find(u => u.id === 'hero1');
      const idleRig = currentHero?.meta?.rig;
      
      // Check rig still has visible parts
      let idleHasVisibleParts = false;
      let allPartsAtOrigin = true;
      
      if (Array.isArray(idleRig)) {
        console.log(`Idle tick ${i+1} - rig parts count:`, idleRig.length);
        for (const part of idleRig) {
          if (part.offset) {
            const distFromOrigin = Math.abs(part.offset.x) + Math.abs(part.offset.y);
            if (distFromOrigin > 0.1) {
              idleHasVisibleParts = true;
              allPartsAtOrigin = false;
            }
            // Log suspicious parts
            if (distFromOrigin < 0.1 && part.name !== 'torso') {
              console.log(`  Part ${part.name} too close to origin:`, part.offset);
            }
          }
        }
      }
      
      expect(idleHasVisibleParts).toBe(true);
      if (!idleHasVisibleParts) {
        console.log('ERROR: All parts collapsed to origin on idle after move!');
        console.log('Rig data:', JSON.stringify(idleRig, null, 2));
      }
    }
  });
  
  test('hero animation state should be correct after movement stops', () => {
    const sim = new Simulator(40, 40);
    
    // Create a mock rig to track animation states
    const rig = new HeroRig();
    const animationHistory: string[] = [];
    const originalPlay = rig.play.bind(rig);
    rig.play = function(animationName: string) {
      animationHistory.push(animationName);
      return originalPlay(animationName);
    };
    
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
        onRooftop: true,
        facing: 'right'
      }
    });
    
    // Initial state should be wind (since onRooftop)
    sim.step();
    
    // Start movement
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero2',
      params: {
        x: 15,
        y: 10
      }
    });
    
    // Move for several steps
    for (let i = 0; i < 10; i++) {
      sim.step();
      const hero = sim.units.find(u => u.id === 'hero2');
      const isMoving = hero?.intendedMove?.x !== 0 || hero?.intendedMove?.y !== 0;
      console.log(`Step ${i+1}: pos=(${hero?.pos.x}, ${hero?.pos.y}), moving=${isMoving}`);
    }
    
    // Continue while idle
    for (let i = 0; i < 5; i++) {
      sim.step();
      const hero = sim.units.find(u => u.id === 'hero2');
      const isMoving = hero?.intendedMove?.x !== 0 || hero?.intendedMove?.y !== 0;
      console.log(`Idle step ${i+1}: moving=${isMoving}, state=${hero?.state}`);
      expect(isMoving).toBe(false);
    }
  });
});