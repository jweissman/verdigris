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
    
    // Check for any unexpected units
    console.log('Units after first step:');
    for (const unit of sim.units) {
      console.log(`- ${unit.id} [${unit.sprite}] at (${unit.pos.x}, ${unit.pos.y})`);
    }
    
    // Check for particles
    console.log('Particles:', sim.particles.length);
    if (sim.particles.length > 0) {
      console.log('Particle types:', sim.particles.map(p => p.type));
    }
    
    expect(sim.units.length).toBe(1); // Should only have hero
  });
});