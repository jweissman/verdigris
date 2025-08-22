import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Gradual Movement', () => {
  test('dx/dy movement is gradual', () => {
    const sim = new Simulator(40, 40);
    
    const hero = sim.addUnit({
      id: 'hero1',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly'
    });
    
    console.log('Initial:', hero.pos);
    
    // Move with dx/dy (gradual)
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero1',
      params: {
        dx: 0.2,
        dy: 0
      }
    });
    
    sim.step();
    const h1 = sim.units.find(u => u.id === 'hero1');
    console.log('After dx move:', h1?.pos, 'intendedMove:', h1?.intendedMove);
    
    // Should have moved by 0.2
    expect(h1?.pos.x).toBeCloseTo(10.2, 1);
    
    // Keep moving
    for (let i = 0; i < 5; i++) {
      sim.queuedCommands.push({
        type: 'move',
        unitId: 'hero1',
        params: {
          dx: 0.2,
          dy: 0
        }
      });
      sim.step();
    }
    
    const h2 = sim.units.find(u => u.id === 'hero1');
    console.log('After 6 moves:', h2?.pos);
    
    // Should have moved by 0.2 * 6 = 1.2 total
    expect(h2?.pos.x).toBeCloseTo(11.2, 1);
  });
  
  test('x/y movement is instant (teleport)', () => {
    const sim = new Simulator(40, 40);
    
    const hero = sim.addUnit({
      id: 'hero2',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly'
    });
    
    // Move with x/y (instant)
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero2',
      params: {
        x: 15,
        y: 10
      }
    });
    
    sim.step();
    const h = sim.units.find(u => u.id === 'hero2');
    console.log('After x/y move:', h?.pos);
    
    // Should have teleported instantly
    expect(h?.pos.x).toBe(15);
  });
});