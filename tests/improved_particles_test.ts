import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import { WinterEffects } from '../src/rules/winter_effects';
import { EventHandler } from '../src/rules/event_handler';

describe('Improved Particle System', () => {
  it('should create single-pixel snowflakes with vertical fall', () => {
    const sim = new Simulator();
    sim.rulebook = [new WinterEffects(sim), new EventHandler(sim)];
    for (let tick = 0; tick < 10; tick++) {
      sim.step();
    }
    
    const snowflakes = sim.particles.filter(p => p.type === 'snow');
    expect(snowflakes.length).toBeGreaterThan(0);
    
    const snowflake = snowflakes[0];
    expect(snowflake.radius).toBe(0.25); // Single pixel
    expect(snowflake.vel.x).toBe(0); // Pure vertical fall
    expect(snowflake.vel.y).toBe(0.15); // Slower fall
    expect(snowflake.color).toBe('#FFFFFF');
    expect(snowflake.targetCell).toBeDefined();
  });
  
  it('should make snowflakes land at specific cells', () => {
    const sim = new Simulator();
    sim.rulebook = [new WinterEffects(sim), new EventHandler(sim)];
    
    // Create a snowflake manually at almost-landed position
    sim.particles.push({
      pos: { x: 5, y: sim.fieldHeight - 0.2 },
      vel: { x: 0, y: 0.15 },
      radius: 0.25,
      lifetime: 300,
      color: '#FFFFFF',
      z: 5,
      type: 'snow',
      landed: false,
      targetCell: { x: 5, y: sim.fieldHeight - 1 }
    });
    
    
    // Step simulation to make it land
    sim.step();
    
    const snowflake = sim.particles[0];
    expect(snowflake.landed).toBe(true);
    expect(snowflake.pos.y).toBe(sim.fieldHeight - 1); // Should be at ground level
    expect(snowflake.vel.y).toBe(0); // Should stop moving
    
  });
});