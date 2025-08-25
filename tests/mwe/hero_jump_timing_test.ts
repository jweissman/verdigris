import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Hero Jump Timing', () => {
  test('hero jump should complete in reasonable time', () => {
    const sim = new Simulator(40, 40);
    
    const hero = sim.addUnit({
      id: 'timing_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    

    

    sim.queuedCommands.push({
      type: 'jump',
      unitId: 'timing_hero',
      params: {
        distance: 3,
        height: 10
      }
    });
    
    let jumpStarted = false;
    let jumpCompleted = false;
    let completionTime = 0;
    let maxZ = 0;
    
    for (let i = 0; i < 30; i++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'timing_hero');
      
      if (h?.meta?.jumping && !jumpStarted) {
        jumpStarted = true;

      }
      
      if (h?.meta?.z > maxZ) {
        maxZ = h.meta.z;
      }
      
      if (jumpStarted && !h?.meta?.jumping && !jumpCompleted) {
        jumpCompleted = true;
        completionTime = i;

        break;
      }
      
      if (i % 5 === 0 && h?.meta?.jumping) {

      }
    }
    
    expect(jumpStarted).toBe(true);
    expect(jumpCompleted).toBe(true);
    expect(completionTime).toBeLessThan(25); // Should complete in reasonable time
    expect(maxZ).toBeGreaterThan(5); // Should reach decent height
  });
});