import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroAnimation } from '../../src/rules/hero_animation';

describe('Hero Rig Rendering Integration', () => {
  test('hero with useRig gets rig parts in meta', () => {
    const sim = new Simulator(20, 20);
    

    sim.rulebook.push(new HeroAnimation());
    

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
    

    const updatedHero = sim.units.find(u => u.id === 'hero_test');
    expect(updatedHero?.meta?.rig).toBeDefined();
    expect(updatedHero?.meta?.rig?.length).toBe(7);
    

    const firstPart = updatedHero?.meta?.rig?.[0];
    expect(firstPart?.sprite).toBeDefined();
    expect(firstPart?.offset).toBeDefined();
    expect(firstPart?.frame).toBeLessThanOrEqual(2); // 0-2 for 3 frames
  });
  
  test('rig animates over time', () => {
    const sim = new Simulator(20, 20);
    sim.rulebook.push(new HeroAnimation());
    
    sim.addUnit({
      id: 'hero_test',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      meta: { useRig: true }
    });
    

    sim.step();
    const hero1 = sim.units.find(u => u.id === 'hero_test');
    const torso1 = hero1?.meta?.rig?.find((p: any) => p.name === 'torso');
    const initialY = torso1?.offset?.y;
    

    for (let i = 0; i < 30; i++) {
      sim.step();
    }
    
    const hero2 = sim.units.find(u => u.id === 'hero_test');
    const torso2 = hero2?.meta?.rig?.find((p: any) => p.name === 'torso');
    const finalY = torso2?.offset?.y;
    

    expect(finalY).toBeLessThan(0);
    expect(Math.abs(finalY || 0)).toBeGreaterThan(0.001); // Some movement
  });
});