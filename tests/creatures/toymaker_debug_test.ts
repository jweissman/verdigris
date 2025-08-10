import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { CommandHandler } from '../../src/rules/command_handler';
import { JsonAbilities } from '../../src/rules/json_abilities';
import { EventHandler } from '../../src/rules/event_handler';
import DSL from '../../src/rules/dsl';

describe('Toymaker Debug', () => {
  it('should debug why toymaker is not summoning constructs', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new JsonAbilities(sim), new EventHandler(sim)];
    
    // Create toymaker and enemy manually
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    
    
    // Check toymaker abilities
    const deployBot = toymaker.abilities.deployBot;
    if (deployBot) {
    }
    
    // Test DSL evaluation manually
    try {
      const closestEnemy = DSL.evaluate('closest.enemy()', toymaker, sim);
      
      const distance = DSL.evaluate('distance(closest.enemy()?.pos)', toymaker, sim);
      
      const triggerResult = DSL.evaluate('distance(closest.enemy()?.pos) <= 8', toymaker, sim);
    } catch (error) {
      console.error('DSL evaluation error:', error);
    }
    
    // Run simulation step by step
    for (let tick = 0; tick < 60; tick++) {
      const beforeUnits = sim.units.length;
      const toymakerUnit = sim.units.find(u => u.id === toymaker.id);
      
      if (toymakerUnit) {
        const lastAbilityTick = toymakerUnit.lastAbilityTick?.deployBot || 0;
        const ticksSinceLastUse = tick - lastAbilityTick;
        const cooldownReady = ticksSinceLastUse >= 50;
        
        if (tick % 10 === 0 || cooldownReady) {
        }
      }
      
      sim.step();
      
      if (sim.units.length > beforeUnits) {
        const newUnit = sim.units[sim.units.length - 1];
        expect(sim.units.length).toBe(3); // toymaker + enemy + construct
        return;
      }
    }
    
    expect(false).toBe(true); // Force failure if no deployment
  });
});