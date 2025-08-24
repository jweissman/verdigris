import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { EventHandler } from '../../src/rules/event_handler';
import { StrikeCommand } from '../../src/commands/strike';

describe('Hero Attack Debug', () => {
  test('strike command should damage enemy', () => {
    const sim = new Simulator(10, 10);
    // Clear default rulebook to isolate strike command behavior
    sim.rulebook = [];
    sim.rulebook.push(new EventHandler());
    
    const hero = sim.addUnit({
      id: 'hero',
      pos: { x: 5, y: 5 },
      team: 'friendly',
      hp: 100,
      dmg: 25
    });

    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 6, y: 5 }, // Adjacent to the right
      team: 'hostile',
      hp: 50,
      maxHp: 50
    });

    console.log('Before strike:', { 
      heroHp: hero.hp, 
      enemyHp: enemy.hp,
      heroPos: hero.pos,
      enemyPos: enemy.pos
    });

    // Execute strike directly
    sim.queuedCommands.push({
      type: 'strike',
      unitId: hero.id,
      params: {
        targetId: enemy.id,
        damage: 25
      }
    });

    sim.step();

    const enemyAfter = sim.units.find(u => u.id === 'enemy');
    console.log('After strike:', { 
      enemyHp: enemyAfter?.hp,
      events: sim.processedEvents.length
    });

    expect(enemyAfter?.hp).toBe(25); // Should take 25 damage
  });

  test('hero command attack should hit multiple enemies', () => {
    const sim = new Simulator(20, 20);
    // Clear default rulebook to isolate hero command behavior
    sim.rulebook = [];
    sim.rulebook.push(new EventHandler());
    
    const hero = sim.addUnit({
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

    // Place enemy in attack zone
    const enemy1 = sim.addUnit({
      id: 'enemy1',
      pos: { x: 11, y: 10 }, // Right next to hero
      team: 'hostile',
      hp: 50
    });

    console.log('Setup:', {
      hero: { pos: hero.pos, facing: hero.meta?.facing },
      enemy1: { pos: enemy1.pos, hp: enemy1.hp }
    });

    // Execute hero attack
    sim.queuedCommands.push({
      type: 'hero',
      params: {
        action: 'attack',
        direction: 'right',
        range: 2
      }
    });

    // Process command
    sim.step();
    
    console.log('After hero command:', {
      queuedCommands: sim.queuedCommands.map(c => ({ type: c.type, params: c.params })),
      events: sim.processedEvents.map(e => ({ kind: e.kind, target: e.target }))
    });

    // Process strike commands
    for (let i = 0; i < 5; i++) {
      sim.step();
    }

    const enemy1After = sim.units.find(u => u.id === 'enemy1');
    console.log('Final state:', {
      enemy1Hp: enemy1After?.hp,
      processedEvents: sim.processedEvents.length
    });

    expect(enemy1After?.hp).toBeLessThan(50);
  });
});