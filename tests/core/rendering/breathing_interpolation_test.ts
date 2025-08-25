import { describe, test, expect } from 'bun:test';


export function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface BreathingPose {
  chestY: number;
  headY: number;
  armRotation: number;
}

export class BreathingAnimation {
  private time: number = 0;
  private period: number = 60; // 60 ticks for full breath cycle
  

  private inhale: BreathingPose = {
    chestY: -2,  // Chest rises
    headY: -10,  // Head lifts slightly
    armRotation: 0.1  // Arms out slightly
  };
  
  private exhale: BreathingPose = {
    chestY: 0,   // Chest at rest
    headY: -8,   // Head normal
    armRotation: 0  // Arms relaxed
  };
  
  update(deltaTime: number = 1) {
    this.time += deltaTime;
  }
  
  getCurrentPose(): BreathingPose {

    const phase = (this.time % this.period) / this.period;
    const breathAmount = (1 - Math.cos(phase * Math.PI * 2)) / 2; // 0 to 1, starts at 0 (exhale)
    
    return {
      chestY: interpolate(this.exhale.chestY, this.inhale.chestY, breathAmount),
      headY: interpolate(this.exhale.headY, this.inhale.headY, breathAmount),
      armRotation: interpolate(this.exhale.armRotation, this.inhale.armRotation, breathAmount)
    };
  }
}

describe('Breathing Interpolation', () => {
  test('interpolates between two values', () => {
    expect(interpolate(0, 10, 0)).toBe(0);
    expect(interpolate(0, 10, 0.5)).toBe(5);
    expect(interpolate(0, 10, 1)).toBe(10);
  });
  
  test('breathing animation starts at exhale', () => {
    const anim = new BreathingAnimation();
    const pose = anim.getCurrentPose();
    

    expect(pose.chestY).toBeCloseTo(0, 1);
    expect(pose.headY).toBeCloseTo(-8, 1);
    expect(pose.armRotation).toBeCloseTo(0, 1);
  });
  
  test('breathing animation reaches inhale midway', () => {
    const anim = new BreathingAnimation();
    anim.update(30); // Half cycle - peak inhale
    
    const pose = anim.getCurrentPose();
    

    expect(pose.chestY).toBeCloseTo(-2, 1);
    expect(pose.headY).toBeCloseTo(-10, 1);
    expect(pose.armRotation).toBeCloseTo(0.1, 1);
  });
  
  test('breathing animation returns to exhale', () => {
    const anim = new BreathingAnimation();
    anim.update(60); // Full cycle
    
    const pose = anim.getCurrentPose();
    

    expect(pose.chestY).toBeCloseTo(0, 1);
    expect(pose.headY).toBeCloseTo(-8, 1);
    expect(pose.armRotation).toBeCloseTo(0, 1);
  });
  
  test('breathing animation loops smoothly', () => {
    const anim = new BreathingAnimation();
    
    const startPose = anim.getCurrentPose();
    anim.update(60); // Full cycle
    const endPose = anim.getCurrentPose();
    

    expect(endPose.chestY).toBeCloseTo(startPose.chestY, 1);
    expect(endPose.headY).toBeCloseTo(startPose.headY, 1);
    expect(endPose.armRotation).toBeCloseTo(startPose.armRotation, 1);
  });
});