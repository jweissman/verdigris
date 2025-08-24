import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { EventHandler } from '../../src/rules/event_handler';

describe('Hero Single Attack Debug', () => {
  test('hero command should find all enemies in zones', () => {
    const sim = new Simulator(20, 20);
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

    // Place enemies exactly where test expects
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

    // Check what units exist
    console.log('All units:', sim.units.map(u => ({
      id: u.id,
      pos: u.pos,
      team: u.team,
      hp: u.hp
    })));

    // Manually calculate what hero command should find
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
    
    console.log('Enemies found in zones:', enemiesInZones.map(e => ({
      id: e.id,
      pos: e.pos
    })));
    
    expect(enemiesInZones.length).toBe(3); // Should find all 3
    
    // Now execute hero attack and see what happens
    sim.queuedCommands.push({
      type: 'hero',
      params: {
        action: 'attack',
        direction: 'right',
        range: 2
      }
    });
    
    sim.step();
    
    // Check queued commands after hero command
    console.log('Commands after hero attack:', sim.queuedCommands.map(c => ({
      type: c.type,
      unitId: c.unitId,
      targetId: c.params?.targetId
    })));
    
    // Process strikes
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    const finalEnemies = sim.units.filter(u => u.id.startsWith('enemy'));
    console.log('Final enemy states:', finalEnemies.map(e => ({
      id: e.id,
      hp: e.hp
    })));
    
    // All should have taken damage
    expect(finalEnemies.every(e => e.hp < 50)).toBe(true);
  });
});