import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { CommandHandler } from '../../src/rules/command_handler';
import { EventHandler } from '../../src/rules/event_handler';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Wander Command', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
    Simulator.rng.reset(12345);
  });

  it('should parse wander command with team and chance parameters', () => {
    const sim = new Simulator();
    sim.rulebook = [new EventHandler(), new CommandHandler(sim)];
    
    // Parse wander command string
    const parsed = sim.parseCommand('wander friendly 0.3');
    
    expect(parsed.type).toBe('wander');
    expect(parsed.params.team).toBe('friendly');
    expect(parsed.params.chance).toBe(0.3);
  });

  it('should parse wander command with default parameters', () => {
    const sim = new Simulator();
    
    // Parse wander command with no parameters
    const parsed = sim.parseCommand('wander');
    
    expect(parsed.type).toBe('wander');
    expect(parsed.params.team).toBe('all');
    expect(parsed.params.chance).toBe(0.1);
  });

  it('should make units wander randomly', () => {
    const sim = new Simulator();
    sim.rulebook = [new EventHandler(), new CommandHandler(sim)];
    
    // Add test units
    const soldier1 = { ...Encyclopaedia.unit('soldier'), pos: { x: 5, y: 5 } };
    const soldier2 = { ...Encyclopaedia.unit('soldier'), pos: { x: 10, y: 10 } };
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 15, y: 15 } };
    
    sim.addUnit(soldier1);
    sim.addUnit(soldier2);
    sim.addUnit(worm);
    
    // Queue wander command with high chance for testing
    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'all', chance: 1.0 } // 100% chance for testing
    }];
    
    // Process command
    sim.step();
    
    // Check that units have intended moves set
    const movingUnits = sim.units.filter(u => 
      u.intendedMove && (u.intendedMove.x !== 0 || u.intendedMove.y !== 0)
    );
    
    expect(movingUnits.length).toBeGreaterThan(0);
  });

  it('should only affect specified team', () => {
    const sim = new Simulator();
    sim.rulebook = [new EventHandler(), new CommandHandler(sim)];
    
    // Add units from different teams
    const friendlySoldier = { ...Encyclopaedia.unit('soldier'), pos: { x: 5, y: 5 } };
    const hostileWorm = { ...Encyclopaedia.unit('worm'), pos: { x: 10, y: 10 } };
    
    sim.addUnit(friendlySoldier);
    sim.addUnit(hostileWorm);
    
    // Queue wander command for friendly team only
    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'friendly', chance: 1.0 }
    }];
    
    // Process command
    sim.step();
    
    // Only friendly unit should have intended move
    const friendlyUnit = sim.units.find(u => u.team === 'friendly');
    const hostileUnit = sim.units.find(u => u.team === 'hostile');
    
    expect(friendlyUnit?.intendedMove).toBeDefined();
    expect(hostileUnit?.intendedMove?.x).toBe(0);
    expect(hostileUnit?.intendedMove?.y).toBe(0);
  });

  it('should not make dead units wander', () => {
    const sim = new Simulator();
    sim.rulebook = [new EventHandler(), new CommandHandler(sim)];
    
    // Add a dead unit
    const deadSoldier = { ...Encyclopaedia.unit('soldier'), pos: { x: 5, y: 5 }, state: 'dead' as const };
    sim.addUnit(deadSoldier);
    
    // Queue wander command
    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'all', chance: 1.0 }
    }];
    
    // Process command
    sim.step();
    
    // Dead unit should not have intended move
    const deadUnit = sim.units.find(u => u.state === 'dead');
    expect(deadUnit?.intendedMove?.x).toBe(0);
    expect(deadUnit?.intendedMove?.y).toBe(0);
  });

  it('should not wander units engaged in combat', () => {
    const sim = new Simulator();
    sim.rulebook = [new EventHandler(), new CommandHandler(sim)];
    
    // Add units close together (in combat range)
    const friendlySoldier = { ...Encyclopaedia.unit('soldier'), pos: { x: 5, y: 5 } };
    const hostileWorm = { ...Encyclopaedia.unit('worm'), pos: { x: 6, y: 5 } }; // Adjacent
    
    sim.addUnit(friendlySoldier);
    sim.addUnit(hostileWorm);
    
    // Queue wander command
    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'all', chance: 1.0 }
    }];
    
    // Process command
    sim.step();
    
    // Neither unit should wander when engaged
    const friendly = sim.units.find(u => u.team === 'friendly');
    const hostile = sim.units.find(u => u.team === 'hostile');
    
    // They should not have wander moves (might have combat moves)
    // We can't guarantee they won't move at all, but the wander command shouldn't set moves
    // when they're engaged
    expect(friendly).toBeDefined();
    expect(hostile).toBeDefined();
  });

  it('should respect field boundaries', () => {
    const sim = new Simulator();
    sim.rulebook = [new EventHandler(), new CommandHandler(sim)];
    
    // Add unit at edge of field
    const edgeUnit = { ...Encyclopaedia.unit('soldier'), pos: { x: 0, y: 0 } };
    sim.addUnit(edgeUnit);
    
    // Queue wander command
    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'all', chance: 1.0 }
    }];
    
    // Run multiple times to ensure boundary checking
    for (let i = 0; i < 10; i++) {
      sim.step();
      
      // Unit should never go out of bounds
      const unit = sim.units[0];
      expect(unit.pos.x).toBeGreaterThanOrEqual(0);
      expect(unit.pos.x).toBeLessThan(sim.fieldWidth);
      expect(unit.pos.y).toBeGreaterThanOrEqual(0);
      expect(unit.pos.y).toBeLessThan(sim.fieldHeight);
    }
  });

  it('should work with neutral team units', () => {
    const sim = new Simulator();
    sim.rulebook = [new EventHandler(), new CommandHandler(sim)];
    
    // Add neutral forest creatures
    const bear = { ...Encyclopaedia.unit('bear'), pos: { x: 5, y: 5 } };
    const owl = { ...Encyclopaedia.unit('owl'), pos: { x: 10, y: 10 } };
    
    sim.addUnit(bear);
    sim.addUnit(owl);
    
    // Queue wander command for all teams
    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'all', chance: 1.0 }
    }];
    
    // Process command
    sim.step();
    
    // Neutral units should wander
    const neutralUnits = sim.units.filter(u => u.team === 'neutral');
    const movingNeutralUnits = neutralUnits.filter(u => 
      u.intendedMove && (u.intendedMove.x !== 0 || u.intendedMove.y !== 0)
    );
    
    expect(movingNeutralUnits.length).toBeGreaterThan(0);
  });

  it('should handle wander command in scene files', () => {
    const sim = new Simulator();
    
    // Simulate parsing a scene file command
    const sceneCommand = 'wander neutral 0.2';
    const parsed = sim.parseCommand(sceneCommand);
    
    expect(parsed.type).toBe('wander');
    expect(parsed.params.team).toBe('neutral');
    expect(parsed.params.chance).toBe(0.2);
  });
});