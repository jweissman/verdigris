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
    
    // Advance 4 ticks (half of 8-tick breathing cycle)
    for (let i = 0; i < 4; i++) {
      rig.update(1);
    }
    
    // Get final state
    const torsoFinal = rig.getPartByName('torso');
    const finalY = torsoFinal?.offset.y || 0;
    const finalFrame = torsoFinal?.frame || 0;
    
    // console.log('After 4 ticks:', { y: finalY, frame: finalFrame });
    
    // At tick 4 (half cycle), breathAmount = 1 (peak inhale)
    // torso.offset.y = -1 * 1 = -1 (changed to be more subtle)
    expect(finalY).toBe(-1);
    expect(finalFrame).toBe(1); // floor(0.5 * 3) = 1
  });
  
  test('breathing animation completes full cycle', () => {
    const rig = new HeroRig();
    rig.play('breathing');
    
    const positions: number[] = [];
    let totalTicks = 0;
    
    // Record positions at key points in the 8-tick cycle
    const checkpoints = [0, 2, 4, 6, 8];
    
    for (const checkpoint of checkpoints) {
      // Advance to checkpoint
      while (totalTicks < checkpoint) {
        rig.update(1);
        totalTicks++;
      }
      
      const torso = rig.getPartByName('torso');
      positions.push(torso?.offset.y || 0);
    }
    
    // console.log('Positions at 0, 2, 4, 6, 8:', positions);
    
    // Breathing uses cosine wave: -1 * (1 - cos(phase * 2π)) / 2 (changed to be more subtle)
    // At phase 0: -1 * (1 - 1) / 2 = 0
    // At phase 0.25: -1 * (1 - 0) / 2 = -0.5
    // At phase 0.5: -1 * (1 - (-1)) / 2 = -1
    // At phase 0.75: -1 * (1 - 0) / 2 = -0.5
    // At phase 1: -1 * (1 - 1) / 2 = 0
    expect(positions[0]).toBeCloseTo(0, 10); // Start at 0
    expect(positions[1]).toBeCloseTo(-0.5, 10); // Quarter way at tick 2
    expect(positions[2]).toBeCloseTo(-1, 10); // Peak at tick 4
    expect(positions[3]).toBeCloseTo(-0.5, 10); // Three quarters at tick 6
    expect(positions[4]).toBeCloseTo(0, 10); // Back to start at tick 8
  });
});