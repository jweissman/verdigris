import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { PlayerControl } from '../../src/rules/player_control';

describe('Complete Hero Test', () => {
  test('test all hero functionality like in MWE', () => {
    const sim = new Simulator(40, 40);
    
    const playerControl = sim.rules.find(r => r.constructor === PlayerControl) as any;
    

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
    






    

    sim.step();
    let h = sim.units.find(u => u.id === 'hero');




    


    playerControl.setKeyState('w', true);
    
    for (let step = 0; step < 8; step++) {
      sim.step();
      h = sim.units.find(u => u.id === 'hero');
      if (step === 0 || step === 4 || step === 7) {

      }
    }
    
    playerControl.setKeyState('w', false);
    


    const beforeJump = sim.units.find(u => u.id === 'hero');

    
    playerControl.setKeyState(' ', true);
    
    let maxZ = 0;
    let jumpSteps = 0;
    for (let step = 0; step < 20; step++) {
      sim.step();
      h = sim.units.find(u => u.id === 'hero');
      
      if (h?.meta?.z > maxZ) maxZ = h.meta.z;
      
      if (h?.meta?.jumping) {
        jumpSteps++;
        if (step % 5 === 0) {

        }
      } else if (jumpSteps > 0) {

        break;
      }
    }
    
    playerControl.setKeyState(' ', false);
    

    
    const final = sim.units.find(u => u.id === 'hero');





    

    expect(final?.meta?.rig).toBeDefined();
    expect(maxZ).toBeGreaterThan(3);
    expect(final?.meta?.jumping).toBe(false);
  });
});