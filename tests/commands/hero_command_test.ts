import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Command', () => {
  test('hero jump command', () => {
    const sim = new Simulator(40, 40);
    
    // Add hero-tagged unit
    const hero = sim.addUnit({
      id: 'test_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    
    console.log('Hero initial pos:', hero.pos);
    
    // Use hero jump command
    sim.queuedCommands.push({
      type: 'hero',
      params: {
        action: 'jump'
      }
    });
    
    // Process command
    sim.step();
    
    // Check that jump was initiated
    const jumpingHero = sim.units.find(u => u.id === 'test_hero');
    console.log('After hero jump:', jumpingHero?.meta?.jumping, 'target:', jumpingHero?.meta?.jumpTarget);
    
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
    
    // Test hero left
    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'left' }
    });
    
    sim.step();
    
    const leftHero = sim.units.find(u => u.id === 'move_hero');
    console.log('After hero left:', leftHero?.pos, 'intendedMove:', leftHero?.intendedMove);
    // First step sets intendedMove  
    expect(leftHero?.intendedMove.x).toBe(-1);
    
    sim.step(); // Second step applies movement
    const movedLeftHero = sim.units.find(u => u.id === 'move_hero');
    expect(movedLeftHero?.pos.x).toBe(9);
    
    // Test hero right
    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'right' }
    });
    
    sim.step();
    sim.step(); // Need extra step to apply movement
    
    const rightHero = sim.units.find(u => u.id === 'move_hero');
    console.log('After hero right:', rightHero?.pos);
    
    // Test hero up
    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'up' }
    });
    
    sim.step();
    sim.step(); // Need second step to apply movement
    
    const upHero = sim.units.find(u => u.id === 'move_hero');
    console.log('After hero up:', upHero?.pos);
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
    
    // Knight move left (1 left, 2 up)
    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'knight-left' }
    });
    
    sim.step();
    
    const knightHero = sim.units.find(u => u.id === 'knight_hero');
    console.log('After knight-left from (10,10):', knightHero?.pos, 'intendedMove:', knightHero?.intendedMove);
    
    // First step sets intendedMove
    expect(knightHero?.intendedMove.x).toBe(-1);
    expect(knightHero?.intendedMove.y).toBe(-2);
    
    sim.step(); // Second step applies movement
    const movedKnightHero = sim.units.find(u => u.id === 'knight_hero');
    expect(movedKnightHero?.pos.x).toBe(9);
    expect(movedKnightHero?.pos.y).toBe(8);
  });
  
  test('hero command affects all hero-tagged units', () => {
    const sim = new Simulator(40, 40);
    
    // Add multiple heroes
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
    
    // Hero jump affects both
    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'jump' }
    });
    
    sim.step();
    
    const h1 = sim.units.find(u => u.id === 'hero1');
    const h2 = sim.units.find(u => u.id === 'hero2');
    
    console.log('Both heroes jumping:', h1?.meta?.jumping, h2?.meta?.jumping);
    
    expect(h1?.meta?.jumping).toBe(true);
    expect(h2?.meta?.jumping).toBe(true);
  });
});