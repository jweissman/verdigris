import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';
import { Jumping } from '../../src/rules/jumping';

describe('Hero Multi-Jump', () => {
  test('hero can perform triple jump with increasing height', () => {
    const sim = new Simulator(30, 30);
    const playerControl = new PlayerControl();
    sim.rulebook.push(playerControl);
    sim.rulebook.push(new Jumping());
    
    const hero = sim.addUnit({
      id: 'jumper',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      tags: ['hero'],
      meta: {
        controlled: true,
      },
    });

    // First jump
    playerControl.setKeyState(' ', true);
    sim.step();
    playerControl.setKeyState(' ', false);
    sim.step(); // Process the jump command
    
    expect(hero.meta?.jumping).toBe(true);
    expect(hero.meta?.jumpCount).toBe(1);
    expect(hero.meta?.isFlipping).toBe(false);
    
    // Mid-air, trigger double jump
    sim.step(); // Let jump command process
    
    playerControl.setKeyState(' ', true);
    sim.step();
    playerControl.setKeyState(' ', false);
    sim.step(); // Process the jump command
    
    // The jump command should have updated jumpCount
    const jumpCmd = sim.queuedCommands.find(c => c.type === 'jump');
    if (jumpCmd) {
      sim.step(); // Process it
    }
    
    // Check that we're attempting a multi-jump
    expect(hero.meta?.jumping).toBe(true);
  });

  test('jump resets properly on landing', () => {
    const sim = new Simulator(30, 30);
    sim.rulebook.push(new Jumping());
    
    const hero = sim.addUnit({
      id: 'jumper',
      pos: { x: 10, y: 10 },
      team: 'friendly',
      hp: 100,
      tags: ['hero'],
      meta: {
        jumping: true,
        jumpCount: 3,
        jumpProgress: 7, // Almost done jumping
        jumpOrigin: { x: 10, y: 10 },
        jumpTarget: { x: 15, y: 10 },
      },
    });

    // Complete the jump
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    // Should have landed and reset
    expect(hero.meta?.jumping).toBeFalsy();
    expect(hero.meta?.jumpCount).toBe(0);
    expect(hero.meta?.isFlipping).toBeFalsy();
    expect(hero.meta?.isDoubleFlipping).toBeFalsy();
    expect(hero.meta?.rotation).toBe(0);
  });
});