import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';
import { Jukebox } from '../../src/audio/jukebox';

describe('Forest Emotional Moment Integration', () => {
  it('should create a complete forest experience with creatures, weather, and audio', () => {
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    const jukebox = new Jukebox();
    
    // Load the forest-day scene
    sceneLoader.loadScenario('forestDay');
    
    // Verify forest creatures are present
    const forestCreatures = sim.units.filter(u => 
      u.sprite === 'megasquirrel' || 
      u.sprite === 'bear' ||
      u.sprite === 'owl' ||
      u.sprite === 'squirrel' ||
      u.tags?.includes('forest')
    );
    
    expect(forestCreatures.length).toBeGreaterThan(0);
    console.debug(`🌲 Forest creatures loaded: ${forestCreatures.length}`);
    
    // Verify background is set to forest
    expect(sim.background).toBe('forest');
    expect(sim.sceneBackground).toBe('forest');
    
    // Verify weather effects
    expect(sim.weather.current).toBe('leaves');
    expect(sim.weather.intensity).toBeGreaterThan(0);
    
    // Test jukebox forest sounds
    expect(() => jukebox.playBirdSong()).not.toThrow();
    expect(() => jukebox.playForestAmbience()).not.toThrow();
    expect(() => jukebox.startForestMusic()).not.toThrow();
    
    // Run a few steps to let weather particles generate
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    // Check for weather particles (leaves)
    const weatherParticles = sim.particles.filter(p => 
      p.type === 'leaf' || p.type === 'leaves'
    );
    
    expect(weatherParticles.length).toBeGreaterThan(0);
    console.debug(`🍃 Weather particles: ${weatherParticles.length}`);
    
    // Test that forest creatures behave naturally (no aggressive movement)
    const peacefulCreatures = sim.units.filter(u => 
      u.posture === 'wait' || u.intendedMove.x === 0 && u.intendedMove.y === 0
    );
    
    expect(peacefulCreatures.length).toBeGreaterThan(0);
    console.debug(`🕊️ Peaceful creatures: ${peacefulCreatures.length}`);
    
    console.debug('✨ Forest emotional moment test complete - scene is ready for user testing!');
  });
  
  it('should have proper creature sprites and forest atmosphere', () => {
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    
    sceneLoader.loadScenario('forestDay');
    
    // Check for specific forest creature types (based on scene_loader mapping)
    const creatures = {
      megasquirrel: sim.units.filter(u => u.type === 'megasquirrel').length,
      bear: sim.units.filter(u => u.type === 'bear').length,
      owl: sim.units.filter(u => u.type === 'owl').length,
      squirrel: sim.units.filter(u => u.type === 'squirrel').length,
      tracker: sim.units.filter(u => u.type === 'tracker').length,
      'forest-squirrel': sim.units.filter(u => u.type === 'forest-squirrel').length
    };
    
    console.debug('🦌 Forest creature census:', creatures);
    console.debug
    // Should have a variety of creatures
    const creatureTypes = Object.values(creatures).filter(count => count > 0).length;
    expect(creatureTypes).toBeGreaterThanOrEqual(3);
    
    // Should have weather settings appropriate for forest
    if (sim.weather.temperature) {
      expect(sim.weather.temperature).toBe(18); // Mild forest temperature  
    }
    expect(sim.weather.current).toBe('leaves');
    
    // Should use wide battle strip for better creature visibility
    expect(sim.stripWidth).toBe('wide');
  });
});