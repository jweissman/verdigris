import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Command DSL', () => {
  it('should handle temperature command', () => {
    const sim = new Simulator();
    // sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    // Queue temperature command
    sim.queuedCommands = [{
      type: 'temperature',
      args: ['30']
    }];
    
    // Process command
    sim.step();
    
    // Check temperature was set
    const avgTemp = getAverageTemperature(sim);
    expect(avgTemp).toBeGreaterThan(28);
    expect(avgTemp).toBeLessThan(32); // Should be around 30 with variation
  });

  it('should handle weather command with rain', () => {
    const sim = new Simulator();
    // sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    // Queue weather command
    sim.queuedCommands = [{
      type: 'weather',
      args: ['rain', '100', '0.8']
    }];
    
    // Process command
    sim.step();
    
    // Check weather was set
    expect(sim.weather.current).toBe('rain');
  });

  it('should handle weather command with sandstorm', () => {
    const sim = new Simulator();
    // sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    // Queue sandstorm weather
    sim.queuedCommands = [{
      type: 'weather',
      args: ['sand', '150', '0.7']
    }];
    
    // Process command
    sim.step();
    
    // Check weather was set
    expect(sim.weather.current).toBe('sandstorm');
  });

  it.skip('should handle toss command', () => {
    const sim = new Simulator();
    // sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    // Add a unit to toss
    const unit = {
      id: 'test-unit',
      pos: { x: 5, y: 5 },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly' as const,
      sprite: 'soldier',
      state: 'idle' as const,
      hp: 30,
      maxHp: 30,
      mass: 1,
      abilities: {},
      tags: []
    };
    sim.addUnit(unit);
    
    // Queue toss command
    sim.queuedCommands = [{
      type: 'toss',
      args: [],
      unitId: 'test-unit'
    }];
    
    // Process command
    const initialPos = { ...unit.pos };
    sim.step();
    
    // Unit should have been tossed (position changed or toss state set)
    expect(unit.pos).not.toEqual(initialPos);
  });

  it('should handle lightning command', () => {
    const sim = new Simulator();
    // sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    // Queue lightning command
    sim.queuedCommands = [{
      type: 'lightning',
      args: ['10', '10']
    }];
    
    // Process command
    const initialParticleCount = sim.particles.length;
    sim.step();
    
    // Should create lightning particles
    expect(sim.particles.length).toBeGreaterThan(initialParticleCount);
  });

  it('should handle deploy command', () => {
    const sim = new Simulator();
    // sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    // Queue deploy command
    sim.queuedCommands = [{
      type: 'deploy',
      args: ['soldier', '5', '5']
    }];
    
    // Process command
    const initialUnitCount = sim.units.length;
    sim.step();
    
    // Should create a new unit
    expect(sim.units.length).toBe(initialUnitCount + 1);
    const soldier = sim.units.find(u => u.sprite === 'soldier');
    expect(soldier).toBeDefined();
    expect(soldier?.pos).toEqual({ x: 5, y: 5 });
  });

  it('should handle command aliases', () => {
    const sim = new Simulator();
    // sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    // Test 'temp' alias for 'temperature'
    sim.queuedCommands = [{
      type: 'temp',
      args: ['25']
    }];
    
    sim.step();
    
    const avgTemp = getAverageTemperature(sim);
    expect(avgTemp).toBeGreaterThan(23);
    expect(avgTemp).toBeLessThan(27);
    
    // Test 'bolt' alias for 'lightning'
    sim.queuedCommands = [{
      type: 'bolt',
      args: ['8', '8']
    }];
    
    const particleCount = sim.particles.length;
    sim.step();
    expect(sim.particles.length).toBeGreaterThan(particleCount);
  });
});

function getAverageTemperature(sim: any): number {
  let total = 0;
  let count = 0;
  
  for (let x = 0; x < sim.fieldWidth; x++) {
    for (let y = 0; y < sim.fieldHeight; y++) {
      total += sim.temperatureField.get(x, y);
      count++;
    }
  }
  
  return count > 0 ? total / count : 0;
}