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
    
    console.log('=== HERO MOVEMENT TEST ===');
    console.log('Initial hero:', { pos: hero.pos, meta: { controlled: hero.meta?.controlled } });
    
    // Simulate pressing W key
    console.log('\n--- Pressing W key (move up) ---');
    playerControl.setKeyState('w', true);
    
    // Run several simulation steps
    for (let step = 0; step < 12; step++) {
      console.log(`\nStep ${step}:`);
      console.log('  Before step:', {
        pos: sim.units[0].pos,
        intendedMove: sim.units[0].intendedMove,
        queuedCommands: sim.queuedCommands.length
      });
      
      sim.step();
      
      console.log('  After step:', {
        pos: sim.units[0].pos,
        intendedMove: sim.units[0].intendedMove,
        cooldown: (playerControl as any).moveCooldowns?.get('hero') || 0
      });
    }
    
    // Release W and press S
    console.log('\n--- Releasing W, pressing S (move down) ---');
    playerControl.setKeyState('w', false);
    playerControl.setKeyState('s', true);
    
    for (let step = 12; step < 20; step++) {
      console.log(`\nStep ${step}:`);
      sim.step();
      console.log('  After step:', {
        pos: sim.units[0].pos,
        intendedMove: sim.units[0].intendedMove
      });
    }
    
    const finalPos = sim.units[0].pos;
    console.log('\nFinal position:', finalPos);
    
    // Should have moved up then down
    expect(finalPos.x).toBe(10); // X shouldn't change
    // Y position should have changed
  });
});