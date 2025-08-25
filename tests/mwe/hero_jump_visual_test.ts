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
    

    playerControl.setKeyState(' ', true);
    sim.step(); // One step with space pressed
    playerControl.setKeyState(' ', false); // Release spacebar
    

    for (let step = 1; step < 20; step++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'jump_hero');
      
      if (step <= 2 || h?.meta?.jumping || step === 19) {

      }
    }
    
    const finalHero = sim.units.find(u => u.id === 'jump_hero');

    

    expect(finalHero?.pos.x).not.toBe(10); // Should have moved horizontally
    expect(finalHero?.meta?.jumping).toBe(false); // Should have finished jumping
  });
});