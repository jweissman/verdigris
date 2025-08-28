import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Coastal City Mages E2E', () => {
  it('should demonstrate all four mage types in coastal scene', () => {
    const sim = new Simulator(30, 25);
    const loader = new SceneLoader(sim);
    loader.loadScene('coastalMages');
    
    // Verify all units were added
    const mages = sim.units.filter(u => u.team === 'friendly');
    const enemies = sim.units.filter(u => u.team === 'hostile');
    
    expect(mages.length).toBe(4);
    expect(enemies.length).toBeGreaterThan(0);
    
    // Run combat simulation - let abilities trigger
    for (let i = 0; i < 40; i++) {
      sim.step();
    }
    
    // Check that combat occurred
    const remainingEnemies = sim.units.filter(u => 
      u.team === 'hostile' && u.hp > 0
    );
    const remainingMages = sim.units.filter(u => 
      u.team === 'friendly' && u.hp > 0
    );
    
    // All mages should survive with their powerful abilities
    expect(remainingMages.length).toBe(4);
    
    // Enemies should be damaged or defeated
    expect(remainingEnemies.length).toBeLessThanOrEqual(3); // At least some enemies defeated
    
    // Verify scene metadata
    expect(sim.sceneMetadata).toBeDefined();
  });
  
  it('should handle mage abilities in sequence', () => {
    const sim = new Simulator(20, 20);
    const loader = new SceneLoader(sim);
    
    // Quick setup with just two units
    const mage = {
      id: 'test_mage',
      pos: { x: 10, y: 10 },
      team: 'friendly' as const,
      hp: 100,
      abilities: ['fire', 'bolt']
    };
    
    const target = {
      id: 'target',
      pos: { x: 15, y: 10 },
      team: 'hostile' as const,
      hp: 100
    };
    
    sim.addUnit(mage);
    sim.addUnit(target);
    
    // Cast fire then lightning in sequence
    sim.queuedCommands.push({
      type: 'fire',
      params: { x: 15, y: 10 }
    });
    sim.step();
    
    sim.queuedCommands.push({
      type: 'bolt',
      params: { x: 15, y: 10 }
    });
    sim.step();
    
    // Both particle types should exist
    const hasFireParticles = sim.particles.some(p => p.type === 'fire');
    const hasLightningParticles = sim.particles.some(p => 
      p.type === 'lightning' || p.type === 'lightning_branch'
    );
    
    expect(hasFireParticles).toBe(true);
    expect(hasLightningParticles).toBe(true);
  });
});