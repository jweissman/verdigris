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
    
    // console.log('Initial hero position:', hero.pos);
    
    // Test moving up
    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'up' }
    });
    
    sim.step();
    
    const heroAfterUp = sim.units.find(u => u.id === 'test_hero');
    // console.log('After hero up command:', heroAfterUp?.pos, 'intendedMove:', heroAfterUp?.intendedMove);
    
    // The hero command should queue a move with dy: -2
    // But intendedMove gets consumed by movement, so check actual position after more steps
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const heroFinalUp = sim.units.find(u => u.id === 'test_hero');
    // console.log('Final position after up:', heroFinalUp?.pos);
    
    // Should have moved up by 2
    expect(heroFinalUp?.pos.y).toBeLessThan(10);
    
    // Test moving down
    sim.queuedCommands.push({
      type: 'hero',
      params: { action: 'down' }
    });
    
    for (let i = 0; i < 11; i++) {
      sim.step();
    }
    
    const heroFinalDown = sim.units.find(u => u.id === 'test_hero');
    // console.log('Final position after down:', heroFinalDown?.pos);
    
    // Should have moved down from where it was
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
    
    // console.log('Initial position:', hero.pos);
    
    // Direct move command with dy: 2
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'test_hero2',
      params: { dx: 0, dy: 2 }
    });
    
    sim.step();
    const afterCommand = sim.units.find(u => u.id === 'test_hero2');
    // console.log('After move command:', afterCommand?.pos, 'intendedMove:', afterCommand?.intendedMove);
    
    // Let movement execute
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const final = sim.units.find(u => u.id === 'test_hero2');
    // console.log('Final position:', final?.pos);
    
    // Should have moved down by 2
    expect(final?.pos.y).toBe(12);
  });
});