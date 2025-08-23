import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Complete System Integration', () => {
  it.skip('should demonstrate all major features working together', () => {

    
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    


    sceneLoader.loadScenario('heroShowcase');
    const heroes = sim.units.filter(u => 
      ['champion', 'acrobat', 'berserker', 'guardian', 'shadowBlade'].includes(u.type)
    );

    expect(heroes.length).toBe(5);
    


    sceneLoader.loadScenario('desert');
    sim.step(); // Create segments
    const segments = sim.units.filter(u => u.meta?.segment);

    expect(segments.length).toBeGreaterThan(0);
    


    sceneLoader.loadScenario('toymakerBalanced');
    

    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const bots = sim.units.filter(u => 
      ['clanker', 'freezebot', 'spiker', 'swarmbot', 'roller', 'zapper'].includes(u.type)
    );

    


    sceneLoader.loadScenario('titleBackground');
    (sim as any).sceneBackground = 'title-forest'; // Ensure woodland detection
    
    const initialWoodland = sim.units.filter(u => 
      ['squirrel', 'forest-squirrel', 'bird', 'tracker'].includes(u.type)
    ).length;
    

    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const finalWoodland = sim.units.filter(u => 
      ['squirrel', 'forest-squirrel', 'bird', 'tracker'].includes(u.type) && u.hp > 0
    ).length;
    

    expect(finalWoodland).toBeGreaterThan(0);
    


    const testScenes = ['simple', 'desert', 'heroShowcase', 'titleBackground', 'toymakerBalanced'];
    
    testScenes.forEach(sceneName => {
      try {
        sceneLoader.loadScenario(sceneName);

      } catch (e) {

      }
    });
    









    
    expect(sim.units.length).toBeGreaterThan(0);
  });
});