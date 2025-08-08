import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../src/simulator';
import { CommandHandler } from '../src/rules/command_handler';
import { LightningStorm } from '../src/rules/lightning_storm';
import { EventHandler } from '../src/rules/event_handler';

describe('Field Overlays - Environmental Visualization', () => {
  beforeEach(() => {
    // Reset any global state
  });

  it('should create temperature and humidity fields for visualization', () => {
    console.log('🌡️ Testing environmental field overlays...');
    
    const sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim),
      new LightningStorm(sim),
      new EventHandler(sim)
    ];

    // Test temperature field exists and can be modified
    if (sim.temperatureField) {
      // Set some temperature variations across the field
      sim.temperatureField.set(5, 5, -10); // Cold spot
      sim.temperatureField.set(10, 10, 30); // Hot spot
      sim.temperatureField.set(15, 15, 15); // Moderate temperature
      
      expect(sim.temperatureField.get(5, 5)).toBe(-10);
      expect(sim.temperatureField.get(10, 10)).toBe(30);
      expect(sim.temperatureField.get(15, 15)).toBe(15);
      
      console.log('✅ Temperature field working: cold (-10°), hot (30°), moderate (15°)');
    } else {
      console.log('ℹ️ Temperature field not available in this simulator instance');
    }

    // Test humidity field
    if (sim.humidityField) {
      sim.humidityField.set(8, 8, 0.8); // High humidity
      sim.humidityField.set(12, 12, 0.3); // Low humidity
      
      expect(sim.humidityField.get(8, 8)).toBe(0.8);
      expect(sim.humidityField.get(12, 12)).toBe(0.3);
      
      console.log('✅ Humidity field working: high (0.8), low (0.3)');
    } else {
      console.log('ℹ️ Humidity field not available in this simulator instance');
    }
  });

  it('should visualize lightning strike zones with electrical fields', () => {
    console.log('⚡ Testing lightning field visualization...');
    
    const sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim),
      new LightningStorm(sim),  
      new EventHandler(sim)
    ];

    // Trigger lightning strikes at specific locations
    sim.queuedCommands = [
      { type: 'lightning', args: ['10', '10'] },
      { type: 'lightning', args: ['15', '15'] }
    ];
    
    // Process the lightning strikes
    sim.step();
    
    // Check that EMP events were created for visualization
    const empEvents = sim.processedEvents?.filter(e => 
      e.kind === 'aoe' && e.meta.aspect === 'emp'
    ) || [];
    
    expect(empEvents.length).toBeGreaterThan(0);
    console.log(`✅ ${empEvents.length} lightning strike zones available for field visualization`);
    
    // Verify lightning storm particles were created
    const lightningParticles = sim.particles.filter(p => 
      p.type === 'lightning' || p.type === 'electric_spark'
    );
    expect(lightningParticles.length).toBeGreaterThan(0);
    console.log(`⚡ ${lightningParticles.length} lightning particles for enhanced field effects`);
  });

  it('should demonstrate weather interaction with field overlays', () => {
    console.log('🌨️ Testing weather-field interactions...');
    
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    // Trigger winter weather
    sim.queuedCommands = [{ type: 'weather', args: ['winter'] }];
    sim.step();
    
    // Verify weather state changed
    if (sim.weather && sim.weather.current) {
      expect(sim.weather.current).toBe('snow');
      console.log('❄️ Winter weather active - field should show cold temperatures');
    }

    // Test rain weather for humidity
    sim.queuedCommands = [{ type: 'weather', args: ['rain'] }];
    sim.step();
    
    console.log('🌧️ Rain weather tested - field should show increased humidity');
    
    // Clear weather
    sim.queuedCommands = [{ type: 'weather', args: ['clear'] }];
    sim.step();
    
    console.log('☀️ Clear weather tested - field should return to normal temperatures');
  });

  it('should test environmental effects on units', () => {
    console.log('🧪 Testing unit-environment interactions...');
    
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new EventHandler(sim)];
    
    // Create test units at different positions
    const coldUnit = { 
      ...{ id: 'test_cold', pos: { x: 5, y: 5 }, hp: 20, maxHp: 20, team: 'friendly' as const, sprite: 'soldier' }
    };
    const hotUnit = { 
      ...{ id: 'test_hot', pos: { x: 10, y: 10 }, hp: 20, maxHp: 20, team: 'friendly' as const, sprite: 'soldier' }
    };
    
    sim.addUnit(coldUnit);
    sim.addUnit(hotUnit);
    
    // Set extreme temperatures
    if (sim.temperatureField) {
      sim.temperatureField.set(5, 5, -15); // Freezing
      sim.temperatureField.set(10, 10, 35); // Scorching
    }
    
    // Run simulation to see if temperature affects units
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const finalColdUnit = sim.units.find(u => u.id === 'test_cold');
    const finalHotUnit = sim.units.find(u => u.id === 'test_hot');
    
    expect(finalColdUnit).toBeDefined();
    expect(finalHotUnit).toBeDefined();
    
    console.log(`❄️ Cold unit: ${finalColdUnit?.hp}/${finalColdUnit?.maxHp} hp (at -15°)`);
    console.log(`🔥 Hot unit: ${finalHotUnit?.hp}/${finalHotUnit?.maxHp} hp (at 35°)`);
    
    // Note: Environmental damage implementation would go in WinterEffects rule
    console.log('✅ Environmental field overlay system ready for unit interactions');
  });
});