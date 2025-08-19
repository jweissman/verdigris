import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { Abilities } from '../../src/rules/abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { CommandHandler } from '../../src/core/command_handler';
import { addEffectsToUnit } from '../../src/test_helpers/ability_compat';

describe('Toymaker System', () => {
  it('should spawn a toymaker with correct properties', () => {
    const sim = new Simulator();
    

    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    sim.addUnit(toymaker);
    

    expect(sim.units.length).toBe(1);
    expect(sim.units[0].sprite).toBe('toymaker');
    expect(sim.units[0].tags).toContain('mechanical');
    expect(sim.units[0].tags).toContain('craftor');

    expect(sim.units[0].abilities).toContain('deployBot');

    expect(Abilities.all.deployBot).toBeDefined();
    expect(Abilities.all.deployBot.cooldown).toBe(50);
  });

  it('should deploy constructs when enemy is in range', () => {
    const sim = new Simulator();
    

    

    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    sim.addUnit(toymaker);
    

    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    sim.addUnit(enemy);
    
    expect(sim.units.length).toBe(2);
    

    let deployedConstruct = false;
    for (let tick = 0; tick < 60; tick++) {
      sim.step();
      
      if (sim.units.length > 2) {
        deployedConstruct = true;
        const construct = sim.units.find(u => u.tags?.includes('construct'));
        expect(construct).toBeDefined();
        expect(construct!.tags).toContain('construct');
        break;
      }
    }
    
    expect(deployedConstruct).toBe(true);
  });

  it('should create constructs with specific abilities assigned', () => {
    const sim = new Simulator();

    const freezebot = Encyclopaedia.unit('freezebot');
    expect(freezebot.tags).toContain('construct');
    expect(freezebot.meta.perdurance).toBe('sturdiness');
    expect(freezebot.abilities).toContain('freezeAura');
    
    const clanker = Encyclopaedia.unit('clanker');
    expect(clanker.tags).toContain('construct');
    expect(clanker.abilities).toContain('explode');
    
    const spiker = Encyclopaedia.unit('spiker');
    expect(spiker.tags).toContain('construct');
    expect(spiker.abilities).toContain('whipChain');
    
    const swarmbot = Encyclopaedia.unit('swarmbot');
    expect(swarmbot.tags).toContain('construct');
    expect(swarmbot.meta.perdurance).toBe('swarm');

    
    const roller = Encyclopaedia.unit('roller');
    expect(roller.tags).toContain('construct');
    expect(roller.abilities).toContain('chargeAttack');
    
    const zapper = Encyclopaedia.unit('zapper');
    expect(zapper.tags).toContain('construct');
    expect(zapper.abilities).toContain('zapHighest');
  });

  it('should place deployed constructs between toymaker and target', () => {
    const sim = new Simulator();
    

    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 2, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    

    let constructDeployed = false;
    for (let i = 0; i < 60; i++) {
      sim.step();
      if (sim.units.length > 2) {
        constructDeployed = true;
        const construct = sim.units.find(u => u.tags?.includes('construct'));
        

        const expectedX = Math.floor((2 + 8) / 2);
        expect(construct!.pos.x).toBe(expectedX);
        expect(construct!.pos.y).toBe(5);
        break;
      }
    }
    
    expect(constructDeployed).toBe(true);
  });
});