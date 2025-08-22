import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Hex Movement', () => {
  test('horizontal movement on even vs odd rows', () => {
    const sim = new Simulator(40, 40);
    
    // Hero on even row (y=10)
    const heroEven = sim.addUnit({
      id: 'hero_even',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    
    // Hero on odd row (y=11) 
    const heroOdd = sim.addUnit({
      id: 'hero_odd',
      pos: { x: 10, y: 11 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    
    console.log('Initial positions:');
    console.log('  Even row hero:', heroEven.pos);
    console.log('  Odd row hero:', heroOdd.pos);
    
    // Move both right by 1
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero_even',
      params: { dx: 1, dy: 0 }
    });
    
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero_odd',
      params: { dx: 1, dy: 0 }
    });
    
    sim.step();
    
    const evenAfter = sim.units.find(u => u.id === 'hero_even');
    const oddAfter = sim.units.find(u => u.id === 'hero_odd');
    
    console.log('After horizontal move:');
    console.log('  Even row hero:', evenAfter?.pos);
    console.log('  Odd row hero:', oddAfter?.pos);
    
    // Both moved the same in sim coordinates
    expect(evenAfter?.pos.x).toBe(11);
    expect(oddAfter?.pos.x).toBe(11);
    
    // But visually, odd row will be offset by half tile
  });
  
  test('knight move pattern (2 vertical, 1 horizontal)', () => {
    const sim = new Simulator(40, 40);
    
    const hero = sim.addUnit({
      id: 'knight_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    
    console.log('Initial:', hero.pos);
    
    // Knight move: 2 up, 1 right
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'knight_hero',
      params: { dx: 1, dy: -2 }
    });
    
    sim.step();
    
    const afterKnight = sim.units.find(u => u.id === 'knight_hero');
    console.log('After knight move:', afterKnight?.pos);
    
    expect(afterKnight?.pos.x).toBe(11);
    expect(afterKnight?.pos.y).toBe(8);
  });
  
  test('diagonal movement pattern', () => {
    const sim = new Simulator(40, 40);
    
    const hero = sim.addUnit({
      id: 'diag_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    
    // Move diagonally 
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'diag_hero',
      params: { dx: 1, dy: 1 }
    });
    
    sim.step();
    
    const after = sim.units.find(u => u.id === 'diag_hero');
    console.log('Diagonal move from', hero.pos, 'to', after?.pos);
    
    expect(after?.pos.x).toBe(11);
    expect(after?.pos.y).toBe(11);
  });
});