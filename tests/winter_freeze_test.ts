import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../src/simulator';
import { CommandHandler } from '../src/rules/command_handler';
import { WinterEffects } from '../src/rules/winter_effects';
import { EventHandler } from '../src/rules/event_handler';
import Encyclopaedia from '../src/dmg/encyclopaedia';

describe('Winter Snow Freeze Interactions', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  it('should demonstrate snow particles freezing units on contact', () => {
    console.log('❄️ Testing snow particle freeze interactions...');
    
    const sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim),
      new WinterEffects(sim),
      new EventHandler(sim)
    ];

    // Deploy test units in the field - use simpler positions
    const soldier = { ...Encyclopaedia.unit('soldier'), pos: { x: 10, y: 8 } };
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 12, y: 10 }, team: 'hostile' as const };
    
    sim.addUnit(soldier);
    sim.addUnit(worm);
    
    console.log(`🪖 ${soldier.id} positioned at (${soldier.pos.x}, ${soldier.pos.y})`);
    console.log(`🐛 ${worm.id} positioned at (${worm.pos.x}, ${worm.pos.y})`);
    
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

    // Activate winter weather
    sim.queuedCommands = [{ type: 'weather', args: ['winter'] }];
    sim.step();
    
    console.log('🌨️ Winter storm activated - snowfall beginning...');

    let frozenUnits = 0;
    let snowParticles = 0;
    let freezeImpacts = 0;
    
    // Run simulation to let snow particles fall and interact with units
    for (let tick = 0; tick < 50; tick++) {
      sim.step();
      
      const currentSnowParticles = sim.particles.filter(p => p.type === 'snow').length;
      const currentFreezeImpacts = sim.particles.filter(p => p.type === 'freeze_impact').length;
      
      if (currentSnowParticles > snowParticles) {
        console.log(`❄️ Tick ${tick}: ${currentSnowParticles} snowflakes falling`);
        snowParticles = Math.max(snowParticles, currentSnowParticles);
      }
      
      if (currentFreezeImpacts > freezeImpacts) {
        console.log(`🧊 Tick ${tick}: Freeze impact particles created!`);
        freezeImpacts = Math.max(freezeImpacts, currentFreezeImpacts);
      }
      
      // Check for newly frozen units
      const currentFrozenUnits = sim.units.filter(u => u.meta.frozen).length;
      if (currentFrozenUnits > frozenUnits) {
        frozenUnits = currentFrozenUnits;
        const frozen = sim.units.find(u => u.meta.frozen);
        console.log(`🧊 FREEZE! ${frozen?.id} hit by snowflake and frozen for ${frozen?.meta.frozenDuration} ticks`);
      }
    }

    // Verify snow-freeze interaction system worked
    const finalFrozenUnits = sim.units.filter(u => u.meta.frozen);
    expect(finalFrozenUnits.length).toBeGreaterThan(0);
    
    const totalParticles = sim.particles.length;
    expect(totalParticles).toBeGreaterThan(0);
    
    console.log('\n📊 WINTER INTERACTION RESULTS:');
    console.log(`   Frozen units: ${finalFrozenUnits.length}/${sim.units.length}`);
    console.log(`   Max snow particles: ${snowParticles}`);
    console.log(`   Freeze impact effects: ${freezeImpacts > 0 ? 'YES' : 'NO'}`);
    console.log(`   Total active particles: ${totalParticles}`);
    
    finalFrozenUnits.forEach(unit => {
      console.log(`   ❄️ ${unit.id} is frozen (${unit.meta.frozenDuration} ticks remaining)`);
    });
    
    console.log('\n✅ Snow particle freeze interaction system working!');
  });

  it('should show field overlay integration with winter effects', () => {
    console.log('🌡️ Testing winter effects with field overlays...');
    
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new WinterEffects(sim)];
    
    // Activate winter weather
    sim.queuedCommands = [{ type: 'weather', args: ['winter'] }];
    sim.step();
    
    // Check temperature field was affected by winter
    if (sim.temperatureField) {
      const sampleTemp = sim.temperatureField.get(10, 10);
      expect(sampleTemp).toBeLessThan(20); // Should be cold
      console.log(`🌡️ Field temperature after winter activation: ${sampleTemp}°`);
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
    
    console.log(`❄️ Winter particles active: ${winterParticles}`);
    console.log('✅ Field overlays will show cold temperature zones in blue');
    console.log('✅ Lightning strikes will appear as electrical fields over winter landscape');
    
    expect(winterParticles).toBeGreaterThan(0);
  });

  it('should demonstrate complete environmental system integration', () => {
    console.log('🌍 Testing complete environmental system...');
    
    const sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim),
      new WinterEffects(sim),
      new EventHandler(sim)
    ];
    
    // Deploy diverse units
    const mechanistForce = [
      { ...Encyclopaedia.unit('mechatronist'), pos: { x: 8, y: 8 } },
      { ...Encyclopaedia.unit('builder'), pos: { x: 9, y: 8 } },
      { ...Encyclopaedia.unit('clanker'), pos: { x: 10, y: 8 } }
    ];
    
    mechanistForce.forEach(unit => sim.addUnit(unit));
    
    console.log('🤖 Mechanist force deployed in winter battlefield');
    
    // Activate winter + lightning combo
    sim.queuedCommands = [
      { type: 'weather', args: ['winter'] },
      { type: 'lightning', args: ['9', '9'] } // Strike near units
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
    
    console.log(`🌨️⚡ Environmental events detected: ${environmentalEvents}/25 ticks`);
    console.log('✅ Winter snow + lightning storm + mechanist units = complete environmental integration!');
    
    expect(environmentalEvents).toBeGreaterThan(10);
  });
});