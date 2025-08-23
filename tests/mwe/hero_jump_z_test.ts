import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { Jumping } from '../../src/rules/jumping';

describe('Hero Jump Z-axis', () => {
  test('hero jump sets z coordinate', () => {
    const sim = new Simulator(40, 40);
    
    // Add Jumping rule so jumps actually work
    sim.rulebook.push(new Jumping());
    
    const hero = sim.addUnit({
      id: 'jumping_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero']
    });
    
    // console.log('Initial hero:', { pos: hero.pos, z: hero.meta?.z });
    
    // Queue jump command
    sim.queuedCommands.push({
      type: 'jump',
      unitId: 'jumping_hero',
      params: {
        distance: 4,
        height: 5
      }
    });
    
    // Step once to initiate jump
    sim.step();
    
    const heroAfterStart = sim.units.find(u => u.id === 'jumping_hero');
    // console.log('After jump start:', { 
    //   pos: heroAfterStart?.pos, 
    //   z: heroAfterStart?.meta?.z,
    //   jumping: heroAfterStart?.meta?.jumping,
    //   jumpProgress: heroAfterStart?.meta?.jumpProgress
    // });
    
    // Step through jump animation (increased duration to 20 ticks)
    for (let i = 0; i < 25; i++) {
      sim.step();
      const h = sim.units.find(u => u.id === 'jumping_hero');
      // console.log(`Step ${i+1}: x=${h?.pos.x?.toFixed(1)}, y=${h?.pos.y}, z=${h?.meta?.z?.toFixed(2)}, jumping=${h?.meta?.jumping}`);
      
      // Check that Z goes up during jump
      if (i === 3) { // Peak of jump (step 4 in output)
        expect(h?.meta?.z).toBeGreaterThan(2);
      }
      
      // Break when jump finishes
      if (!h?.meta?.jumping) {
        break;
      }
    }
    
    const heroFinal = sim.units.find(u => u.id === 'jumping_hero');
    // console.log('Final hero:', { 
    //   pos: heroFinal?.pos, 
    //   z: heroFinal?.meta?.z,
    //   jumping: heroFinal?.meta?.jumping
    // });
    
    // Should have moved and landed
    expect(heroFinal?.pos.x).toBeGreaterThan(10);
    expect(heroFinal?.meta?.z).toBe(0);
    expect(heroFinal?.meta?.jumping).toBe(false);
  });
});