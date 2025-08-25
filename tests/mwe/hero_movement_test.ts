import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Movement', () => {
  test('basic movement works', () => {
    const sim = new Simulator(40, 40);
    

    const hero = sim.addUnit({
      id: 'hero1',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      meta: {
        useRig: true
      }
    });
    

    

    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero1',
      params: {
        x: 12,
        y: 10
      }
    });
    

    sim.step();
    
    const movedHero = sim.units.find(u => u.id === 'hero1');

    

    for (let i = 0; i < 5; i++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'hero1');

    }
    
    const finalHero = sim.units.find(u => u.id === 'hero1');
    expect(finalHero?.pos.x).toBeGreaterThan(10);
  });
  
  test('isometric hex offset behavior', () => {
    const sim = new Simulator(40, 40);
    

    const heroEven = sim.addUnit({
      id: 'hero_even',
      pos: { x: 10, y: 10 }, // Even row
      hp: 100,
      team: 'friendly'
    });
    

    const heroOdd = sim.addUnit({
      id: 'hero_odd',
      pos: { x: 10, y: 11 }, // Odd row
      hp: 100,
      team: 'friendly'
    });
    


    

    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero_even',
      params: { x: 11, y: 10 }
    });
    
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero_odd',
      params: { x: 11, y: 11 }
    });
    

    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const evenFinal = sim.units.find(u => u.id === 'hero_even');
    const oddFinal = sim.units.find(u => u.id === 'hero_odd');
    


    

    expect(evenFinal?.pos.x).toBeGreaterThan(10);
    expect(oddFinal?.pos.x).toBeGreaterThan(10);
  });
});