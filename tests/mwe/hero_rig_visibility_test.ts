import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroRig } from '../../src/rendering/hero_rig';

describe('Hero Rig Visibility After Movement', () => {
  test('all rig parts should remain visible after transitioning from walk to wind', () => {
    const rig = new HeroRig();
    
    // Start with wind animation (idle on rooftop)
    rig.play("wind");
    rig.update();
    
    const initialParts = rig.getParts();
    
    // Check all parts are reasonably positioned initially
    const initialVisibleParts = initialParts.filter(p => {
      const dist = Math.abs(p.offset.x) + Math.abs(p.offset.y);
      return dist > 0.5; // Should be away from origin
    });
    
    // Switch to walk
    rig.play("walk");
    for (let i = 0; i < 10; i++) {
      rig.update();
    }
    
    const walkParts = rig.getParts();

    // Switch back to wind (this is where the bug happens)
    rig.play("wind");
    rig.update();
    
    const afterParts = rig.getParts();
    
    // Check parts are still visible
    const visibleAfter = afterParts.filter(p => {
      const dist = Math.abs(p.offset.x) + Math.abs(p.offset.y);
      return dist > 0.5;
    });
    
    // The bug: parts collapse to near-origin after walk->wind transition
    expect(visibleAfter.length).toBeGreaterThanOrEqual(5); // At least head, arms, legs visible
    
    // Check specific parts that should be visible
    const head = afterParts.find(p => p.name === 'head');
    const torso = afterParts.find(p => p.name === 'torso');
    const larm = afterParts.find(p => p.name === 'larm');
    const rarm = afterParts.find(p => p.name === 'rarm');
    
    // Head should be up high
    expect(Math.abs(head!.offset.y)).toBeGreaterThan(5);
    
    // Arms should be out to sides
    expect(Math.abs(larm!.offset.x)).toBeGreaterThan(3);
    expect(Math.abs(rarm!.offset.x)).toBeGreaterThan(3);
  });
  
  test('parts should maintain reasonable offsets throughout animation cycle', () => {
    const rig = new HeroRig();
    
    // Simulate the actual game flow
    rig.play("wind");
    
    // Update for a bit
    for (let i = 0; i < 5; i++) {
      rig.update();
    }
    
    // Move
    rig.play("walk");
    for (let i = 0; i < 20; i++) {
      rig.update();
    }
    
    // Stop and go back to idle
    rig.play("wind");
    
    // This is where parts might disappear
    for (let i = 0; i < 10; i++) {
      rig.update();
      const parts = rig.getParts();
      
      // Count how many parts are essentially at origin
      const collapsedParts = parts.filter(p => {
        const dist = Math.abs(p.offset.x) + Math.abs(p.offset.y);
        return dist < 1.0; // Very close to origin
      });
      
      
      // Should never have most parts collapsed
      expect(collapsedParts.length).toBeLessThanOrEqual(2);
    }
  });
});