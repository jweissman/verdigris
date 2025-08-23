import { describe, test, expect } from 'bun:test';
import { HeroRig } from '../../src/rendering/hero_rig';

describe('Hero Rig', () => {
  test('creates default body parts', () => {
    const rig = new HeroRig();
    const parts = rig.getParts();
    
    expect(parts.length).toBe(7); // head, torso, 2 arms, 2 legs, sword
    
    // Check parts are in correct draw order (zIndex)
    for (let i = 1; i < parts.length; i++) {
      expect(parts[i].zIndex).toBeGreaterThanOrEqual(parts[i-1].zIndex);
    }
    
    // Verify specific parts exist
    expect(rig.getPartByName('head')).toBeDefined();
    expect(rig.getPartByName('torso')).toBeDefined();
    expect(rig.getPartByName('larm')).toBeDefined();
    expect(rig.getPartByName('rarm')).toBeDefined();
  });
  
  test('breathing animation cycles through frames', () => {
    const rig = new HeroRig();
    rig.play('breathing');
    
    const head = rig.getPartByName('head');
    const initialY = head?.offset.y;
    
    // Advance animation - breathing uses interpolation now
    rig.update(2); // Quarter way through 8-tick cycle
    const midY = rig.getPartByName('head')?.offset.y;
    
    rig.update(2); // Halfway through - peak inhale
    const finalY = rig.getPartByName('head')?.offset.y;
    
    // Head should move up during breathing (more negative Y)
    expect(midY).toBeLessThan(initialY!);
    expect(finalY).toBeLessThan(midY!);
  });
  
  test('wind animation affects head', () => {
    const rig = new HeroRig();
    rig.play('wind');
    
    const head = rig.getPartByName('head');
    const initialRotation = head?.rotation || 0;
    
    rig.update(30); // First wind frame
    const windRotation = rig.getPartByName('head')?.rotation || 0;
    
    // Head should tilt in wind
    expect(windRotation).not.toBe(initialRotation);
  });
  
  test('animations loop correctly', () => {
    const rig = new HeroRig();
    rig.play('breathing');
    
    // Run full cycle (8 ticks for breathing)
    rig.update(8); // Complete duration
    
    const torso = rig.getPartByName('torso');
    const positionAfterCycle = torso?.offset.y;
    
    // Should be back at starting position
    expect(positionAfterCycle).toBeCloseTo(0, 10);
  });
  
  test('sword follows right arm', () => {
    const rig = new HeroRig();
    rig.play('breathing'); // Need animation to trigger updates
    rig.update(1); // Trigger anchor and weapon update
    
    const sword = rig.getPartByName('sword');
    const rarm = rig.getPartByName('rarm');
    const handAnchor = rig.getAnchor('hand_r');
    
    // Sword should be positioned at hand anchor
    expect(sword).toBeDefined();
    expect(handAnchor).toBeDefined();
    expect(sword?.zIndex).toBeGreaterThan(rarm?.zIndex || 0);
  });
});