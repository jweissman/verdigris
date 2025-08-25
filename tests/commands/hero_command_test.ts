import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Command', () => {
  test('hero jump command', () => {
    const sim = new Simulator(40, 40);
    

    const hero = sim.addUnit({
      id: 'test_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    

    

    sim.queuedCommands.push({
      type: 'hero',
      params: {
        action: 'jump'
      }
    });
    

    sim.step();
    

    const jumpingHero = sim.units.find(u => u.id === 'test_hero');

    
    expect(jumpingHero?.meta?.jumping).toBe(true);
  });
  
  test('hero move commands', () => {
    const sim = new Simulator(40, 40);
    
    const hero = sim.addUnit({
      id: 'move_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    

    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'left' }
    });
    
    sim.step();
    
    const leftHero = sim.units.find(u => u.id === 'move_hero');


    expect(leftHero?.intendedMove.x).toBe(-1);
    
    sim.step(); // Second step applies movement
    const movedLeftHero = sim.units.find(u => u.id === 'move_hero');
    expect(movedLeftHero?.pos.x).toBe(9);
    

    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'right' }
    });
    
    sim.step();
    sim.step(); // Need extra step to apply movement
    
    const rightHero = sim.units.find(u => u.id === 'move_hero');

    

    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'up' }
    });
    
    sim.step();
    sim.step(); // Need second step to apply movement
    
    const upHero = sim.units.find(u => u.id === 'move_hero');

    expect(upHero?.pos.y).toBeLessThan(10);
  });
  
  test('hero knight moves', () => {
    const sim = new Simulator(40, 40);
    
    const hero = sim.addUnit({
      id: 'knight_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    

    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'knight-left' }
    });
    
    sim.step();
    
    const knightHero = sim.units.find(u => u.id === 'knight_hero');

    

    expect(knightHero?.intendedMove.x).toBe(-1);
    expect(knightHero?.intendedMove.y).toBe(-2);
    
    sim.step(); // Second step applies movement
    const movedKnightHero = sim.units.find(u => u.id === 'knight_hero');
    expect(movedKnightHero?.pos.x).toBe(9);
    expect(movedKnightHero?.pos.y).toBe(8);
  });
  
  test('hero command affects all hero-tagged units', () => {
    const sim = new Simulator(40, 40);
    

    const hero1 = sim.addUnit({
      id: 'hero1',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    
    const hero2 = sim.addUnit({
      id: 'hero2',
      pos: { x: 20, y: 20 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    

    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'jump' }
    });
    
    sim.step();
    
    const h1 = sim.units.find(u => u.id === 'hero1');
    const h2 = sim.units.find(u => u.id === 'hero2');
    

    
    expect(h1?.meta?.jumping).toBe(true);
    expect(h2?.meta?.jumping).toBe(true);
  });
});