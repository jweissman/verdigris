import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { EventHandler } from '../../src/rules/event_handler';

describe('Hero Single Attack Debug', () => {
  test('hero command should find all enemies in zones', () => {
    const sim = new Simulator(20, 20);
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
    const enemy1 = sim.addUnit({
      id: 'enemy1',
      pos: { x: 12, y: 9 },
      team: 'hostile',
      hp: 50
    });
    
    const enemy2 = sim.addUnit({
      id: 'enemy2',
      pos: { x: 12, y: 10 },
      team: 'hostile',
      hp: 50
    });
    const enemy3 = sim.addUnit({
      id: 'enemy3',
      pos: { x: 12, y: 11 },
      team: 'hostile',
      hp: 50
    });
    const attackZones = [
      { x: 11, y: 9 }, { x: 11, y: 10 }, { x: 11, y: 11 },
      { x: 12, y: 9 }, { x: 12, y: 10 }, { x: 12, y: 11 }
    ];
    const enemiesInZones = sim.units.filter(u => {
      if (u.team === 'friendly' || u.hp <= 0) return false;
      return attackZones.some(zone => 
        u.pos.x === zone.x && u.pos.y === zone.y
      );
    });
    expect(enemiesInZones.length).toBe(3); // Should find all 3
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
    const finalEnemies = sim.units.filter(u => u.id.startsWith('enemy'));
    expect(finalEnemies.every(e => e.hp < 50)).toBe(true);
  });

  test('hero should damage neutral squirrels', () => {
    const sim = new Simulator(20, 20);
    
    const hero = sim.addUnit({
      id: 'hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      dmg: 25,
      tags: ['hero'],
      meta: {
        controlled: true,
        facing: 'right'
      }
    });

    const squirrel = sim.addUnit({
      id: 'test-squirrel',
      type: 'squirrel',
      pos: { x: 11, y: 10 },
      team: 'neutral',
      hp: 8,
      maxHp: 8
    });

    console.log('Before strike - Squirrel HP:', squirrel.hp);

    sim.queuedCommands.push({
      type: 'hero',
      params: {
        action: 'strike',
        direction: 'right',
        damage: 25,
        range: 4
      }
    });
    
    sim.step();

    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    const finalSquirrel = sim.units.find(u => u.id === 'test-squirrel');
    console.log('After strike - Squirrel HP:', finalSquirrel?.hp);
    console.log('Squirrel alive:', finalSquirrel && finalSquirrel.hp > 0);
    
    // Squirrel should be dead/removed since hero does 25 damage and squirrel has 8 HP
    expect(finalSquirrel).toBeUndefined();
  });

  test('hero should damage ambient squirrels that attack', () => {
    const sim = new Simulator(20, 20);
    sim.sceneBackground = 'forest'; // Forest background to trigger ambient spawning
    
    const hero = sim.addUnit({
      id: 'hero',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      dmg: 25,
      tags: ['hero'],
      meta: {
        controlled: true,
        facing: 'right'
      }
    });

    // Manually add a hostile squirrel (maybe they become hostile somehow?)
    const hostileSquirrel = sim.addUnit({
      id: 'hostile-squirrel',
      type: 'squirrel',
      pos: { x: 11, y: 10 },
      team: 'hostile', // Try hostile instead of neutral
      hp: 8,
      maxHp: 8
    });

    console.log('Before strike - Hostile Squirrel HP:', hostileSquirrel.hp);
    console.log('Before strike - Hostile Squirrel Team:', hostileSquirrel.team);

    sim.queuedCommands.push({
      type: 'hero',
      params: {
        action: 'strike',
        direction: 'right',
        damage: 25,
        range: 4
      }
    });
    
    sim.step();

    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    const finalHostileSquirrel = sim.units.find(u => u.id === 'hostile-squirrel');
    console.log('After strike - Hostile Squirrel HP:', finalHostileSquirrel?.hp);
    console.log('After strike - Hostile Squirrel alive:', finalHostileSquirrel && finalHostileSquirrel.hp > 0);
    
    // Hostile squirrel should be dead/removed since hero does 25 damage
    expect(finalHostileSquirrel).toBeUndefined();
  });
});