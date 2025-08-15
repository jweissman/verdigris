import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';
import { BiomeEffects } from '../../src/rules/biome_effects';

describe('Toymaker Scene Integration', () => {
  it('should load toymaker scene with proper sprites and winter effects', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    // Load toymaker scene
    loader.loadScenario('toymaker');
    
    // Verify scene loaded
    expect(sim.units.length).toBe(16); // 1 toymaker + 15 worms
    
    const toymaker = sim.units.find(u => u.tags?.includes('craftor'));
    const enemies = sim.units.filter(u => u.team === 'hostile');
    
    expect(toymaker).toBeDefined();
    expect(toymaker?.sprite).toBe('toymaker'); // Toymaker sprite
    expect(enemies.length).toBe(15);
    
    // Start winter effects
    BiomeEffects.createWinterStorm(sim);
    
    // Run a few simulation steps
    
    let constructsDeployed = [];
    let snowflakesGenerated = 0;
    
    for (let i = 0; i < 20; i++) {
      const beforeUnits = sim.units.length;
      const beforeSnow = sim.particles.filter(p => p.type === 'snow').length;
      
      sim.step();
      
      // Check for construct deployment
      const afterUnits = sim.units.length;
      if (afterUnits > beforeUnits) {
        const newConstruct = sim.units.find(u => u.tags?.includes('construct'));
        if (newConstruct) {
          constructsDeployed.push({
            tick: i,
            type: newConstruct.sprite,
            position: `(${newConstruct.pos.x}, ${newConstruct.pos.y})`
          });
        }
      }
      
      // Check snowfall generation
      const afterSnow = sim.particles.filter(p => p.type === 'snow').length;
      if (afterSnow > beforeSnow) {
        snowflakesGenerated += (afterSnow - beforeSnow);
      }
    }
    
    // Verify winter effects are working
    expect(snowflakesGenerated).toBeGreaterThan(0);
    const snowflakes = sim.particles.filter(p => p.type === 'snow');
    expect(snowflakes.length).toBeGreaterThan(0);
    
    // Check snowflake properties
    if (snowflakes.length > 0) {
      expect(snowflakes[0].radius).toBeLessThanOrEqual(0.5); // Single pixel
      expect(snowflakes[0].color).toBe('#FFFFFF');
      expect(snowflakes[0].vel.y).toBeGreaterThan(0); // Falling down
      expect(Math.abs(snowflakes[0].vel.x)).toBeLessThan(0.1); // Gentle drift
    }
    
    
    if (constructsDeployed.length > 0) {
    }
  });

  it('should verify snowflake physics and rendering properties', () => {
    const sim = new Simulator();
    sim.rulebook = [new WinterEffects(sim)];
    
    // Run until we have snowflakes
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const snowflakes = sim.particles.filter(p => p.type === 'snow');
    expect(snowflakes.length).toBeGreaterThan(0);
    
    // Test snowflake properties for single-pixel rendering
    snowflakes.forEach((flake, index) => {
      expect(flake.radius).toBeLessThanOrEqual(0.5); // Single pixel max
      expect(flake.color).toBe('#FFFFFF');
      expect(flake.lifetime).toBeGreaterThan(50); // Reasonable lifetime
      expect(flake.vel.y).toBeGreaterThan(0); // Always falling
      expect(flake.vel.y).toBeLessThan(1); // Not too fast
      expect(Math.abs(flake.vel.x)).toBeLessThan(0.1); // Minimal horizontal drift
      
      if (index === 0) {
      }
    });
  });
});