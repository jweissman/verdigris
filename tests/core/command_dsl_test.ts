import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { CommandHandler } from '../../src/rules/command_handler';
import { EventHandler } from '../../src/rules/event_handler';
import { Tossing } from '../../src/rules/tossing';
import { LightningStorm } from '../../src/rules/lightning_storm';

describe('Command DSL', () => {
  it('should handle temperature command', () => {
    const sim = new Simulator();
    sim.rulebook = [new EventHandler(sim), new CommandHandler(sim)];
    
    // Queue temperature command
    sim.queuedCommands = [{
      type: 'temperature',
      params: { amount: 30 }
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
    sim.rulebook = [new EventHandler(sim), new CommandHandler(sim)];
    
    // Queue weather command
    sim.queuedCommands = [{
      type: 'weather',
      params: { weatherType: 'rain', duration: 100, intensity: 0.8 }
    }];
    
    // Process command
    sim.step();
    
    // Check weather was set
    expect(sim.weather.current).toBe('rain');
  });

  it('should handle weather command with sandstorm', () => {
    const sim = new Simulator();
    sim.rulebook = [new EventHandler(sim), new CommandHandler(sim)];
    
    // Queue sandstorm weather
    sim.queuedCommands = [{
      type: 'weather',
      params: { weatherType: 'sand', duration: 150, intensity: 0.7 }
    }];
    
    // Process command
    sim.step();
    
    // Check weather was set
    expect(sim.weather.current).toBe('sandstorm');
  });

  it('should handle toss command', () => {
    const sim = new Simulator();
    sim.rulebook = [new EventHandler(sim), new CommandHandler(sim), new Tossing(sim)];
    
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
      params: {
        direction: { x: 1, y: 0 },  // Toss eastward
        force: 5,
        distance: 3
      },
      unitId: 'test-unit'
    }];
    
    // Process command
    sim.step();
    
    // Unit should have toss state set
    const tossedUnit = sim.units.find(u => u.id === 'test-unit');
    expect(tossedUnit?.meta?.tossing).toBe(true);
    expect(tossedUnit?.meta?.tossTarget).toBeDefined();
    
    // After a few more steps, position should change
    const initialPos = { ...unit.pos };
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    const finalUnit = sim.units.find(u => u.id === 'test-unit');
    expect(finalUnit?.pos).not.toEqual(initialPos);
  });

  it('should handle lightning command', () => {
    const sim = new Simulator();
    sim.rulebook = [new LightningStorm(sim), new EventHandler(sim), new CommandHandler(sim)];
    
    // Queue lightning command
    sim.queuedCommands = [{
      type: 'lightning',
      params: { x: 10, y: 10 }
    }];
    
    // Process command
    const initialParticleCount = sim.particles.length;
    sim.step();
    
    // Should create lightning particles
    expect(sim.particles.length).toBeGreaterThan(initialParticleCount);
  });

  it('should handle deploy command', () => {
    const sim = new Simulator();
    sim.rulebook = [new EventHandler(sim), new CommandHandler(sim)];
    
    // Queue deploy command
    sim.queuedCommands = [{
      type: 'deploy',
      params: { unitType: 'soldier', x: 5, y: 5 }
    }];
    
    // Process command
    const initialUnitCount = sim.units.length;
    sim.step(); // CommandHandler will process command → event → spawn
    
    // Should create a new unit
    expect(sim.units.length).toBe(initialUnitCount + 1);
    const soldier = sim.units.find(u => u.sprite === 'soldier');
    expect(soldier).toBeDefined();
    expect(soldier?.pos).toEqual({ x: 5, y: 5 });
  });

  it('should handle command aliases', () => {
    const sim = new Simulator();
    sim.rulebook = [new LightningStorm(sim), new EventHandler(sim), new CommandHandler(sim)];
    
    // Test 'temp' alias for 'temperature'
    sim.queuedCommands = [{
      type: 'temp',
      params: { amount: 25 }
    }];
    
    sim.step();
    
    const avgTemp = getAverageTemperature(sim);
    expect(avgTemp).toBeGreaterThan(23);
    expect(avgTemp).toBeLessThan(27);
    
    // Test 'bolt' alias for 'lightning'
    sim.queuedCommands = [{
      type: 'bolt',
      params: { x: 8, y: 8 }
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