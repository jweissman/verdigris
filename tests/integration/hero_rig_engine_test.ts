import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroAnimation } from '../../src/rules/hero_animation';
import { HeroCommand } from '../../src/commands/hero_command';

describe('Hero Rig Engine Integration', () => {
  test('hero with useRig gets animated body parts', () => {
    const sim = new Simulator(40, 40);
    
    // Add hero animation rule
    sim.rulebook.push(new HeroAnimation());
    
    // Create hero with rig
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
    
    
    // Step to trigger animation rule
    sim.step();
    
    // Hero should have rig parts in meta
    const riggedHero = sim.units.find(u => u.id === 'rigged_hero');
    
    
    expect(riggedHero?.meta?.rig).toBeDefined();
    expect(riggedHero?.meta?.rig?.length).toBe(7); // 7 body parts
    
    // Check parts have correct properties
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
    
    // Get initial torso position
    sim.step();
    const hero1 = sim.units.find(u => u.id === 'breathing_hero');
    const torso1 = hero1?.meta?.rig?.find((p: any) => p.name === 'torso');
    const initialY = torso1?.offset?.y || 0;
    
    
    // Advance 30 ticks (half breathing cycle)
    for (let i = 0; i < 30; i++) {
      sim.step();
    }
    
    const hero2 = sim.units.find(u => u.id === 'breathing_hero');
    const torso2 = hero2?.meta?.rig?.find((p: any) => p.name === 'torso');
    const finalY = torso2?.offset?.y || 0;
    
    
    // Should have moved (breathing)
    expect(finalY).not.toBe(initialY);
    expect(finalY).toBe(-3); // Peak of breath at tick 30
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
    
    
    // Use hero command to move right
    sim.queuedCommands.push({
      type: 'hero',
      params: {
        action: 'right'
      }
    });
    
    sim.step();
    
    const heroAfterCommand = sim.units.find(u => u.id === 'commanded_hero');
    
    // First step sets intendedMove
    expect(heroAfterCommand?.intendedMove.x).toBe(1);
    
    sim.step(); // Second step applies movement
    const movedHero = sim.units.find(u => u.id === 'commanded_hero');
    expect(movedHero?.pos.x).toBe(11);
    
    // Rig should still be present
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
    
    // Hero jump command
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
    
    // Complete jump
    for (let i = 0; i < 20; i++) {
      sim.step();
    }
    
    const landedHero = sim.units.find(u => u.id === 'jumping_hero');
    
    expect(landedHero?.meta?.jumping).toBeFalsy();
    expect(landedHero?.pos.x).toBeGreaterThan(10);
  });
});