import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';
import { HeroCommand } from '../../src/commands/hero_command';

describe('Hero Y Movement Bouncing Issue', () => {
  test('hero moves smoothly up without bouncing', () => {
    const sim = new Simulator(40, 40);
    const playerControl = new PlayerControl();
    sim.rulebook.push(playerControl);
    
    const hero = sim.addUnit({
      id: 'test_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero'],
      meta: { controlled: true }
    });
    
    // console.log('Initial position:', hero.pos);
    
    // Simulate pressing and holding W key
    playerControl.setKeyState('w', true);
    
    let positions: Array<{x: number, y: number, step: number}> = [];
    
    // Simulate several frames
    for (let step = 0; step < 10; step++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'test_hero');
      positions.push({ x: h!.pos.x, y: h!.pos.y, step });
      // console.log(`Step ${step}: pos=(${h!.pos.x}, ${h!.pos.y}), intendedMove=(${h!.intendedMove.x}, ${h!.intendedMove.y})`);
    }
    
    // Check for bouncing - Y should only go down (from 10 toward 8, 6, etc)
    let bounceDetected = false;
    let lastY = positions[0].y;
    let direction = 0; // -1 for up, 1 for down, 0 for no change
    
    for (let i = 1; i < positions.length; i++) {
      const currentY = positions[i].y;
      const deltaY = currentY - lastY;
      
      if (Math.abs(deltaY) > 0.01) {
        const currentDirection = deltaY > 0 ? 1 : -1;
        if (direction !== 0 && direction !== currentDirection) {
          // console.log(`BOUNCE detected at step ${i}: direction changed from ${direction} to ${currentDirection}`);
          bounceDetected = true;
        }
        direction = currentDirection;
      }
      
      lastY = currentY;
    }
    
    expect(bounceDetected).toBe(false);
    
    // Release key and test down movement
    playerControl.setKeyState('w', false);
    playerControl.setKeyState('s', true);
    
    // Test a few more steps for down movement
    for (let step = 10; step < 20; step++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'test_hero');
      // console.log(`Step ${step}: pos=(${h!.pos.x}, ${h!.pos.y}), intendedMove=(${h!.intendedMove.x}, ${h!.intendedMove.y})`);
    }
  });
});