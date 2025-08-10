import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { JsonAbilities } from '../../src/rules/json_abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { CommandHandler } from '../../src/rules/command_handler';

describe('Unified Command System', () => {
  it('should handle weather commands through the system', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    
    // Test direct command parsing
    sim.parseCommand('weather rain 100 0.9');
    
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('weather');
    expect(sim.queuedCommands[0].args).toEqual(['rain', '100', '0.9']);
    
    
    // Process commands
    sim.step();
    
    // Commands should be processed and queue cleared
    expect(sim.queuedCommands.length).toBe(0);
  });
  
  it('should handle deploy commands through the system', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    
    const unitsBefore = sim.units.length;
    
    // Test direct deployment command
    sim.parseCommand('deploy clanker 10 10 friendly');
    
    expect(sim.queuedCommands.length).toBe(1);
    
    // Process commands
    sim.step();
    
    // Events should be processed immediately, so unit should be spawned
    expect(sim.units.length).toBe(unitsBefore + 1);
    const newUnit = sim.units[sim.units.length - 1];
    expect(newUnit.id).toContain('clanker');
    
  });
  
  it('should integrate with rainmaker ability', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new JsonAbilities(sim), new EventHandler(sim)];
    
    // Create rainmaker
    const rainmaker = { ...Encyclopaedia.unit('rainmaker'), pos: { x: 5, y: 5 } };
    sim.addUnit(rainmaker);
    
    // Clear any cooldown
    if (!rainmaker.lastAbilityTick) rainmaker.lastAbilityTick = {};
    delete rainmaker.lastAbilityTick.makeRain;
    
    // Run JsonAbilities to trigger the ability
    sim.step();
    
    // Commands are processed at the start of next step
    // makeRain has multiple effects, should queue weather and temperature commands
    expect(sim.queuedCommands.length).toBeGreaterThanOrEqual(1);
    const weatherCommand = sim.queuedCommands.find(c => c.type === 'weather');
    expect(weatherCommand).toBeTruthy();
    expect(weatherCommand.params).toEqual({
      weatherType: 'rain',
      duration: 80,
      intensity: 0.8
    });
    expect(weatherCommand.unitId).toBe(rainmaker.id);
    
    // Process the command
    sim.step();
    
    expect(sim.queuedCommands.length).toBe(0);
  });
  
  it('should integrate with toymaker ability', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new JsonAbilities(sim), new EventHandler(sim)];
    
    // Create toymaker and enemy
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    
    const unitsBefore = sim.units.length;
    
    // Clear cooldown and usage count
    if (!toymaker.lastAbilityTick) toymaker.lastAbilityTick = {};
    delete toymaker.lastAbilityTick.deployBot;
    if (!toymaker.meta) toymaker.meta = {};
    toymaker.meta.deployBotUses = 0;
    
    // Run JsonAbilities to trigger deployment
    sim.step();
    
    // Should have queued a deploy command
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('deploy');
    expect(sim.queuedCommands[0].unitId).toBe(toymaker.id);
    
    // Process the command
    sim.step();
    
    // Unit should be spawned
    expect(sim.units.length).toBe(unitsBefore + 1);
    
    const construct = sim.units[sim.units.length - 1];
  });
});