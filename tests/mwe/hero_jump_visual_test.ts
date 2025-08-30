import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';

describe('Hero Jump Visual Issue', () => {
  test('hero jump should show Z movement', () => {
    const sim = new Simulator(40, 40);
    const playerControl: PlayerControl = sim.rules.find(r => r.constructor === PlayerControl); 
    const hero = sim.addUnit({
      id: "jump_hero",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 100,
      maxHp: 100,
      dmg: 15,
      tags: ["hero"],
      meta: {
        controlled: true,
        useRig: true
      }
    });
    

    // Set facing direction first
    playerControl.setKeyState('a', true);
    sim.step();
    playerControl.setKeyState('a', false);
    
    playerControl.setKeyState(' ', true);
    sim.step(); // One step with space pressed
    
    // Check if jump command was queued
    const jumpCmd = sim.queuedCommands.find(c => c.type === 'jump');
    
    playerControl.setKeyState(' ', false); // Release spacebar
    

    for (let step = 1; step < 20; step++) {
      sim.step();
    }
    
    const finalHero = sim.units.find(u => u.id === 'jump_hero');

    

    expect(finalHero?.pos.x).toBeLessThan(10); // Should have moved left
    expect(finalHero?.meta?.jumping).toBe(false); // Should have finished jumping
  });
});