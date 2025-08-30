import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroAnimation } from '../../src/rules/hero_animation';
import { Jumping } from '../../src/rules/jumping';
import { MeleeCombat } from '../../src/rules/melee_combat';

describe('Hero MWE Debug', () => {
  test('check initial state for unexpected units', () => {
    const sim = new Simulator(40, 25);
    
    // Add hero
    sim.addUnit({
      id: "hero",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 100,
      sprite: "hero",
      tags: ["hero"],
      meta: {
        controlled: true,
      },
    });
    
    // Step once to see what happens
    sim.step();
    expect(sim.units.length).toBe(1); // Should only have hero
  });
});