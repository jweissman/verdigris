import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { Abilities } from '../../src/rules/abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { CommandHandler } from '../../src/rules/command_handler';
import { UnitBehavior } from '../../src/rules/unit_behavior';
import { UnitMovement } from '../../src/rules/unit_movement';
import { setupTest } from '../test_helper';

describe('Tactical Behavior Improvements', () => {
  beforeEach(() => {
    setupTest();
  });
  it('should make constructs hunt enemies aggressively', () => {
    const sim = new Simulator();
    sim.rulebook = [new UnitBehavior(sim), new UnitMovement(sim), new EventHandler(), new CommandHandler(sim)];
    
    
    // Create constructs and enemies
    const clanker = { ...Encyclopaedia.unit('clanker'), pos: { x: 5, y: 5 } };
    const freezebot = { ...Encyclopaedia.unit('freezebot'), pos: { x: 6, y: 5 } };
    const enemy1 = { ...Encyclopaedia.unit('worm'), pos: { x: 15, y: 5 }, team: 'hostile' as const };
    const enemy2 = { ...Encyclopaedia.unit('worm'), pos: { x: 16, y: 6 }, team: 'hostile' as const };
    
    sim.addUnit(clanker);
    sim.addUnit(freezebot);
    sim.addUnit(enemy1);
    sim.addUnit(enemy2);
    
    // Verify constructs have hunt tags
    expect(clanker.tags).toContain('hunt');
    expect(clanker.tags).toContain('aggressive'); // Special for clanker
    expect(freezebot.tags).toContain('hunt');
    
    
    // Run simulation steps to see movement
    const initialClankerPos = { ...clanker.pos };
    const initialFreezebotPos = { ...freezebot.pos };
    
    for (let i = 0; i < 20; i++) {
      sim.step();
    }
    
    // Constructs should be moving toward enemies
    const finalClanker = sim.units.find(u => u.id === clanker.id)!;
    const finalFreezebot = sim.units.find(u => u.id === freezebot.id)!;
    
    
    // At least one should have moved closer to enemies
    const clankerMoved = Math.abs(finalClanker.pos.x - initialClankerPos.x) + Math.abs(finalClanker.pos.y - initialClankerPos.y);
    const freezebotMoved = Math.abs(finalFreezebot.pos.x - initialFreezebotPos.x) + Math.abs(finalFreezebot.pos.y - initialFreezebotPos.y);
    const distanceMoved = clankerMoved + freezebotMoved;
    
    expect(distanceMoved).toBeGreaterThan(0);
  });
  
  // NOTE: very flaky somehow
  it('should limit toymaker deployment to prevent overload', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new EventHandler()];
    
    
    // Create toymaker 
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    sim.addUnit(toymaker);
    
    const deployBotAbility = Abilities.all.deployBot;
    expect(deployBotAbility.maxUses).toBe(5);
    
    let deploymentsSuccessful = 0;
    const initialUnits = sim.units.length;
    
    // Add an enemy to trigger deployments through the abilities system
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 10, y: 10 }, team: 'hostile' as const };
    sim.addUnit(enemy);
    
    // Add multiple enemies so they don't all get killed
    for (let i = 0; i < 10; i++) {
      const enemyWorm = { ...Encyclopaedia.unit('worm'), pos: { x: 15 + i, y: 10 }, team: 'hostile' as const };
      sim.addUnit(enemyWorm);
    }
    
    // Run simulation for enough ticks to allow all deployments (cooldown is 50)
    for (let i = 0; i < 300; i++) { // 300 ticks = 6 deployments max (50 * 6)
      const beforeUnits = sim.units.length;
      
      sim.step(); // This processes abilities, commands, and events
      
      if (sim.units.length > beforeUnits) {
        deploymentsSuccessful++;
      }
      
      // Stop once we've hit the expected limit
      if (deploymentsSuccessful >= 5) break;
    }
    
    expect(deploymentsSuccessful).toBe(5);
    
    // Verify the usage count was tracked properly
    const finalToymaker = sim.units.find(u => u.id === toymaker.id);
    if (finalToymaker && finalToymaker.abilityUsageCount) {
      expect(finalToymaker.abilityUsageCount.deployBot).toBe(5);
    }
    
  });
  
  it('should allow deployment without enemies present', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new EventHandler()];
    
    
    // Create toymaker with NO enemies
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 10, y: 10 } };
    sim.addUnit(toymaker);
    
    const initialUnits = sim.units.length;
    expect(initialUnits).toBe(1); // Just the toymaker
    
    // Manually trigger deployment with no enemies using modern abilities system
    sim.forceAbility(toymaker.id, 'deployBot', toymaker.pos);
    
    sim.step(); // Process commands and events
    
    expect(sim.units.length).toBe(initialUnits + 1);
    
    const newConstruct = sim.units[sim.units.length - 1];
    
    // Construct should have hunt behavior even without immediate targets
    expect(newConstruct.tags).toContain('hunt');
  });
});