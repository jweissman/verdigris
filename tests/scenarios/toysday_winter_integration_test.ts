import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { BiomeEffects } from '../../src/rules/biome_effects';

describe('Toysday Winter Integration', () => {
  it('should run complete winter toymaker scenario', () => {
    const sim = new Simulator();


    BiomeEffects.createWinterStorm(sim);
    

    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 7, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    
    
    let constructDeployed = false;
    let snowflakeCount = 0;
    let unitFrozen = false;
    

    for (let tick = 0; tick < 100; tick++) {
      const beforeUnits = sim.units.length;
      sim.step();
      

      if (sim.units.length > beforeUnits) {
        const newUnit = sim.units[sim.units.length - 1];
        const unitType = newUnit.id.split(':')[0];
        constructDeployed = true;
      }
      

      const currentSnowflakes = sim.particles.filter(p => p.type === 'snow').length;
      if (currentSnowflakes > snowflakeCount) {
        snowflakeCount = currentSnowflakes;
      }
      

      const frozenUnits = sim.units.filter(u => u.meta.frozen);
      if (frozenUnits.length > 0 && !unitFrozen) {
        unitFrozen = true;
      }
      

      if (constructDeployed && snowflakeCount > 0) {
        break;
      }
    }
    

    expect(constructDeployed).toBe(true);
    expect(snowflakeCount).toBeGreaterThan(0);
    expect(sim.winterActive).toBe(true);
    

    const constructs = sim.units.filter(u => u.tags?.includes('construct'));
    expect(constructs.length).toBeGreaterThan(0);
    
    const construct = constructs[0];
    

    const snowflakes = sim.particles.filter(p => p.type === 'snow');
    if (snowflakes.length > 0) {
      const flake = snowflakes[0];
      expect(flake.radius).toBe(0.25); // Single pixel
      expect(flake.vel.x).toBe(0); // Vertical only
    }
    
  });
});