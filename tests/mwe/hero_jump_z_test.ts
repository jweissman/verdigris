import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { Jumping } from '../../src/rules/jumping';

describe('Hero Jump Z-axis', () => {
  test('hero jump sets z coordinate', () => {
    const sim = new Simulator(40, 40);
    
    
    const hero = sim.addUnit({
      id: 'jumping_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    

    

    sim.queuedCommands.push({
      type: 'jump',
      unitId: 'jumping_hero',
      params: {
        distance: 4,
        height: 5
      }
    });
    

    sim.step();
    
    const heroAfterStart = sim.units.find(u => u.id === 'jumping_hero');






    

    for (let i = 0; i < 25; i++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'jumping_hero');

      

      if (i === 3) { // Peak of jump (step 4 in output)
        expect(h?.meta?.z).toBeGreaterThan(2);
      }
      

      if (!h?.meta?.jumping) {
        break;
      }
    }
    
    const heroFinal = sim.units.find(u => u.id === 'jumping_hero');





    

    expect(heroFinal?.pos.x).toBeGreaterThan(10);
    expect(heroFinal?.meta?.z).toBe(0);
    expect(heroFinal?.meta?.jumping).toBe(false);
  });
});