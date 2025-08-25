import { describe, test, expect } from 'bun:test';
import { HeroRig } from '../../../src/rendering/hero_rig';

describe('Hero Rig Breathing', () => {
  test('breathing animation changes torso over time', () => {
    const rig = new HeroRig();
    rig.play('breathing');
    

    const torsoInitial = rig.getPartByName('torso');
    const initialY = torsoInitial?.offset.y || 0;
    const initialFrame = torsoInitial?.frame || 0;
    

    

    for (let i = 0; i < 4; i++) {
      rig.update(1);
    }
    

    const torsoFinal = rig.getPartByName('torso');
    const finalY = torsoFinal?.offset.y || 0;
    const finalFrame = torsoFinal?.frame || 0;
    

    


    expect(finalY).toBe(-1);
    expect(finalFrame).toBe(1);
  });
  
  test('breathing animation completes full cycle', () => {
    const rig = new HeroRig();
    rig.play('breathing');
    
    const positions: number[] = [];
    let totalTicks = 0;
    

    const checkpoints = [0, 2, 4, 6, 8];
    
    for (const checkpoint of checkpoints) {

      while (totalTicks < checkpoint) {
        rig.update(1);
        totalTicks++;
      }
      
      const torso = rig.getPartByName('torso');
      positions.push(torso?.offset.y || 0);
    }
    

    






    expect(positions[0]).toBeCloseTo(0, 10); // Start at 0
    expect(positions[1]).toBeCloseTo(-0.5, 10); // Quarter way at tick 2
    expect(positions[2]).toBeCloseTo(-1, 10); // Peak at tick 4
    expect(positions[3]).toBeCloseTo(-0.5, 10); // Three quarters at tick 6
    expect(positions[4]).toBeCloseTo(0, 10); // Back to start at tick 8
  });
});