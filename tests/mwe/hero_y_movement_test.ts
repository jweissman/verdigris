import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Y-axis Movement', () => {
  test('hero command moves 2 cells in Y-axis', () => {
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
      params: { action: 'up' }
    });
    
    sim.step();
    
    const heroAfterUp = sim.units.find(u => u.id === 'test_hero');

    


    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const heroFinalUp = sim.units.find(u => u.id === 'test_hero');

    

    expect(heroFinalUp?.pos.y).toBeLessThan(10);
    

    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'down' }
    });
    
    for (let i = 0; i < 11; i++) {
      sim.step();
    }
    
    const heroFinalDown = sim.units.find(u => u.id === 'test_hero');

    

    expect(heroFinalDown?.pos.y).toBeGreaterThan(heroFinalUp?.pos.y || 0);
  });
  
  test('direct move command with dy: 2', () => {
    const sim = new Simulator(40, 40);
    
    const hero = sim.addUnit({
      id: 'test_hero2',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    

    

    sim.queuedCommands.push({
      type: 'move',
      unitId: 'test_hero2',
      params: { dx: 0, dy: 2 }
    });
    
    sim.step();
    const afterCommand = sim.units.find(u => u.id === 'test_hero2');

    

    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const final = sim.units.find(u => u.id === 'test_hero2');

    

    expect(final?.pos.y).toBe(12);
  });
});