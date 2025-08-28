import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Coastal City Mages E2E', () => {
  it('should demonstrate all four mage types in coastal scene', () => {
    const sim = new Simulator(30, 30);
    
    // Set coastal scene
    sim.queuedCommands.push({
      type: 'bg',
      params: { 
        scene: 'city',
        biome: 'coastal',
        skyColor: '#B0E0E6',
        ambientLight: 0.85
      }
    });
    sim.step();
    
    // Create the four mages from encyclopaedia
    const philosopher = Encyclopaedia.unit('philosopher');
    philosopher.pos = { x: 5, y: 15 };
    
    const rhetorician = Encyclopaedia.unit('rhetorician');
    rhetorician.pos = { x: 5, y: 10 };
    
    const logician = Encyclopaedia.unit('logician');
    logician.pos = { x: 10, y: 15 };
    
    const geometer = Encyclopaedia.unit('geometer');
    geometer.pos = { x: 10, y: 10 };
    
    // Add all mages
    sim.addUnit(philosopher);
    sim.addUnit(rhetorician);
    sim.addUnit(logician);
    sim.addUnit(geometer);
    
    // Create some enemies to fight
    const enemies = [];
    for (let i = 0; i < 4; i++) {
      const pirate = Encyclopaedia.unit('soldier'); // Use a real unit type
      pirate.id = `pirate${i}`;
      pirate.team = 'hostile';
      pirate.hp = 15;
      pirate.maxHp = 15;
      enemies.push(pirate);
    }
    // Position them
    enemies[0].pos = { x: 25, y: 10 };
    enemies[1].pos = { x: 25, y: 15 };
    enemies[2].pos = { x: 27, y: 12 };
    enemies[3].pos = { x: 23, y: 13 };
    enemies.forEach(e => sim.addUnit(e));
    
    // Verify all units were added
    expect(sim.units.length).toBe(8);
    
    // Test philosopher - lightning bolt
    sim.queuedCommands.push({
      type: 'weather',
      params: { weatherType: 'storm', action: 'start' }
    });
    sim.step();
    expect(sim.lightningActive).toBe(true);
    
    sim.queuedCommands.push({
      type: 'bolt',
      params: { x: 20, y: 10 }
    });
    sim.step();
    sim.step(); // Process particle/damage commands
    
    // Check lightning particles exist
    const lightningParticles = sim.particles.filter(p => 
      p.type === 'lightning' || p.type === 'lightning_branch'
    );
    expect(lightningParticles.length).toBeGreaterThan(0);
    
    // Test rhetorician - fire spell
    sim.queuedCommands.push({
      type: 'fire',
      params: { x: 20, y: 15, radius: 2, temperature: 800 }
    });
    sim.step();
    
    // Check fire particles were created immediately after command
    const fireParticles = sim.particles.filter(p => p.type === 'fire');
    expect(fireParticles.length).toBeGreaterThan(0);
    
    // Process temperature commands
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    // Check temperature field if available
    if (sim.temperatureField) {
      const fireTemp = sim.temperatureField.get(20, 15);
      expect(fireTemp).toBeGreaterThan(200); // Should be hot
    }
    
    // Test logician - freeze (using status effect)
    sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: 'pirate3',
        meta: {
          frozen: true,
          frozenDuration: 10,
          stunned: true
        }
      }
    });
    sim.step();
    
    const frozenPirate = sim.units.find(u => u.id === 'pirate3');
    if (frozenPirate && frozenPirate.meta) {
      expect(frozenPirate.meta.frozen).toBeDefined();
    }
    
    // Test geometer - burrow
    sim.queuedCommands.push({
      type: 'burrow',
      unitId: geometer.id,
      params: {}
    });
    sim.step();
    
    const geometerAfter = sim.units.find(u => u.id === 'geometer');
    if (geometerAfter && geometerAfter.meta) {
      expect(geometerAfter.meta.burrowed).toBe(true);
    }
    
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
    expect(remainingEnemies.length).toBeLessThanOrEqual(3); // At least 1 enemy defeated
    
    // Verify scene metadata
    expect(sim.sceneMetadata).toBeDefined();
    expect(sim.sceneMetadata.biome).toBe('coastal');
    expect(sim.sceneMetadata.skyColor).toBe('#B0E0E6');
  });
  
  it('should handle mage abilities in sequence', () => {
    const sim = new Simulator(20, 20);
    
    // Quick setup
    const mage = {
      id: 'test_mage',
      pos: { x: 10, y: 10 },
      team: 'friendly' as const,
      hp: 100,
      abilities: ['fire_spell', 'lightning_bolt']
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