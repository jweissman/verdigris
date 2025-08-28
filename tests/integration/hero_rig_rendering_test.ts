import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroAnimationManager } from '../../src/rendering/hero_animation_manager';

describe('Hero Rig Rendering Integration', () => {
  test('hero with useRig gets rig parts from animation manager', () => {
    const sim = new Simulator(20, 20);
    const animationManager = new HeroAnimationManager();
    

    const hero = sim.addUnit({
      id: 'hero_test',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      sprite: 'champion',
      meta: {
        useRig: true,
        onRooftop: true
      }
    });
    

    sim.step();
    animationManager.update(sim.units, sim.ticks);
    

    const rigData = animationManager.getRigData('hero_test');
    expect(rigData).toBeDefined();
    expect(rigData?.length).toBe(7);
    

    const firstPart = rigData?.[0];
    expect(firstPart?.sprite).toBeDefined();
    expect(firstPart?.offset).toBeDefined();
    expect(firstPart?.frame).toBeLessThanOrEqual(2); // 0-2 for 3 frames
  });
  
  test('rig animates over time', () => {
    const sim = new Simulator(20, 20);
    const animationManager = new HeroAnimationManager();
    sim.addUnit({
      id: 'hero_test',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      meta: { useRig: true }
    });
    

    sim.step();
    animationManager.update(sim.units, sim.ticks);
    
    const rigData1 = animationManager.getRigData('hero_test');
    const torso1 = rigData1?.find((p: any) => p.name === 'torso');
    const initialY = torso1?.offset?.y;
    

    for (let i = 0; i < 30; i++) {
      sim.step();
      animationManager.update(sim.units, sim.ticks);
    }
    
    const rigData2 = animationManager.getRigData('hero_test');
    const torso2 = rigData2?.find((p: any) => p.name === 'torso');
    const finalY = torso2?.offset?.y;
    

    expect(finalY).toBeLessThan(0);
    expect(Math.abs(finalY || 0)).toBeGreaterThan(0.001); // Some movement
  });
});