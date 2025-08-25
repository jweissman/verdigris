import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';
import { HeroCommand } from '../../src/commands/hero_command';

describe('Hero Y Movement Bouncing Issue', () => {
  test('hero moves smoothly up without bouncing', () => {
    const sim = new Simulator(40, 40);
    const playerControl = sim.rules.find(r => r.constructor === PlayerControl) as PlayerControl;
    
    const hero = sim.addUnit({
      id: 'test_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero'],
      meta: { controlled: true }
    });
    

    

    playerControl.setKeyState('w', true);
    
    let positions: Array<{x: number, y: number, step: number}> = [];
    

    for (let step = 0; step < 10; step++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'test_hero');
      positions.push({ x: h!.pos.x, y: h!.pos.y, step });

    }
    

    let bounceDetected = false;
    let lastY = positions[0].y;
    let direction = 0; // -1 for up, 1 for down, 0 for no change
    
    for (let i = 1; i < positions.length; i++) {
      const currentY = positions[i].y;
      const deltaY = currentY - lastY;
      
      if (Math.abs(deltaY) > 0.01) {
        const currentDirection = deltaY > 0 ? 1 : -1;
        if (direction !== 0 && direction !== currentDirection) {

          bounceDetected = true;
        }
        direction = currentDirection;
      }
      
      lastY = currentY;
    }
    
    expect(bounceDetected).toBe(false);
    

    playerControl.setKeyState('w', false);
    playerControl.setKeyState('s', true);
    

    for (let step = 10; step < 20; step++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'test_hero');

    }
  });
});