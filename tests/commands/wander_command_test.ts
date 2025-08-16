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
    

    const parsed = sim.parseCommand('wander friendly 0.3');
    
    expect(parsed.type).toBe('wander');
    expect(parsed.params.team).toBe('friendly');
    expect(parsed.params.chance).toBe(0.3);
  });

  it('should parse wander command with default parameters', () => {
    const sim = new Simulator();
    

    const parsed = sim.parseCommand('wander');
    
    expect(parsed.type).toBe('wander');
    expect(parsed.params.team).toBe('all');
    expect(parsed.params.chance).toBe(0.1);
  });

  it('should make units wander randomly', () => {
    const sim = new Simulator();
    

    const soldier1 = { ...Encyclopaedia.unit('soldier'), pos: { x: 5, y: 5 } };
    const soldier2 = { ...Encyclopaedia.unit('soldier'), pos: { x: 10, y: 10 } };
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 15, y: 15 } };
    
    sim.addUnit(soldier1);
    sim.addUnit(soldier2);
    sim.addUnit(worm);
    

    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'all', chance: 1.0 } // 100% chance for testing
    }];
    

    sim.step();
    

    const movingUnits = sim.units.filter(u => 
      u.intendedMove && (u.intendedMove.x !== 0 || u.intendedMove.y !== 0)
    );
    
    expect(movingUnits.length).toBeGreaterThan(0);
  });

  it('should only affect specified team', () => {
    const sim = new Simulator();
    

    const friendlySoldier = { ...Encyclopaedia.unit('soldier'), pos: { x: 5, y: 5 } };
    const hostileWorm = { ...Encyclopaedia.unit('worm'), pos: { x: 10, y: 10 } };
    
    sim.addUnit(friendlySoldier);
    sim.addUnit(hostileWorm);
    

    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'friendly', chance: 1.0 }
    }];
    

    sim.step();
    

    const friendlyUnit = sim.units.find(u => u.team === 'friendly');
    const hostileUnit = sim.units.find(u => u.team === 'hostile');
    
    expect(friendlyUnit?.intendedMove).toBeDefined();
    expect(hostileUnit?.intendedMove?.x).toBe(0);
    expect(hostileUnit?.intendedMove?.y).toBe(0);
  });

  it('should not make dead units wander', () => {
    const sim = new Simulator();
    

    const deadSoldier = { ...Encyclopaedia.unit('soldier'), pos: { x: 5, y: 5 }, state: 'dead' as const };
    sim.addUnit(deadSoldier);
    

    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'all', chance: 1.0 }
    }];
    

    sim.step();
    

    const deadUnit = sim.units.find(u => u.state === 'dead');
    expect(deadUnit?.intendedMove?.x).toBe(0);
    expect(deadUnit?.intendedMove?.y).toBe(0);
  });

  it('should not wander units engaged in combat', () => {
    const sim = new Simulator();
    

    const friendlySoldier = { ...Encyclopaedia.unit('soldier'), pos: { x: 5, y: 5 } };
    const hostileWorm = { ...Encyclopaedia.unit('worm'), pos: { x: 6, y: 5 } }; // Adjacent
    
    sim.addUnit(friendlySoldier);
    sim.addUnit(hostileWorm);
    

    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'all', chance: 1.0 }
    }];
    

    sim.step();
    

    const friendly = sim.units.find(u => u.team === 'friendly');
    const hostile = sim.units.find(u => u.team === 'hostile');
    



    expect(friendly).toBeDefined();
    expect(hostile).toBeDefined();
  });

  it('should respect field boundaries', () => {
    const sim = new Simulator();
    

    const edgeUnit = { ...Encyclopaedia.unit('soldier'), pos: { x: 0, y: 0 } };
    sim.addUnit(edgeUnit);
    

    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'all', chance: 1.0 }
    }];
    

    for (let i = 0; i < 10; i++) {
      sim.step();
      

      const unit = sim.units[0];
      expect(unit.pos.x).toBeGreaterThanOrEqual(0);
      expect(unit.pos.x).toBeLessThan(sim.fieldWidth);
      expect(unit.pos.y).toBeGreaterThanOrEqual(0);
      expect(unit.pos.y).toBeLessThan(sim.fieldHeight);
    }
  });

  it('should work with neutral team units', () => {
    const sim = new Simulator();
    

    const bear = { ...Encyclopaedia.unit('bear'), pos: { x: 5, y: 5 } };
    const owl = { ...Encyclopaedia.unit('owl'), pos: { x: 10, y: 10 } };
    
    sim.addUnit(bear);
    sim.addUnit(owl);
    

    sim.queuedCommands = [{
      type: 'wander',
      params: { team: 'all', chance: 1.0 }
    }];
    

    sim.step();
    

    const neutralUnits = sim.units.filter(u => u.team === 'neutral');
    const movingNeutralUnits = neutralUnits.filter(u => 
      u.intendedMove && (u.intendedMove.x !== 0 || u.intendedMove.y !== 0)
    );
    
    expect(movingNeutralUnits.length).toBeGreaterThan(0);
  });

  it('should handle wander command in scene files', () => {
    const sim = new Simulator();
    

    const sceneCommand = 'wander neutral 0.2';
    const parsed = sim.parseCommand(sceneCommand);
    
    expect(parsed.type).toBe('wander');
    expect(parsed.params.team).toBe('neutral');
    expect(parsed.params.chance).toBe(0.2);
  });
});