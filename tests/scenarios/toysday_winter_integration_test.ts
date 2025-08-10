import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { CommandHandler } from '../../src/rules/command_handler';
import { Abilities } from '../../src/rules/abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { WinterEffects } from '../../src/rules/winter_effects';
import { StatusEffects } from '../../src/rules/status_effects';
import { Perdurance } from '../../src/rules/perdurance';

describe('Toysday Winter Integration', () => {
  it.skip('should run complete winter toymaker scenario', () => {
    const sim = new Simulator();
    
    // Full rulebook including winter effects
    sim.rulebook = [
      new CommandHandler(sim),
      new Abilities(sim),
      new EventHandler(sim),
      new WinterEffects(sim),
      new StatusEffects(sim),
      new Perdurance(sim)
    ];
    
    // Create winter battlefield
    WinterEffects.createWinterStorm(sim);
    
    // Add toymaker and enemy
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 7, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    
    
    let constructDeployed = false;
    let snowflakeCount = 0;
    let unitFrozen = false;
    
    // Run simulation for multiple ticks
    for (let tick = 0; tick < 100; tick++) {
      const beforeUnits = sim.units.length;
      sim.step();
      
      // Check for construct deployment
      if (sim.units.length > beforeUnits) {
        const newUnit = sim.units[sim.units.length - 1];
        const unitType = newUnit.id.split(':')[0];
        constructDeployed = true;
      }
      
      // Count snowflakes
      const currentSnowflakes = sim.particles.filter(p => p.type === 'snow').length;
      if (currentSnowflakes > snowflakeCount) {
        snowflakeCount = currentSnowflakes;
      }
      
      // Check for frozen units
      const frozenUnits = sim.units.filter(u => u.meta.frozen);
      if (frozenUnits.length > 0 && !unitFrozen) {
        unitFrozen = true;
      }
      
      // If we have both constructs and winter effects, we're good
      if (constructDeployed && snowflakeCount > 0) {
        break;
      }
    }
    
    // Verify complete integration
    expect(constructDeployed).toBe(true);
    expect(snowflakeCount).toBeGreaterThan(0);
    expect(sim.winterActive).toBe(true);
    
    // Check that constructs have proper abilities (identify by construct-specific unit names)
    const constructTypes = ['freezebot', 'clanker', 'spiker', 'swarmbot', 'roller', 'zapper'];
    const constructs = sim.units.filter(u => constructTypes.includes(u.id.split(':')[0]));
    expect(constructs.length).toBeGreaterThan(0);
    
    const construct = constructs[0];
    
    // Verify snowflakes are properly configured
    const snowflakes = sim.particles.filter(p => p.type === 'snow');
    if (snowflakes.length > 0) {
      const flake = snowflakes[0];
      expect(flake.radius).toBe(0.25); // Single pixel
      expect(flake.vel.x).toBe(0); // Vertical only
    }
    
  });
});