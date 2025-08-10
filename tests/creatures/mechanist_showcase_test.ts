import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { CommandHandler } from '../../src/rules/command_handler';
import { Abilities } from '../../src/rules/abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { LightningStorm } from '../../src/rules/lightning_storm';

describe('Mechanist Showcase', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  it('should deploy the complete mechanist force', () => {
    const sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim), 
      new Abilities(sim), 
      new EventHandler(sim),
      new LightningStorm(sim)
    ];

    // Deploy Mechatronist commander
    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 10, y: 5 } };
    sim.addUnit(mechatronist);

    // Deploy all mechanist support units in formation
    const mechanistCrew = [
      { type: 'builder', pos: { x: 8, y: 7 } },
      { type: 'fueler', pos: { x: 12, y: 7 } },
      { type: 'mechanic', pos: { x: 8, y: 9 } },
      { type: 'engineer', pos: { x: 12, y: 9 } },
      { type: 'welder', pos: { x: 9, y: 11 } },
      { type: 'assembler', pos: { x: 11, y: 11 } }
    ];

    mechanistCrew.forEach(({ type, pos }) => {
      const unit = { ...Encyclopaedia.unit(type), pos };
      sim.addUnit(unit);
    });

    // Add some constructs to support
    const constructs = [
      { type: 'clanker', pos: { x: 6, y: 8 } },
      { type: 'freezebot', pos: { x: 14, y: 8 } },
      { type: 'spiker', pos: { x: 6, y: 10 } },
      { type: 'roller', pos: { x: 14, y: 10 } },
      { type: 'zapper', pos: { x: 10, y: 13 } }
    ];

    constructs.forEach(({ type, pos }) => {
      const unit = { ...Encyclopaedia.unit(type), pos };
      sim.addUnit(unit);
    });

    // Add opposing forces for testing
    const enemies = [
      { type: 'worm', pos: { x: 3, y: 5 } },
      { type: 'worm', pos: { x: 17, y: 5 } },
      { type: 'worm', pos: { x: 10, y: 2 } }
    ];

    enemies.forEach(({ type, pos }) => {
      const unit = { ...Encyclopaedia.unit(type), pos };
      sim.addUnit(unit);
    });

    // Deploy the mighty Mechatron
    const mechatron = { ...Encyclopaedia.unit('mechatron'), pos: { x: 10, y: 15 } };
    sim.addUnit(mechatron);

    // Run a few simulation steps
    for (let i = 0; i < 5; i++) {
      sim.step();
    }

    // Verify deployment
    expect(sim.units.length).toBeGreaterThan(15);
    
    // Verify mechanist crew
    mechanistCrew.forEach(({ type }) => {
      const found = sim.units.find(u => u.type === type);
      expect(found).toBeDefined();
    });

    // Verify constructs
    constructs.forEach(({ type }) => {
      const found = sim.units.find(u => u.type === type);
      expect(found).toBeDefined();
    });

    // Verify mechatron (should have phantom units)
    const mechatronUnits = sim.units.filter(u => u.id?.includes('mechatron'));
    expect(mechatronUnits.length).toBeGreaterThan(1); // Main + phantoms
  });

  it('should test mechanist abilities', () => {
    const sim = new Simulator(20, 20);
    
    // Create a mechanist with constructs nearby
    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 10, y: 10 } };
    sim.addUnit(mechatronist);
    
    const fueler = { ...Encyclopaedia.unit('fueler'), pos: { x: 11, y: 10 } };
    sim.addUnit(fueler);
    
    const clanker = { ...Encyclopaedia.unit('clanker'), pos: { x: 9, y: 10 } };
    sim.addUnit(clanker);
    
    // Test that units exist and have abilities
    expect(mechatronist.abilities?.callAirdrop).toBeDefined();
    expect(fueler.abilities?.powerSurge).toBeDefined();
    
    // Run simulation to test interactions
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Units should still exist (not destroyed)
    expect(sim.units.find(u => u.id === mechatronist.id)).toBeDefined();
    expect(sim.units.find(u => u.id === fueler.id)).toBeDefined();
  });
});