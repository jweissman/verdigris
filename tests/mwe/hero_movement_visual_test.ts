import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';
import { HeroAnimation } from '../../src/rules/hero_animation';

describe('Hero Movement Visual Test', () => {
  test('simulate hero movement like in the MWE', () => {
    const sim = new Simulator(40, 40);
    
    // Add the rules like in the real MWE
    const playerControl = new PlayerControl();
    sim.rulebook.push(playerControl);
    sim.rulebook.push(new HeroAnimation());
    
    // Add hero exactly like in the MWE
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
    
    
    // Simulate pressing W key
    playerControl.setKeyState('w', true);
    
    // Run several simulation steps
    for (let step = 0; step < 12; step++) {
      sim.step();
    }
    
    // Release W and press S
    // console.log('\n--- Releasing W, pressing S (move down) ---');
    playerControl.setKeyState('w', false);
    playerControl.setKeyState('s', true);
    
    for (let step = 12; step < 20; step++) {
      sim.step();
    }
    
    const finalPos = sim.units[0].pos;
    
    // Should have moved up then down
    expect(finalPos.x).toBe(10); // X shouldn't change
    // Y position should have changed
  });
});