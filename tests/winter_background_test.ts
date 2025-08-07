import { describe, expect, it } from 'bun:test';
import { SceneLoader } from '../src/scene_loader';
import { Simulator } from '../src/simulator';

describe('Winter Background Integration', () => {
  it('should load winter background in toymaker scenario', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    console.log('🏔️ Testing winter background integration');
    
    // Load the toymaker scenario
    loader.loadScenario('toymaker');
    
    // Verify background was set correctly
    expect(sim.sceneBackground).toBe('winter');
    console.log(`✅ Scene background set to: ${sim.sceneBackground}`);
    
    // Verify units were loaded (toymaker + worms)
    expect(sim.units.length).toBeGreaterThan(0);
    
    // Find the toymaker
    const toymaker = sim.units.find(u => u.id.includes('toymaker'));
    expect(toymaker).toBeDefined();
    console.log(`✅ Toymaker loaded at (${toymaker?.pos.x}, ${toymaker?.pos.y})`);
    
    // Find enemies  
    const enemies = sim.units.filter(u => u.team === 'hostile');
    expect(enemies.length).toBeGreaterThan(0);
    console.log(`✅ ${enemies.length} enemy units loaded`);
    
    console.log('🎨 Winter background integration verified!');
  });
});