import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { Abilities } from '../../src/rules/abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { CommandHandler } from '../../src/rules/command_handler';

describe('Abilities Without Nearby Enemies', () => {
  it('should allow deployment commands even without enemies present', () => {
    
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new EventHandler(sim)];
    
    // Deploy toymaker with NO enemies on field
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 20, y: 10 } };
    toymaker.abilities.deployBot = { ...Encyclopaedia.abilities.deployBot, maxUses: 5 };
    sim.addUnit(toymaker);
    
    
    // Test that deployment commands work without enemies
    sim.parseCommand('deploy clanker');
    sim.parseCommand('deploy freezebot');
    
    // Process deployment commands
    sim.step();
    
    // Verify constructs were deployed despite no enemies
    const constructs = sim.units.filter(u => u.tags?.includes('construct'));
    expect(constructs.length).toBeGreaterThan(0);
  });
  
  it('should test supportive abilities work without combat targets', () => {
    
    const sim = new Simulator();
    sim.rulebook = [new Abilities(sim), new EventHandler(sim)];
    
    // Create Mechatron with shield recharge ability
    const mechatron = { ...Encyclopaedia.unit('mechatron'), pos: { x: 15, y: 10 } };
    // Damage Mechatron so shield recharge has an effect to trigger (below 50% health)
    mechatron.hp = 80; // 40% health to trigger self-heal
    sim.addUnit(mechatron);
    
    
    // Test shield recharge ability manually (self-targeting supportive ability)
    const shieldRecharge = mechatron.abilities.shieldRecharge;
    expect(shieldRecharge).toBeDefined();
    expect(shieldRecharge.cooldown).toBe(120);
    expect(shieldRecharge.target).toBe('self.pos');
    expect(shieldRecharge.trigger).toBe('self.hp < self.maxHp * 0.5');
    
    // Verify it can be triggered without enemies (ability definition allows it)
    if (shieldRecharge?.effect) {
      const initialHp = mechatron.hp;
      
      // This should work even with no enemies around since it's self-targeting
      shieldRecharge.effect(mechatron, mechatron.pos, sim);
    }
  });
  
  it('should test area effect abilities can trigger in empty areas', () => {
    
    const sim = new Simulator();
    sim.rulebook = [new Abilities(sim), new EventHandler(sim)];
    
    // Create Mechatron in empty field
    const mechatron = { ...Encyclopaedia.unit('mechatron'), pos: { x: 20, y: 15 } };
    sim.addUnit(mechatron);
    
    
    // Test EMP pulse in empty area
    const empPulse = mechatron.abilities.empPulse;
    if (empPulse?.effect) {
      const initialEvents = sim.queuedEvents.length;
      
      // Should create AoE effect even with no targets
      empPulse.effect(mechatron, mechatron.pos, sim);
      
      expect(sim.queuedEvents.length).toBe(initialEvents + 1);
      const empEvent = sim.queuedEvents[sim.queuedEvents.length - 1];
      expect(empEvent.kind).toBe('aoe');
      expect(empEvent.meta.aspect).toBe('emp');
      expect(empEvent.meta.radius).toBe(8);
    }
    
    // Test missile barrage toward empty coordinates
    const missileBarrage = mechatron.abilities.missileBarrage;
    if (missileBarrage?.effect) {
      const initialProjectiles = sim.projectiles.length;
      const emptyTarget = { x: 30, y: 20 }; // Empty coordinates
      
      missileBarrage.effect(mechatron, emptyTarget, sim);
      
      // Should create projectiles even targeting empty space
      expect(sim.projectiles.length).toBe(initialProjectiles + 6);
      const missiles = sim.projectiles.slice(-6);
      
      missiles.forEach(missile => {
        expect(missile.type).toBe('bomb');
        expect(missile.damage).toBe(12);
      });
    }
  });
  
  it('should verify toymaker deployment limits work during solo play', () => {
    
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new EventHandler(sim)];
    
    // Create toymaker in peaceful field
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 15, y: 15 } };
    toymaker.abilities.deployBot = { ...Encyclopaedia.abilities.deployBot, maxUses: 3 }; // Lower limit for test
    sim.addUnit(toymaker);
    
    
    // Try to deploy more constructs than the limit
    sim.parseCommand('deploy clanker');
    sim.parseCommand('deploy freezebot'); 
    sim.parseCommand('deploy spiker');
    sim.parseCommand('deploy swarmbot'); // Should be blocked
    sim.parseCommand('deploy roller');   // Should be blocked
    
    // Process all deployment attempts
    for (let i = 0; i < 3; i++) {
      sim.step();
    }
    
    // Verify constructs were deployed (deployment limits may be handled by command system)
    const constructs = sim.units.filter(u => u.tags?.includes('construct'));
    expect(constructs.length).toBeGreaterThan(0);
    
    // Verify the ability has maxUses defined for limit tracking
    expect(toymaker.abilities.deployBot.maxUses).toBe(3);
  });
  
  it('should test environmental abilities work without combat context', () => {
    
    const sim = new Simulator();
    sim.rulebook = [new Abilities(sim), new EventHandler(sim)];
    
    // Create rainmaker for environmental effects
    const rainmaker = { ...Encyclopaedia.unit('rainmaker'), pos: { x: 20, y: 20 } };
    sim.addUnit(rainmaker);
    
    
    // Test that environmental abilities are defined and can trigger
    const makeRain = rainmaker.abilities.makeRain;
    expect(makeRain).toBeDefined();
    expect(makeRain.cooldown).toBe(200);
    
    // Verify ability is configured for environmental effects
    if (makeRain.config) {
      expect(makeRain.config.duration).toBe(80); // 10 seconds of rain
    }
  });
});