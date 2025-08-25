import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import { HeroAnimation } from '../../../src/rules/hero_animation';

describe('Hero Animation Rule', () => {
  test('adds rig to units with useRig flag', () => {
    const sim = new Simulator(20, 20);
    const rule = new HeroAnimation();
    

    const hero = sim.addUnit({
      id: 'hero1',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      meta: {
        useRig: true
      }
    });
    

    const context = sim.getTickContext();
    const commands = rule.execute(context);
    

    const metaCommand = commands.find(c => 
      c.type === 'meta' && c.params?.unitId === 'hero1'
    );
    
    expect(metaCommand).toBeDefined();
    expect(metaCommand?.params?.meta?.rig).toBeDefined();
    expect(metaCommand?.params?.meta?.rig?.length).toBe(7); // 7 body parts
  });
  
  test('rig parts have correct properties', () => {
    const sim = new Simulator(20, 20);
    const rule = new HeroAnimation();
    
    sim.addUnit({
      id: 'hero1',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      meta: { useRig: true }
    });
    
    const context = sim.getTickContext();
    const commands = rule.execute(context);
    
    const metaCommand = commands.find(c => 
      c.type === 'meta' && c.params?.unitId === 'hero1'
    );
    
    const rig = metaCommand?.params?.meta?.rig;
    expect(rig).toBeDefined();
    

    const firstPart = rig?.[0];
    expect(firstPart?.name).toBeDefined();
    expect(firstPart?.sprite).toBeDefined();
    expect(firstPart?.offset).toBeDefined();
    expect(firstPart?.frame).toBeDefined();
    expect(firstPart?.zIndex).toBeDefined();
  });
  
  test('rig updates on subsequent ticks', () => {
    const sim = new Simulator(20, 20);
    

    sim.rulebook.push(new HeroAnimation());
    
    sim.addUnit({
      id: 'hero1',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      meta: { useRig: true }
    });
    

    sim.step();
    const hero1 = sim.units.find(u => u.id === 'hero1');
    const torso1 = hero1?.meta?.rig?.find((p: any) => p.name === 'torso');
    const initialOffset = torso1?.offset?.y || 0;
    const initialFrame = torso1?.frame || 0;
    

    for (let i = 0; i < 30; i++) {
      sim.step();
    }
    

    const hero2 = sim.units.find(u => u.id === 'hero1');
    const torso2 = hero2?.meta?.rig?.find((p: any) => p.name === 'torso');
    const finalOffset = torso2?.offset?.y || 0;
    const finalFrame = torso2?.frame || 0;
    



    

    const changed = (finalOffset !== initialOffset) || (finalFrame !== initialFrame);
    expect(changed).toBe(true);
  });
});