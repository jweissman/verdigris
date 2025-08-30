import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';
import { Jukebox } from '../../src/audio/jukebox';

describe('Forest Emotional Moment Integration', () => {
  it('should create a complete forest experience with creatures, weather, and audio', () => {
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    const jukebox = new Jukebox();
    

    sceneLoader.loadScenario('forestDay');
    

    const forestCreatures = sim.units.filter(u => 
      u.sprite === 'megasquirrel' || 
      u.sprite === 'bear' ||
      u.sprite === 'owl' ||
      u.sprite === 'squirrel' ||
      u.tags?.includes('forest')
    );
    
    expect(forestCreatures.length).toBeGreaterThan(0);
    


    expect(sim.sceneBackground).toBe('forest');
    

    expect(sim.weather.current).toBe('leaves');
    expect(sim.weather.intensity).toBeGreaterThan(0);
    

    expect(() => jukebox.playBirdSong()).not.toThrow();
    expect(() => jukebox.playForestAmbience()).not.toThrow();
    expect(() => jukebox.startForestMusic()).not.toThrow();
    

    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    

    const weatherParticles = sim.particles.filter(p => 
      p.type === 'leaf' // 'leaves' not a valid particle type
    );
    
    expect(weatherParticles.length).toBeGreaterThan(0);
    console.debug(`🍃 Weather particles: ${weatherParticles.length}`);
    

    const peacefulCreatures = sim.units.filter(u => 
      u.posture === 'wait' || u.intendedMove.x === 0 && u.intendedMove.y === 0
    );
    
    expect(peacefulCreatures.length).toBeGreaterThan(0);
  });
  
  it('should have proper creature sprites and forest atmosphere', () => {
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    
    sceneLoader.loadScenario('forestDay');
    

    const creatures = {
      megasquirrel: sim.units.filter(u => u.type === 'megasquirrel').length,
      bear: sim.units.filter(u => u.type === 'bear').length,
      owl: sim.units.filter(u => u.type === 'owl').length,
      squirrel: sim.units.filter(u => u.type === 'squirrel').length,
      tracker: sim.units.filter(u => u.type === 'tracker').length,
      'forest-squirrel': sim.units.filter(u => u.type === 'forest-squirrel').length
    };
    

    const creatureTypes = Object.values(creatures).filter(count => count > 0).length;
    expect(creatureTypes).toBeGreaterThanOrEqual(3);
    




    expect(sim.weather.current).toBe('leaves');
    


  });
});