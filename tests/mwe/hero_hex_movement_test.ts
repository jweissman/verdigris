import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Hex Movement', () => {
  test('horizontal movement on even vs odd rows', () => {
    const sim = new Simulator(40, 40);
    

    const heroEven = sim.addUnit({
      id: 'hero_even',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    

    const heroOdd = sim.addUnit({
      id: 'hero_odd',
      pos: { x: 10, y: 11 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    



    

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
    



    

    expect(evenAfter?.pos.x).toBe(11);
    expect(oddAfter?.pos.x).toBe(11);
    

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
    

    

    sim.queuedCommands.push({
      type: 'move',
      unitId: 'knight_hero',
      params: { dx: 1, dy: -2 }
    });
    
    sim.step();
    
    const afterKnight = sim.units.find(u => u.id === 'knight_hero');

    
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
    

    sim.queuedCommands.push({
      type: 'move',
      unitId: 'diag_hero',
      params: { dx: 1, dy: 1 }
    });
    
    sim.step();
    
    const after = sim.units.find(u => u.id === 'diag_hero');

    
    expect(after?.pos.x).toBe(11);
    expect(after?.pos.y).toBe(11);
  });
});