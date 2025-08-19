import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { CommandHandler } from '../../src/core/command_handler';
import { Abilities } from '../../src/rules/abilities';
import { EventHandler } from '../../src/rules/event_handler';
import DSL from '../../src/rules/dsl';

describe('Toymaker Debug', () => {
  it('should debug why toymaker is not summoning constructs', () => {
    const sim = new Simulator();
    

    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    
    

    const hasDeployBot = toymaker.abilities.includes('deployBot');
    if (hasDeployBot) {
    }
    

    try {
      const context = sim.getTickContext();
      const closestEnemy = (DSL as any).evaluate?.('closest.enemy()', toymaker, context);
      
      const distance = (DSL as any).evaluate?.('distance(closest.enemy()?.pos)', toymaker, context);
      
      const triggerResult = (DSL as any).evaluate?.('distance(closest.enemy()?.pos) <= 8', toymaker, context);
    } catch (error) {
      console.error('DSL evaluation error:', error);
    }
    

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
        expect(sim.units.length).toBe(3);
        return;
      }
    }
    
    expect(false).toBe(true); // Force failure if no deployment
  });
});