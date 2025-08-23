import { describe, test, expect } from 'bun:test';
import { HeroRig } from '../../src/rendering/hero_rig';

describe('Hero Rig Breathing', () => {
  test('breathing animation changes torso over time', () => {
    const rig = new HeroRig();
    rig.play('breathing');
    
    // Get initial state
    const torsoInitial = rig.getPartByName('torso');
    const initialY = torsoInitial?.offset.y || 0;
    const initialFrame = torsoInitial?.frame || 0;
    
    // console.log('Start:', { y: initialY, frame: initialFrame });
    
    // Advance 30 ticks (half breathing cycle)
    for (let i = 0; i < 30; i++) {
      rig.update(1);
    }
    
    // Get final state
    const torsoFinal = rig.getPartByName('torso');
    const finalY = torsoFinal?.offset.y || 0;
    const finalFrame = torsoFinal?.frame || 0;
    
    // console.log('After 30 ticks:', { y: finalY, frame: finalFrame });
    
    // At tick 30, phase = 0.5, breathAmount = 1 (peak inhale)
    // torso.offset.y should be -3 (rounded)
    expect(finalY).toBe(-3);
    expect(finalFrame).toBe(0); // floor(1 * 3) % 3 = 0
  });
  
  test('breathing animation completes full cycle', () => {
    const rig = new HeroRig();
    rig.play('breathing');
    
    const positions: number[] = [];
    let totalTicks = 0;
    
    // Record positions at key points in the cycle
    const checkpoints = [0, 15, 30, 45, 60];
    
    for (const checkpoint of checkpoints) {
      // Advance to checkpoint
      while (totalTicks < checkpoint) {
        rig.update(1);
        totalTicks++;
      }
      
      const torso = rig.getPartByName('torso');
      positions.push(torso?.offset.y || 0);
    }
    
    // console.log('Positions at 0, 15, 30, 45, 60:', positions);
    
    // Should see rise and fall (Math.round(-1.5) = -1 in JS)
    expect(positions[0]).toBe(0); // Start at 0
    expect(positions[1]).toBe(-1); // Quarter way at 15 (round(-1.5) = -1)
    expect(positions[2]).toBe(-3); // Peak at 30  
    expect(positions[3]).toBe(-2); // Three quarters at 45
    expect(positions[4]).toBe(0); // Back to start at 60
  });
});