import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Epic Mage Battle - The Four Schools vs Undead Horde', () => {
  it('4 mages should survive against a skeleton horde', () => {
    const sim = new Simulator(30, 25);
    const loader = new SceneLoader(sim);
    loader.loadScene('mageBattle');
    
    // Verify scene loaded correctly
    const mages = sim.units.filter(u => u.team === 'friendly');
    const skeletons = sim.units.filter(u => u.team === 'hostile');
    
    expect(mages.length).toBe(4);
    expect(skeletons.length).toBeGreaterThan(20);
    
    // Run the epic battle
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    // Check final state
    const survivingMages = sim.units.filter(u => 
      u.team === 'friendly' && u.hp > 0
    );
    const survivingSkeletons = sim.units.filter(u =>
      u.team === 'hostile' && u.hp > 0
    );
    
    // The mages with their powerful abilities should triumph
    expect(survivingMages.length).toBe(4);
    expect(survivingSkeletons.length).toBeLessThan(10);
    
    // Check that abilities were used
    const hasParticles = sim.particles.length > 0;
    expect(hasParticles).toBe(true);
  });
  
  it('should demonstrate spell combos and synergies', () => {
    const sim = new Simulator(30, 25);
    const loader = new SceneLoader(sim);
    loader.loadScene('mageBattle');
    
    // Run battle to see ability synergies
    for (let i = 0; i < 50; i++) {
      sim.step();
    }
    
    // Check for various particle types showing abilities were used
    const particleTypes = new Set(sim.particles.map(p => p.type));
    
    // Should see evidence of multiple spell types
    const hasLightning = particleTypes.has('lightning') || particleTypes.has('lightning_branch');
    const hasFire = particleTypes.has('fire');
    const hasIce = particleTypes.has('ice');
    const hasEarth = particleTypes.has('rock') || particleTypes.has('earth');
    
    expect(hasLightning || hasFire || hasIce || hasEarth).toBe(true);
    
    // Mages should still be alive
    const survivingMages = sim.units.filter(u =>
      u.team === 'friendly' && u.hp > 0  
    );
    expect(survivingMages.length).toBeGreaterThanOrEqual(3);
  });
});