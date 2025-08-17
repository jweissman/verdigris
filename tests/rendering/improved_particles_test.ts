import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { BiomeEffects } from '../../src/rules/biome_effects';

describe('Improved Particle System', () => {
  it('should create single-pixel snowflakes with vertical fall', () => {
    const sim = new Simulator();

    

    sim.queuedCommands.push(...BiomeEffects.winterStormCommands());
    sim.step(); // Process the weather command
    

    sim.winterActive = true;
    

    for (let tick = 0; tick < 10; tick++) {
      sim.step();
    }
    
    const snowflakes = sim.particles.filter(p => p.type === 'snow');
    expect(snowflakes.length).toBeGreaterThan(0);
    
    const snowflake = snowflakes[0];
    expect(snowflake.radius).toBe(0.25); // Single pixel
    expect(snowflake.vel.x).toBe(0); // Pure vertical fall
    expect(snowflake.vel.y).toBeCloseTo(0.15, 5); // Slower fall (floating point)
    expect(snowflake.color).toBe('#FFFFFF');

  });
  
  it('should make snowflakes land at specific cells', () => {
    const sim = new Simulator();

    

    sim.particleArrays.addParticle({
      pos: { x: 5, y: sim.fieldHeight * 8 - 1.1 }, // In pixels, will land after one step with vel 0.15
      vel: { x: 0, y: 0.15 },
      radius: 0.25,
      lifetime: 300,
      color: '#FFFFFF',
      z: 5,
      type: 'snow',
      landed: false,
      targetCell: { x: 5, y: sim.fieldHeight - 1 }
    });
    
    

    sim.step();
    
    const particles = sim.particles.filter(p => p.type === 'snow');
    expect(particles.length).toBeGreaterThan(0);
    const snowflake = particles[0];
    expect(snowflake.landed).toBe(true);
    expect(snowflake.pos.y).toBe(sim.fieldHeight * 8 - 1); // Should be at ground level in pixels
    expect(snowflake.vel.y).toBe(0); // Should stop moving
    
  });
});