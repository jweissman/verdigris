import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { Abilities } from '../../src/rules/abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { CommandHandler } from '../../src/rules/command_handler';
import { addEffectsToUnit } from '../../src/test_helpers/ability_compat';

describe('Toymaker System', () => {
  it('should spawn a toymaker with correct properties', () => {
    const sim = new Simulator();
    
    // Create toymaker using the encyclopaedia
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    sim.addUnit(toymaker);
    
    // Verify toymaker exists and has correct properties
    expect(sim.units.length).toBe(1);
    expect(sim.units[0].sprite).toBe('toymaker');
    expect(sim.units[0].tags).toContain('mechanical');
    expect(sim.units[0].tags).toContain('craftor');
    // Verify toymaker has deployBot ability
    expect(sim.units[0].abilities).toContain('deployBot');
    // Check the ability exists in the Abilities registry
    expect(Abilities.all.deployBot).toBeDefined();
    expect(Abilities.all.deployBot.cooldown).toBe(50);
  });

  it('should deploy constructs when enemy is in range', () => {
    const sim = new Simulator();
    
    // Use minimal rulebook for focused testing
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new EventHandler()];
    
    // Add toymaker (uses new JSON ability system, no need for addEffectsToUnit)
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    sim.addUnit(toymaker);
    
    // Add hostile enemy in range (distance = 3, within ability range of 8)
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    sim.addUnit(enemy);
    
    expect(sim.units.length).toBe(2);
    
    // Run simulation until deploy ability triggers or timeout
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
    // Test individual construct types with specific ability expectations
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
    // Note: swarmbot doesn't have specific ability yet, just swarm health
    
    const roller = Encyclopaedia.unit('roller');
    expect(roller.tags).toContain('construct');
    expect(roller.abilities).toContain('chargeAttack');
    
    const zapper = Encyclopaedia.unit('zapper');
    expect(zapper.tags).toContain('construct');
    expect(zapper.abilities).toContain('zapHighest');
  });

  it('should place deployed constructs between toymaker and target', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new EventHandler()];
    
    // Set up specific positions for predictable deployment
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 2, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    
    // Force deployment by running many ticks
    let constructDeployed = false;
    for (let i = 0; i < 60; i++) {
      sim.step();
      if (sim.units.length > 2) {
        constructDeployed = true;
        const construct = sim.units.find(u => u.tags?.includes('construct'));
        
        // Construct should be placed roughly between toymaker and enemy
        const expectedX = Math.floor((2 + 8) / 2); // midpoint = 5
        expect(construct!.pos.x).toBe(expectedX);
        expect(construct!.pos.y).toBe(5);
        break;
      }
    }
    
    expect(constructDeployed).toBe(true);
  });
});