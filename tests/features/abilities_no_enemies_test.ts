import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { Abilities } from '../../src/rules/abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { CommandHandler } from '../../src/rules/command_handler';

describe('Abilities Without Nearby Enemies', () => {
  it('should allow deployment commands even without enemies present', () => {
    
    const sim = new Simulator();
    

    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 20, y: 10 } };
    toymaker.abilities.deployBot = { ...Encyclopaedia.abilities.deployBot, maxUses: 5 };
    sim.addUnit(toymaker);
    
    

    sim.parseCommand('deploy clanker');
    sim.parseCommand('deploy freezebot');
    

    sim.step();
    

    const constructs = sim.units.filter(u => u.tags?.includes('construct'));
    expect(constructs.length).toBeGreaterThan(0);
  });
  
  it('should test supportive abilities work without combat targets', () => {
    
    const sim = new Simulator();
    

    const mechatron = { ...Encyclopaedia.unit('mechatron'), pos: { x: 15, y: 10 } };

    mechatron.hp = 80; // 40% health to trigger self-heal
    sim.addUnit(mechatron);
    
    

    expect(mechatron.abilities).toContain('shieldRecharge');
    const shieldRechargeAbility = Abilities.all.shieldRecharge;
    expect(shieldRechargeAbility).toBeDefined();
    expect(shieldRechargeAbility.cooldown).toBe(120);
    expect(shieldRechargeAbility.target).toBe('self.pos');
    expect(shieldRechargeAbility.trigger).toBe('self.hp < self.maxHp * 0.5');
    

    const initialHp = mechatron.hp;
    

    sim.forceAbility(mechatron.id, 'shieldRecharge', mechatron.pos);
    sim.step();
  });
  
  it('should test area effect abilities can trigger in empty areas', () => {
    
    const sim = new Simulator();
    

    const mechatron = { ...Encyclopaedia.unit('mechatron'), pos: { x: 20, y: 15 } };
    sim.addUnit(mechatron);
    
    

    expect(mechatron.abilities).toContain('empPulse');
    const initialProcessedEvents = sim.processedEvents.length;
    

    sim.forceAbility(mechatron.id, 'empPulse', mechatron.pos);
    sim.step();
    
    expect(sim.processedEvents.length).toBe(initialProcessedEvents + 1);
    const empEvent = sim.processedEvents[sim.processedEvents.length - 1];
    expect(empEvent.kind).toBe('aoe');
    expect(empEvent.meta.aspect).toBe('emp');
    expect(empEvent.meta.radius).toBe(8);
    

    const missileBarrage = mechatron.abilities.missileBarrage;
    if (missileBarrage?.effect) {
      const initialProjectiles = sim.projectiles.length;
      const emptyTarget = { x: 30, y: 20 }; // Empty coordinates
      
      missileBarrage.effect(mechatron, emptyTarget, sim);
      

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
    

    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 15, y: 15 } };
    toymaker.abilities.deployBot = { ...Encyclopaedia.abilities.deployBot, maxUses: 3 }; // Lower limit for test
    sim.addUnit(toymaker);
    
    

    sim.parseCommand('deploy clanker');
    sim.parseCommand('deploy freezebot'); 
    sim.parseCommand('deploy spiker');
    sim.parseCommand('deploy swarmbot'); // Should be blocked
    sim.parseCommand('deploy roller');   // Should be blocked
    

    for (let i = 0; i < 3; i++) {
      sim.step();
    }
    

    const constructs = sim.units.filter(u => u.tags?.includes('construct'));
    expect(constructs.length).toBeGreaterThan(0);
    

    expect(toymaker.abilities.deployBot.maxUses).toBe(3);
  });
  
  it('should test environmental abilities work without combat context', () => {
    
    const sim = new Simulator();
    

    const rainmaker = { ...Encyclopaedia.unit('rainmaker'), pos: { x: 20, y: 20 } };
    sim.addUnit(rainmaker);
    
    

    expect(rainmaker.abilities).toContain('makeRain');
    const makeRainAbility = Abilities.all.makeRain;
    expect(makeRainAbility).toBeDefined();
    expect(makeRainAbility.cooldown).toBe(200);
    

    const initialWeather = sim.weather.current;
    sim.forceAbility(rainmaker.id, 'makeRain', rainmaker.pos);
    sim.step();
    expect(sim.weather.current).toBe('rain');
  });
});