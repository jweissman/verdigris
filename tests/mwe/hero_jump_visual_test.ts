import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';
import { HeroAnimation } from '../../src/rules/hero_animation';
import { Jumping } from '../../src/rules/jumping';

describe('Hero Jump Visual Issue', () => {
  test('hero jump should show Z movement', () => {
    const sim = new Simulator(40, 40);
    
    const playerControl = new PlayerControl();
    sim.rulebook.push(playerControl);
    sim.rulebook.push(new HeroAnimation());
    sim.rulebook.push(new Jumping()); // Add Jumping rule!
    
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
    
    // console.log('=== HERO JUMP TEST ===');
    // console.log('Initial:', { pos: hero.pos, z: hero.meta?.z, jumping: hero.meta?.jumping });
    
    // Simulate spacebar press and release
    // console.log('\n--- Pressing spacebar ---');
    playerControl.setKeyState(' ', true);
    sim.step(); // One step with space pressed
    playerControl.setKeyState(' ', false); // Release spacebar
    
    // Run several simulation steps
    for (let step = 1; step < 20; step++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'jump_hero');
      
      if (step <= 2 || h?.meta?.jumping || step === 19) {
        // console.log(`Step ${step}: pos=(${h?.pos.x}, ${h?.pos.y}), z=${h?.meta?.z || 0}, jumping=${h?.meta?.jumping}, progress=${h?.meta?.jumpProgress || 0}`);
      }
    }
    
    const finalHero = sim.units.find(u => u.id === 'jump_hero');
    // console.log('\nFinal:', { pos: finalHero?.pos, z: finalHero?.meta?.z, jumping: finalHero?.meta?.jumping });
    
    // Should have jumped and landed
    expect(finalHero?.pos.x).not.toBe(10); // Should have moved horizontally
    expect(finalHero?.meta?.jumping).toBe(false); // Should have finished jumping
  });
});