import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Farmer Plant Ability', () => {
  test('farmer actually creates bush units when planting', () => {
    const sim = new Simulator(20, 20);
    
    // Add a farmer
    const farmer = sim.addUnit({
      ...Encyclopaedia.unit('farmer'),
      id: 'farmer1',
      pos: { x: 10, y: 10 }
    });
    
    // Initial state
    const initialUnitCount = sim.units.length;
    console.log('Initial units:', sim.units.map(u => u.type || u.sprite));
    
    // Farmer has plant ability
    expect(farmer.abilities).toContain('plant');
    
    // Force farmer to use plant ability
    sim.forceAbility('farmer1', 'plant', farmer.pos);
    sim.step();
    
    // Check if a bush was created
    const newUnitCount = sim.units.length;
    console.log('After plant units:', sim.units.map(u => u.type || u.sprite));
    
    // Should have one more unit (the bush)
    expect(newUnitCount).toBe(initialUnitCount + 1);
    
    // Find the bush
    const bush = sim.units.find(u => u.type === 'bush' || u.sprite === 'bush');
    expect(bush).toBeDefined();
    
    if (bush) {
      console.log('Bush properties:', {
        hp: bush.hp,
        mass: bush.mass,
        team: bush.team,
        pos: bush.pos,
        tags: bush.tags
      });
      
      // Verify bush properties
      expect(bush.hp).toBe(15);
      expect(bush.mass).toBe(5);
      expect(bush.team).toBe(farmer.team);
      expect(bush.tags).toContain('obstacle');
    }
  });
  
  test('bushes block enemy movement', () => {
    const sim = new Simulator(10, 10);
    
    // Add farmer and enemy
    const farmer = sim.addUnit({
      ...Encyclopaedia.unit('farmer'),
      id: 'farmer1',
      pos: { x: 5, y: 5 },
      team: 'friendly'
    });
    
    const enemy = sim.addUnit({
      ...Encyclopaedia.unit('soldier'),
      id: 'enemy1',
      pos: { x: 3, y: 5 },
      team: 'hostile',
      intendedMove: { x: 1, y: 0 } // Try to move right toward farmer
    });
    
    // Plant bush between enemy and farmer
    sim.forceAbility('farmer1', 'plant', { x: 4, y: 5 });
    sim.step();
    
    const bush = sim.units.find(u => u.type === 'bush');
    expect(bush).toBeDefined();
    expect(bush?.pos).toEqual({ x: 6, y: 5 }); // Bush at offset from farmer
    
    // Try to move enemy - should be blocked by bush
    const enemyStartPos = enemy.pos;
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    // Enemy should not have moved much due to bush blocking
    console.log('Enemy moved from', enemyStartPos, 'to', enemy.pos);
  });
  
  test('multiple farmers can create bush maze', () => {
    const sim = new Simulator(20, 20);
    
    // Add 3 farmers
    for (let i = 0; i < 3; i++) {
      sim.addUnit({
        ...Encyclopaedia.unit('farmer'),
        id: `farmer${i}`,
        pos: { x: 5 + i * 3, y: 10 }
      });
    }
    
    // Each farmer plants
    for (let i = 0; i < 3; i++) {
      sim.forceAbility(`farmer${i}`, 'plant', sim.units[i].pos);
    }
    sim.step();
    
    // Should have 3 bushes
    const bushes = sim.units.filter(u => u.type === 'bush');
    console.log('Created', bushes.length, 'bushes');
    expect(bushes.length).toBe(3);
  });
});