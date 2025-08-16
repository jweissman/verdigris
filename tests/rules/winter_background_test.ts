import { describe, expect, it } from 'bun:test';
import { SceneLoader } from '../../src/core/scene_loader';
import { Simulator } from '../../src/core/simulator';

describe('Winter Background Integration', () => {
  it('should load winter background in toymaker scenario', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    

    loader.loadScenario('toymaker');
    

    expect(sim.sceneBackground).toBe('winter');
    

    expect(sim.units.length).toBeGreaterThan(0);
    

    const toymaker = sim.units.find(u => u.id.includes('toymaker'));
    expect(toymaker).toBeDefined();
    

    const enemies = sim.units.filter(u => u.team === 'hostile');
    expect(enemies.length).toBeGreaterThan(0);
    
  });
});