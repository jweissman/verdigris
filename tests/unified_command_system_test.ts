import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import Encyclopaedia from '../src/dmg/encyclopaedia';
import { Abilities } from '../src/rules/abilities';
import { EventHandler } from '../src/rules/event_handler';
import { CommandHandler } from '../src/rules/command_handler';

describe('Unified Command System', () => {
  it('should handle weather commands through the system', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    console.log('🌦️ Testing unified command system for weather');
    
    // Test direct command parsing
    sim.parseCommand('weather rain 100 0.9');
    
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('weather');
    expect(sim.queuedCommands[0].args).toEqual(['rain', '100', '0.9']);
    
    console.log('✅ Weather command queued correctly');
    
    // Process commands
    sim.step();
    
    // Commands should be processed and queue cleared
    expect(sim.queuedCommands.length).toBe(0);
    console.log('✅ Weather command processed');
  });
  
  it('should handle deploy commands through the system', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    console.log('🤖 Testing unified command system for deployment');
    
    const unitsBefore = sim.units.length;
    
    // Test direct deployment command
    sim.parseCommand('deploy clanker 10 10 friendly');
    
    expect(sim.queuedCommands.length).toBe(1);
    console.log('✅ Deploy command queued correctly');
    
    // Process commands
    sim.step();
    
    // Events should be processed immediately, so unit should be spawned
    expect(sim.units.length).toBe(unitsBefore + 1);
    const newUnit = sim.units[sim.units.length - 1];
    expect(newUnit.id).toContain('clanker');
    
    console.log(`✅ Deployed ${newUnit.id} at (${newUnit.pos.x}, ${newUnit.pos.y})`);
  });
  
  it('should integrate with rainmaker ability', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)]; // Don't include Abilities to avoid double triggering
    
    console.log('☔ Testing rainmaker integration with command system');
    
    // Create rainmaker
    const rainmaker = { ...Encyclopaedia.unit('rainmaker'), pos: { x: 5, y: 5 } };
    sim.addUnit(rainmaker);
    
    // Find the makeRain ability and trigger it manually
    const makeRain = rainmaker.abilities.makeRain;
    if (makeRain && makeRain.effect) {
      makeRain.effect(rainmaker, null, sim);
    }
    
    // Should have queued a weather command
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('weather');
    expect(sim.queuedCommands[0].args).toEqual(['rain', '80', '0.8']);
    expect(sim.queuedCommands[0].unitId).toBe(rainmaker.id);
    
    console.log('✅ Rainmaker queued weather command');
    
    // Process the command
    sim.step();
    
    expect(sim.queuedCommands.length).toBe(0);
    console.log('✅ Weather command processed by rainmaker');
  });
  
  it('should integrate with toymaker ability', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)]; // Don't include Abilities to avoid double triggering
    
    console.log('⚙️ Testing toymaker integration with command system');
    
    // Create toymaker and enemy
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    
    const unitsBefore = sim.units.length;
    
    // Find the deployBot ability and trigger it manually
    const deployBot = toymaker.abilities.deployBot;
    if (deployBot && deployBot.effect) {
      deployBot.effect(toymaker, enemy.pos, sim);
    }
    
    // Should have queued a deploy command
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('deploy');
    expect(sim.queuedCommands[0].unitId).toBe(toymaker.id);
    
    console.log('✅ Toymaker queued deploy command');
    
    // Process the command - events are processed immediately
    sim.step();
    
    // Unit should be spawned immediately
    expect(sim.units.length).toBe(unitsBefore + 1);
    
    const construct = sim.units[sim.units.length - 1];
    console.log(`✅ Toymaker deployed ${construct.id} via command system`);
  });
});