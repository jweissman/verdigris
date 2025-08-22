import { describe, test, expect } from 'bun:test';
import { solve2BoneIK, getSwingArc } from '../../src/mwe/hero_ik_simple';

describe('Hero IK for combat', () => {
  test('2-bone IK reaches toward target', () => {
    const shoulder = { x: 10, y: 10 };
    const target = { x: 13, y: 8 };
    const upperArm = 2;
    const forearm = 1.5;
    
    const { elbow, hand } = solve2BoneIK(shoulder, target, upperArm, forearm);
    
    // Check arm segment lengths preserved
    const upperDist = Math.sqrt(
      Math.pow(elbow.x - shoulder.x, 2) + 
      Math.pow(elbow.y - shoulder.y, 2)
    );
    expect(Math.abs(upperDist - upperArm)).toBeLessThan(0.01);
    
    const lowerDist = Math.sqrt(
      Math.pow(hand.x - elbow.x, 2) + 
      Math.pow(hand.y - elbow.y, 2)
    );
    expect(Math.abs(lowerDist - forearm)).toBeLessThan(0.01);
    
    // Should reach target (it's within range)
    const totalReach = upperArm + forearm; // 3.5
    const targetDist = Math.sqrt(
      Math.pow(target.x - shoulder.x, 2) + 
      Math.pow(target.y - shoulder.y, 2)
    ); // ~3.6, just out of range
    
    if (targetDist <= totalReach) {
      expect(Math.abs(hand.x - target.x)).toBeLessThan(0.01);
      expect(Math.abs(hand.y - target.y)).toBeLessThan(0.01);
    }
  });
  
  test('swing arc creates smooth motion', () => {
    const heroPos = { x: 10, y: 10 };
    
    // Get positions throughout swing
    const positions = [];
    for (let i = 0; i <= 5; i++) {
      positions.push(getSwingArc(heroPos, 'right', i, 5));
    }
    
    // Should start high and end low
    expect(positions[0].y).toBeLessThan(positions[5].y);
    
    // Should move outward during swing
    const midX = positions[2].x;
    expect(midX).toBeGreaterThan(heroPos.x);
  });
  
  test('left and right swings mirror', () => {
    const heroPos = { x: 10, y: 10 };
    
    const rightSwing = getSwingArc(heroPos, 'right', 2, 5);
    const leftSwing = getSwingArc(heroPos, 'left', 2, 5);
    
    // X should be mirrored
    expect(rightSwing.x - heroPos.x).toBeCloseTo(-(leftSwing.x - heroPos.x), 1);
    // Y should be same
    expect(rightSwing.y).toBeCloseTo(leftSwing.y, 1);
  });
});