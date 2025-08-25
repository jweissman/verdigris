import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Farmer Plant Ability', () => {
  test('farmer actually creates bush units when planting', () => {
    const sim = new Simulator(20, 20);
    

    const farmer = sim.addUnit({
      ...Encyclopaedia.unit('farmer'),
      id: 'farmer1',
      pos: { x: 10, y: 10 }
    });
    

    const initialUnitCount = sim.units.length;

    

    expect(farmer.abilities).toContain('plant');
    

    sim.forceAbility('farmer1', 'plant', farmer.pos);
    sim.step();
    

    const newUnitCount = sim.units.length;

    

    expect(newUnitCount).toBe(initialUnitCount + 1);
    

    const bush = sim.units.find(u => u.type === 'bush' || u.sprite === 'bush');
    expect(bush).toBeDefined();
    
    if (bush) {

      expect(bush.hp).toBe(1);
      expect(bush.mass).toBe(1);
      expect(bush.team).toBe(farmer.team);
      expect(bush.tags).toContain('obstacle');
    }
  });
  
  test('bushes block enemy movement', () => {
    const sim = new Simulator(10, 10);
    

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
    

    sim.forceAbility('farmer1', 'plant', { x: 4, y: 5 });
    sim.step();
    
    const bush = sim.units.find(u => u.type === 'bush');
    expect(bush).toBeDefined();
    expect(bush?.pos).toEqual({ x: 6, y: 5 }); // Bush at offset from farmer
    

    const enemyStartPos = enemy.pos;
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    


  });
  
  test('multiple farmers can create bush maze', () => {
    const sim = new Simulator(20, 20);
    

    for (let i = 0; i < 3; i++) {
      sim.addUnit({
        ...Encyclopaedia.unit('farmer'),
        id: `farmer${i}`,
        pos: { x: 5 + i * 3, y: 10 }
      });
    }
    

    for (let i = 0; i < 3; i++) {
      sim.forceAbility(`farmer${i}`, 'plant', sim.units[i].pos);
    }
    sim.step();
    

    const bushes = sim.units.filter(u => u.type === 'bush');

    expect(bushes.length).toBe(3);
  });
});