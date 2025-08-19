import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { EventHandler } from '../../src/rules/event_handler';
import { CommandHandler } from '../../src/core/command_handler';
import { Abilities } from '../../src/rules/abilities';

describe('Unified Command System', () => {
  it('should handle weather commands through the system', () => {
    const sim = new Simulator();
    
    

    sim.parseCommand('weather rain 100 0.9');
    
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('weather');
    expect(sim.queuedCommands[0].params).toEqual({ weatherType: 'rain', duration: 100, intensity: 0.9 });
    
    

    sim.step();
    

    expect(sim.queuedCommands.length).toBe(0);
  });
  
  it('should handle deploy commands through the system', () => {
    const sim = new Simulator();
    
    
    const unitsBefore = sim.units.length;
    

    sim.parseCommand('deploy clanker 10 10');
    
    expect(sim.queuedCommands.length).toBe(1);
    

    sim.step(); // Fixpoint processing handles deploy -> spawn event -> spawn command
    

    expect(sim.units.length).toBe(unitsBefore + 1);
    const newUnit = sim.units[sim.units.length - 1];
    expect(newUnit.id).toContain('clanker');
    
  });
  
  it('should integrate with rainmaker ability', () => {
    const sim = new Simulator();
    

    const rainmaker = { ...Encyclopaedia.unit('rainmaker'), pos: { x: 5, y: 5 } };
    const addedRainmaker = sim.addUnit(rainmaker);
    

    sim.forceAbility(addedRainmaker.id, 'makeRain', addedRainmaker.pos);
    


    expect(sim.queuedCommands.length).toBeGreaterThanOrEqual(1);
    const weatherCommand = sim.queuedCommands.find(c => c.type === 'weather');
    expect(weatherCommand).toBeTruthy();
    expect(weatherCommand.params).toEqual({
      weatherType: 'rain',
      duration: 80,
      intensity: 0.8
    });
    expect(weatherCommand.unitId).toBe(addedRainmaker.id);
    

    let steps = 0;
    while (sim.queuedCommands.length > 0 && steps < 5) {
      sim.step();
      steps++;
    }
    
    expect(sim.queuedCommands.length).toBe(0);
  });
  
  it('should integrate with toymaker ability', () => {
    const sim = new Simulator();
    

    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    

    if (!toymaker.lastAbilityTick) toymaker.lastAbilityTick = {};
    delete toymaker.lastAbilityTick?.deployBot;
    if (!toymaker.meta) toymaker.meta = {};
    toymaker.meta.deployBotUses = 0;
    
    const addedToymaker = sim.addUnit(toymaker);
    sim.addUnit(enemy);
    
    const unitsBefore = sim.units.length;
    


    sim.step();
    

    expect(sim.units.length).toBe(unitsBefore + 1);
    

    const newUnits = sim.units.filter(u => !['toymaker', 'worm'].includes(u.type || ''));
    expect(newUnits.length).toBeGreaterThan(0);
    
    const construct = sim.units[sim.units.length - 1];
  });
});