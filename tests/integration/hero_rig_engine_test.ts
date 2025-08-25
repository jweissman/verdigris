import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroAnimation } from '../../src/rules/hero_animation';
import { HeroCommand } from '../../src/commands/hero_command';

describe('Hero Rig Engine Integration', () => {
  test('hero with useRig gets animated body parts', () => {
    const sim = new Simulator(40, 40);
    

    sim.rulebook.push(new HeroAnimation());
    

    const hero = sim.addUnit({
      id: 'rigged_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero'],
      meta: {
        useRig: true
      }
    });
    
    

    sim.step();
    

    const riggedHero = sim.units.find(u => u.id === 'rigged_hero');
    
    
    expect(riggedHero?.meta?.rig).toBeDefined();
    expect(riggedHero?.meta?.rig?.length).toBe(7); // 7 body parts
    

    const torso = riggedHero?.meta?.rig?.find((p: any) => p.name === 'torso');
    
    expect(torso).toBeDefined();
    expect(torso?.sprite).toBe('hero-torso');
    expect(torso?.offset).toBeDefined();
    expect(torso?.frame).toBeDefined();
  });
  
  test('hero breathing animation updates over time', () => {
    const sim = new Simulator(40, 40);
    sim.rulebook.push(new HeroAnimation());
    
    const hero = sim.addUnit({
      id: 'breathing_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero'],
      meta: {
        useRig: true
      }
    });
    

    sim.step();
    const hero1 = sim.units.find(u => u.id === 'breathing_hero');
    const torso1 = hero1?.meta?.rig?.find((p: any) => p.name === 'torso');
    const initialY = torso1?.offset?.y || 0;
    
    

    for (let i = 0; i < 4; i++) {
      sim.step();
    }
    
    const hero2 = sim.units.find(u => u.id === 'breathing_hero');
    const torso2 = hero2?.meta?.rig?.find((p: any) => p.name === 'torso');
    const finalY = torso2?.offset?.y || 0;
    
    

    expect(finalY).not.toBe(initialY);

    expect(Math.abs(finalY)).toBeGreaterThan(0); // Should be negative (moved up)
  });
  
  test('hero command moves rigged hero', () => {
    const sim = new Simulator(40, 40);
    sim.rulebook.push(new HeroAnimation());
    
    const hero = sim.addUnit({
      id: 'commanded_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero'],
      meta: {
        useRig: true
      }
    });
    
    

    sim.queuedCommands.push({
      type: 'hero',
      params: {
        action: 'right'
      }
    });
    
    sim.step();
    
    const heroAfterCommand = sim.units.find(u => u.id === 'commanded_hero');
    

    expect(heroAfterCommand?.intendedMove.x).toBe(1);
    
    sim.step(); // Second step applies movement
    const movedHero = sim.units.find(u => u.id === 'commanded_hero');
    expect(movedHero?.pos.x).toBe(11);
    

    expect(movedHero?.meta?.rig).toBeDefined();
  });
  
  test('hero jump with rig animation', () => {
    const sim = new Simulator(40, 40);
    sim.rulebook.push(new HeroAnimation());
    
    const hero = sim.addUnit({
      id: 'jumping_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero'],
      meta: {
        useRig: true
      }
    });
    

    sim.queuedCommands.push({
      type: 'hero',
      params: {
        action: 'jump'
      }
    });
    
    sim.step();
    
    const jumpingHero = sim.units.find(u => u.id === 'jumping_hero');
    
    expect(jumpingHero?.meta?.jumping).toBe(true);
    expect(jumpingHero?.meta?.rig).toBeDefined();
    

    for (let i = 0; i < 20; i++) {
      sim.step();
    }
    
    const landedHero = sim.units.find(u => u.id === 'jumping_hero');
    
    expect(landedHero?.meta?.jumping).toBeFalsy();
    expect(landedHero?.pos.x).toBeGreaterThan(10);
  });
});