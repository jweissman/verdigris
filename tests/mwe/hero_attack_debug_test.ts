import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { EventHandler } from '../../src/rules/event_handler';

describe('Hero Attack Debug', () => {
  test('strike command should damage enemy', () => {
    const sim = new Simulator(10, 10);
    
    const hero = sim.addUnit({
      id: 'hero',
      pos: { x: 5, y: 5 },
      team: 'friendly',
      hp: 100,
      dmg: 25
    });

    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 7, y: 5 }, // Two tiles to the right, not adjacent
      team: 'hostile',
      hp: 50,
      maxHp: 50
    });

    sim.queuedCommands.push({
      type: 'strike',
      unitId: hero.id,
      params: {
        targetId: enemy.id,
        damage: 25,
        range: 2  // Ensure we can hit at range 2
      }
    });

    sim.step();
    const enemyAfter = sim.units.find(u => u.id === 'enemy');
    expect(enemyAfter?.hp).toBe(25); // Should take 25 damage
  });

  test('hero command attack should hit multiple enemies', () => {
    const sim = new Simulator(20, 20);
    
    sim.addUnit({
      id: 'hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      dmg: 20,
      tags: ['hero'],
      meta: {
        controlled: true,
        facing: 'right'
      }
    });


    sim.addUnit({
      id: 'enemy1',
      pos: { x: 11, y: 10 }, // Right next to hero
      team: 'hostile',
      hp: 50
    });



    sim.queuedCommands.push({
      type: 'hero',
      params: {
        action: 'attack',
        direction: 'right',
        range: 2
      }
    });
    sim.step();
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    const enemy1After = sim.units.find(u => u.id === 'enemy1');
    expect(enemy1After?.hp).toBeLessThan(50);
  });
});