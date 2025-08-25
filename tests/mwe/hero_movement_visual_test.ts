import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';
import { HeroAnimation } from '../../src/rules/hero_animation';

describe('Hero Movement Visual Test', () => {
  test('simulate hero movement like in the MWE', () => {
    const sim = new Simulator(40, 40);
    

    const playerControl = new PlayerControl();
    sim.rulebook.push(playerControl);
    sim.rulebook.push(new HeroAnimation());
    

    const hero = sim.addUnit({
      id: "hero",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 100,
      maxHp: 100,
      dmg: 15,
      tags: ["hero"],
      meta: {
        controlled: true,
        useRig: true,
        onRooftop: true
      }
    });
    
    

    playerControl.setKeyState('w', true);
    

    for (let step = 0; step < 12; step++) {
      sim.step();
    }
    


    playerControl.setKeyState('w', false);
    playerControl.setKeyState('s', true);
    
    for (let step = 12; step < 20; step++) {
      sim.step();
    }
    
    const finalPos = sim.units[0].pos;
    

    expect(finalPos.x).toBe(10); // X shouldn't change

  });
});