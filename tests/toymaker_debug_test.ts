import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import Encyclopaedia from '../src/dmg/encyclopaedia';
import { Abilities } from '../src/rules/abilities';
import { EventHandler } from '../src/rules/event_handler';
import DSL from '../src/rules/dsl';

describe('Toymaker Debug', () => {
  it('should debug why toymaker is not summoning constructs', () => {
    const sim = new Simulator();
    sim.rulebook = [new Abilities(sim), new EventHandler(sim)];
    
    // Create toymaker and enemy manually
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    
    console.log('=== TOYMAKER DEBUG ===');
    console.log(`Toymaker: ${toymaker.id} at (${toymaker.pos.x}, ${toymaker.pos.y})`);
    console.log(`Enemy: ${enemy.id} at (${enemy.pos.x}, ${enemy.pos.y})`);
    console.log(`Distance: ${Math.sqrt(Math.pow(enemy.pos.x - toymaker.pos.x, 2) + Math.pow(enemy.pos.y - toymaker.pos.y, 2))}`);
    
    // Check toymaker abilities
    console.log('Toymaker abilities:', Object.keys(toymaker.abilities));
    const deployBot = toymaker.abilities.deployBot;
    if (deployBot) {
      console.log(`Deploy ability: ${deployBot.name}, cooldown: ${deployBot.cooldown}`);
      console.log(`Trigger: ${deployBot.trigger}`);
      console.log(`Target: ${deployBot.target}`);
    }
    
    // Test DSL evaluation manually
    try {
      const closestEnemy = DSL.evaluate('closest.enemy()', toymaker, sim);
      console.log('closest.enemy():', closestEnemy?.id, 'at', closestEnemy?.pos);
      
      const distance = DSL.evaluate('distance(closest.enemy()?.pos)', toymaker, sim);
      console.log('distance to closest enemy:', distance);
      
      const triggerResult = DSL.evaluate('distance(closest.enemy()?.pos) <= 8', toymaker, sim);
      console.log('trigger condition result:', triggerResult);
    } catch (error) {
      console.error('DSL evaluation error:', error);
    }
    
    // Run simulation step by step
    console.log('\n=== STEP BY STEP SIMULATION ===');
    for (let tick = 0; tick < 60; tick++) {
      const beforeUnits = sim.units.length;
      const toymakerUnit = sim.units.find(u => u.id === toymaker.id);
      
      if (toymakerUnit) {
        const lastAbilityTick = toymakerUnit.lastAbilityTick?.deployBot || 0;
        const ticksSinceLastUse = tick - lastAbilityTick;
        const cooldownReady = ticksSinceLastUse >= 50;
        
        if (tick % 10 === 0 || cooldownReady) {
          console.log(`Tick ${tick}: last use ${lastAbilityTick}, cooldown ready: ${cooldownReady}`);
        }
      }
      
      sim.step();
      
      if (sim.units.length > beforeUnits) {
        const newUnit = sim.units[sim.units.length - 1];
        console.log(`✅ Tick ${tick}: Deployed ${newUnit.sprite} (${newUnit.id}) at (${newUnit.pos.x}, ${newUnit.pos.y})`);
        expect(sim.units.length).toBe(3); // toymaker + enemy + construct
        return;
      }
    }
    
    console.log('❌ No construct was deployed after 60 ticks');
    expect(false).toBe(true); // Force failure if no deployment
  });
});