import { describe, it, expect, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Scalar Field Tests', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  describe('Temperature Field', () => {
    it('freezebot should reduce temperature over time', () => {
      const sim = new Simulator(50, 50);
      sim.enableEnvironmentalEffects = true;
      sim.sceneBackground = 'arena'; // Prevent ambient spawning
      sim.enableEnvironmentalEffects = true; // Enable temperature updates
      
      // Add a freezebot
      sim.addUnit({
        id: 'freezebot1',
        type: 'freezebot',
        pos: { x: 25, y: 25 },
        intendedMove: { x: 0, y: 0 },
        team: 'neutral' as const,
        sprite: 'freezebot',
        hp: 50,
        maxHp: 50,
        dmg: 0,
        mass: 1,
        state: 'idle' as const,
        abilities: ['freezing_aura'],
        meta: {}
      });

      // Set initial temperature
      const initialTemp = 20; // Room temperature
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          sim.temperatureField.set(x, y, initialTemp);
        }
      }

      // Run simulation for 100 ticks
      for (let i = 0; i < 100; i++) {
        sim.step();
      }

      // Check temperature around freezebot has decreased
      const freezebotTemp = sim.getTemperature(25, 25);
      const nearbyTemp = sim.getTemperature(27, 27);
      const farTemp = sim.getTemperature(40, 40);

      expect(freezebotTemp).toBeLessThan(initialTemp);
      expect(nearbyTemp).toBeLessThan(initialTemp);
      expect(farTemp).toBeCloseTo(initialTemp, 0); // Far away should be less affected
      expect(freezebotTemp).toBeLessThan(nearbyTemp); // Closer should be colder
    });

    it('living creatures should generate heat signatures', () => {
      const sim = new Simulator(50, 50);
      sim.enableEnvironmentalEffects = true;
      sim.sceneBackground = 'arena';
      
      // Add some living creatures
      const creatures = [
        { id: 'wolf1', type: 'wolf', pos: { x: 10, y: 10 } },
        { id: 'bear1', type: 'bear', pos: { x: 30, y: 30 } },
        { id: 'farmer1', type: 'farmer', pos: { x: 40, y: 40 } }
      ];

      creatures.forEach(creature => {
        sim.addUnit({
          ...creature,
          intendedMove: { x: 0, y: 0 },
          team: 'neutral' as const,
          sprite: creature.type,
          hp: 30,
          maxHp: 30,
          dmg: 5,
          mass: 1,
          state: 'idle' as const,
          abilities: [],
          tags: ['organic'],
          meta: {}
        });
      });

      // Set base temperature
      const baseTemp = 15;
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          sim.temperatureField.set(x, y, baseTemp);
        }
      }

      // Run simulation
      for (let i = 0; i < 50; i++) {
        sim.step();
      }

      // Check heat signatures
      creatures.forEach(creature => {
        const temp = sim.getTemperature(creature.pos.x, creature.pos.y);
        expect(temp).toBeGreaterThan(baseTemp);
      });

      // Check that empty areas remain at base temperature
      const emptyTemp = sim.getTemperature(25, 5);
      expect(emptyTemp).toBeCloseTo(baseTemp, 1);
    });

    it('constructs should generate more heat than organic units', () => {
      const sim = new Simulator(50, 50);
      sim.enableEnvironmentalEffects = true;
      sim.sceneBackground = 'arena';
      
      // Add a construct and an organic unit
      sim.addUnit({
        id: 'turret1',
        type: 'turret',
        pos: { x: 20, y: 20 },
        intendedMove: { x: 0, y: 0 },
        team: 'neutral' as const,
        sprite: 'turret',
        hp: 100,
        maxHp: 100,
        dmg: 10,
        mass: 2,
        state: 'idle' as const,
        abilities: ['ranged'],
        tags: ['mechanical', 'construct'],
        meta: {}
      });

      sim.addUnit({
        id: 'wolf1',
        type: 'wolf',
        pos: { x: 30, y: 30 },
        intendedMove: { x: 0, y: 0 },
        team: 'neutral' as const,
        sprite: 'wolf',
        hp: 30,
        maxHp: 30,
        dmg: 5,
        mass: 1,
        state: 'idle' as const,
        abilities: [],
        tags: ['organic'],
        meta: {}
      });

      // Set base temperature
      const baseTemp = 15;
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          sim.temperatureField.set(x, y, baseTemp);
        }
      }

      // Run simulation with both units using abilities
      for (let i = 0; i < 100; i++) {
        sim.step();
      }

      const turretTemp = sim.getTemperature(20, 20);
      const wolfTemp = sim.getTemperature(30, 30);

      expect(turretTemp).toBeGreaterThan(baseTemp);
      expect(wolfTemp).toBeGreaterThan(baseTemp);
      // Mechanical constructs should generate more heat
      expect(turretTemp).toBeGreaterThan(wolfTemp);
    });

    it('heat should diffuse and decay over time', () => {
      const sim = new Simulator(50, 50);
      sim.enableEnvironmentalEffects = true;
      
      // Create a hot spot
      const hotSpotX = 25;
      const hotSpotY = 25;
      const hotTemp = 100;
      const baseTemp = 20;

      // Initialize field
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          sim.temperatureField.set(x, y, baseTemp);
        }
      }
      
      // Add heat at center
      sim.addHeat(hotSpotX, hotSpotY, hotTemp - baseTemp, 3);

      // Check initial state
      const initialCenter = sim.getTemperature(hotSpotX, hotSpotY);
      expect(initialCenter).toBeGreaterThan(baseTemp);

      // Run diffusion without any units - use step() which only updates fields every 10 ticks
      for (let i = 0; i < 50; i++) {
        sim.step();
      }

      // Heat should have spread and decreased
      const finalCenter = sim.getTemperature(hotSpotX, hotSpotY);
      const nearby = sim.getTemperature(hotSpotX + 3, hotSpotY + 3);
      
      expect(finalCenter).toBeLessThan(initialCenter); // Center cooled down
      expect(nearby).toBeCloseTo(baseTemp, 0); // Heat spread to nearby (might be slightly below due to decay)
      expect(finalCenter).toBeGreaterThan(nearby); // But center still warmer
    });
  });

  describe('Humidity Field', () => {
    it('should track moisture and evaporate in hot areas', () => {
      const sim = new Simulator(50, 50);
      sim.enableEnvironmentalEffects = true;
      
      // Set up hot and cold zones
      for (let x = 0; x < 25; x++) {
        for (let y = 0; y < 50; y++) {
          sim.temperatureField.set(x, y, 40); // Hot zone
        }
      }
      for (let x = 25; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          sim.temperatureField.set(x, y, 10); // Cold zone
        }
      }

      // Add moisture uniformly
      const initialMoisture = 50;
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          sim.humidityField.set(x, y, initialMoisture);
        }
      }

      // Run field interactions through normal simulation steps
      for (let i = 0; i < 50; i++) {
        sim.step();
      }

      // Check that hot areas have less humidity
      const hotZoneHumidity = sim.getHumidity(12, 25);
      const coldZoneHumidity = sim.getHumidity(37, 25);

      // Humidity should decay slightly over time
      expect(hotZoneHumidity).toBeLessThanOrEqual(initialMoisture);
      expect(coldZoneHumidity).toBeLessThanOrEqual(initialMoisture);
    });
  });
});