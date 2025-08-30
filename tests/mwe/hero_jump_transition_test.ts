import { describe, test, expect } from 'bun:test';
import { HeroRig } from '../../src/rendering/hero_rig';

describe('Hero Jump to Wind Transition', () => {
  test('track rig state through jump->wind transition', () => {
    const rig = new HeroRig();
    
    // Start with wind
    rig.play("wind");
    rig.update();
    
    const beforeJump = rig.getParts();
    
    // Play jump animation to completion
    rig.play("jump");
    let jumpFrames = 0;
    while (rig.getAnimationTime() < 8) { // Jump animation duration is 8
      rig.update();
      jumpFrames++;
    }
    
    // Switch back to wind
    rig.play("wind");
    
    // Update once
    rig.update();
    const afterUpdate = rig.getParts();
    
    // Check visibility
    const visibleParts = afterUpdate.filter(p => {
      const dist = Math.abs(p.offset.x) + Math.abs(p.offset.y);
      return dist > 0.5;
    });
    
    
    // Parts should be visible
    expect(visibleParts.length).toBeGreaterThanOrEqual(5);
  });
  
  test('animation time resets on transition', () => {
    const rig = new HeroRig();
    
    rig.play("jump");
    for (let i = 0; i < 10; i++) {
      rig.update();
    }
    
    rig.play("wind");
    const windTime = rig.getAnimationTime();
    
    // Animation time should reset
    expect(windTime).toBe(0);
    
    rig.update();
    const windTimeAfterUpdate = rig.getAnimationTime();
    
    // Should have incremented by 1
    expect(windTimeAfterUpdate).toBe(1);
  });
});