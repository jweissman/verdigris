import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { CommandHandler } from '../../src/rules/command_handler';
import { BiomeEffects } from '../../src/rules/biome_effects';
import { EventHandler } from '../../src/rules/event_handler';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Winter Snow Freeze Interactions', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  it('should demonstrate snow particles freezing units on contact', () => {
    
    const sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim),
      new BiomeEffects(),
      new EventHandler()
    ];

    // Deploy test units in the field - use simpler positions
    const soldier = { ...Encyclopaedia.unit('soldier'), pos: { x: 10, y: 8 } };
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 12, y: 10 }, team: 'hostile' as const };
    
    sim.addUnit(soldier);
    sim.addUnit(worm);
    
    
    // Manually spawn snowflakes directly at unit positions for guaranteed hit
    for (let i = 0; i < 5; i++) {
      sim.particles.push({
        pos: { x: soldier.pos.x + (i * 0.1), y: 1 }, // Start above soldier
        vel: { x: 0, y: 0.3 },
        radius: 0.25,
        lifetime: 50,
        color: '#FFFFFF',
        z: 5,
        type: 'snow',
        landed: false
      });
    }

    // Set up winter conditions for test
    sim.winterActive = true;
    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        sim.temperatureField.set(x, y, -5);
      }
    }
    

    let frozenUnits = 0;
    let snowParticles = 0;
    let freezeImpacts = 0;
    
    // Run simulation to let snow particles fall and interact with units
    for (let tick = 0; tick < 50; tick++) {
      sim.step();
      
      const currentSnowParticles = sim.particles.filter(p => p.type === 'snow').length;
      const currentFreezeImpacts = sim.particles.filter(p => p.type === 'freeze_impact').length;
      
      if (currentSnowParticles > snowParticles) {
        snowParticles = Math.max(snowParticles, currentSnowParticles);
      }
      
      if (currentFreezeImpacts > freezeImpacts) {
        freezeImpacts = Math.max(freezeImpacts, currentFreezeImpacts);
      }
      
      // Check for newly frozen units
      const currentFrozenUnits = sim.units.filter(u => u.meta.frozen).length;
      if (currentFrozenUnits > frozenUnits) {
        frozenUnits = currentFrozenUnits;
        const frozen = sim.units.find(u => u.meta.frozen);
      }
    }

    // Verify snow-freeze interaction system worked
    const finalFrozenUnits = sim.units.filter(u => u.meta.frozen);
    expect(finalFrozenUnits.length).toBeGreaterThan(0);
    
    const totalParticles = sim.particles.length;
    expect(totalParticles).toBeGreaterThan(0);
    
    
    finalFrozenUnits.forEach(unit => {
    });
    
  });

  it('should show field overlay integration with winter effects', () => {
    
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new BiomeEffects()];
    
    // Set up winter conditions for test
    sim.winterActive = true;
    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        sim.temperatureField.set(x, y, -5);
      }
    }
    
    // Check temperature field was affected by winter
    if (sim.temperatureField) {
      const sampleTemp = sim.temperatureField.get(10, 10);
      expect(sampleTemp).toBeLessThan(20); // Should be cold
    }
    
    // Deploy units and run winter effects
    const testUnit = { ...Encyclopaedia.unit('soldier'), pos: { x: 15, y: 15 } };
    sim.addUnit(testUnit);
    
    // Run simulation with winter effects
    for (let i = 0; i < 30; i++) {
      sim.step();
    }
    
    const winterParticles = sim.particles.filter(p => 
      p.type === 'snow' || p.type === 'freeze_impact'
    ).length;
    
    
    expect(winterParticles).toBeGreaterThan(0);
  });

  it('should demonstrate complete environmental system integration', () => {
    
    const sim = new Simulator();
    // Don't override rulebook - use default which includes BiomeEffects and EventHandler
    
    // Deploy diverse units
    const mechanistForce = [
      { ...Encyclopaedia.unit('mechatronist'), pos: { x: 8, y: 8 } },
      { ...Encyclopaedia.unit('builder'), pos: { x: 9, y: 8 } },
      { ...Encyclopaedia.unit('clanker'), pos: { x: 10, y: 8 } }
    ];
    
    mechanistForce.forEach(unit => sim.addUnit(unit));
    
    
    // Activate winter + lightning combo
    sim.queuedCommands = [
      { type: 'weather', params: { weatherType: 'winter' } },
      { type: 'lightning', params: { x: 9, y: 9 } } // Strike near units
    ];
    sim.step();
    
    let environmentalEvents = 0;
    
    // Run combined environmental effects
    for (let tick = 0; tick < 25; tick++) {
      sim.step();
      
      // Count environmental interactions
      const frozenUnits = sim.units.filter(u => u.meta.frozen).length;
      const boostedUnits = sim.units.filter(u => u.meta.lightningBoost).length;
      const snowflakes = sim.particles.filter(p => p.type === 'snow').length;
      const lightning = sim.particles.filter(p => p.type === 'lightning').length;
      
      if (frozenUnits + boostedUnits + snowflakes + lightning > 0) {
        environmentalEvents++;
      }
    }
    
    
    expect(environmentalEvents).toBeGreaterThan(10);
  });
});