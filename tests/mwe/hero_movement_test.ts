import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Movement', () => {
  test('basic movement works', () => {
    const sim = new Simulator(40, 40);
    
    // Add a hero unit
    const hero = sim.addUnit({
      id: 'hero1',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      meta: {
        useRig: true
      }
    });
    
    console.log('Initial position:', hero.pos);
    
    // Queue a move command
    sim.queuedCommands.push({
      type: 'move',
      unitId: 'hero1',
      params: {
        x: 12,
        y: 10
      }
    });
    
    // Step simulation
    sim.step();
    
    const movedHero = sim.units.find(u => u.id === 'hero1');
    console.log('After move command:', movedHero?.pos, 'intendedMove:', movedHero?.intendedMove);
    
    // Movement happens over time
    for (let i = 0; i < 5; i++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'hero1');
      console.log(`After step ${i+2}:`, h?.pos, 'intendedMove:', h?.intendedMove);
    }
    
    const finalHero = sim.units.find(u => u.id === 'hero1');
    expect(finalHero?.pos.x).toBeGreaterThan(10);
  });
  
  test('isometric hex offset behavior', () => {
    const sim = new Simulator(40, 40);
    
    // Test moving on even row
    const heroEven = sim.addUnit({
      id: 'hero_even',
      pos: { x: 10, y: 10 }, // Even row
      hp: 100,
      team: 'friendly'
    });
    
    // Test moving on odd row  
    const heroOdd = sim.addUnit({
      id: 'hero_odd',
      pos: { x: 10, y: 11 }, // Odd row
      hp: 100,
      team: 'friendly'
    });
    
    console.log('Even row hero at:', heroEven.pos);
    console.log('Odd row hero at:', heroOdd.pos);
    
    // Move both heroes right
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
    
    // Process movement
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const evenFinal = sim.units.find(u => u.id === 'hero_even');
    const oddFinal = sim.units.find(u => u.id === 'hero_odd');
    
    console.log('Even row hero moved to:', evenFinal?.pos);
    console.log('Odd row hero moved to:', oddFinal?.pos);
    
    // Both should have moved
    expect(evenFinal?.pos.x).toBeGreaterThan(10);
    expect(oddFinal?.pos.x).toBeGreaterThan(10);
  });
});