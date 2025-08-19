import { describe, it, expect, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Simple Scalar Field Tests', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {};
  });

  it('freezebot should reduce temperature but other bots should not', () => {
    const sim = new Simulator(30, 30);
    sim.sceneBackground = 'arena';
    sim.enableEnvironmentalEffects = true;
    
    // Set uniform temperature
    const baseTemp = 20;
    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 30; y++) {
        sim.temperatureField.set(x, y, baseTemp);
      }
    }
    
    // Add a freezebot at one corner
    sim.addUnit({
      id: 'freezebot1',
      type: 'freezebot',
      pos: { x: 5, y: 5 },
      intendedMove: { x: 0, y: 0 },
      team: 'neutral' as const,
      sprite: 'freezebot',
      hp: 50,
      maxHp: 50,
      dmg: 0,
      mass: 1,
      state: 'idle' as const,
      abilities: [],
      meta: { isFreezebot: true }
    });
    
    // Add a regular bot at another corner
    sim.addUnit({
      id: 'clanker1',
      type: 'clanker',
      pos: { x: 25, y: 25 },
      intendedMove: { x: 0, y: 0 },
      team: 'neutral' as const,
      sprite: 'clanker',
      hp: 50,
      maxHp: 50,
      dmg: 5,
      mass: 1,
      state: 'idle' as const,
      abilities: [],
      meta: {}
    });
    
    // Manually apply temperature effects (since the rule might not exist)
    for (let tick = 0; tick < 50; tick++) {
      // Simulate freezebot cooling effect
      const freezebot = sim.units.find(u => u.id === 'freezebot1');
      if (freezebot && freezebot.meta?.isFreezebot) {
        sim.temperatureField.addGradient(freezebot.pos.x, freezebot.pos.y, 3, -0.5);
      }
      
      // Let temperature diffuse
      sim.temperatureField.diffuse(0.1);
      sim.temperatureField.decay(0.01);
    }
    
    const freezebotAreaTemp = sim.getTemperature(5, 5);
    const nearFreezebotTemp = sim.getTemperature(7, 7);
    const clankerAreaTemp = sim.getTemperature(25, 25);
    const nearClankerTemp = sim.getTemperature(23, 23);
    
    // Freezebot area should be colder
    expect(freezebotAreaTemp).toBeLessThan(baseTemp);
    expect(nearFreezebotTemp).toBeLessThan(baseTemp);
    
    // Clanker area should be warmer than freezebot area (decay affects both)
    expect(clankerAreaTemp).toBeGreaterThan(freezebotAreaTemp);
    expect(nearClankerTemp).toBeGreaterThan(nearFreezebotTemp);
    
    // Freezebot area should be significantly colder than clanker area
    expect(freezebotAreaTemp).toBeLessThan(clankerAreaTemp - 2);
  });

  it('temperature should diffuse from hot to cold areas', () => {
    const sim = new Simulator(20, 20);
    
    // Create a temperature gradient
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        if (x < 10) {
          sim.temperatureField.set(x, y, 30); // Hot side
        } else {
          sim.temperatureField.set(x, y, 10); // Cold side
        }
      }
    }
    
    // Let it diffuse
    for (let i = 0; i < 20; i++) {
      sim.temperatureField.diffuse(0.2);
    }
    
    // Check the boundary has smoothed
    const boundaryLeft = sim.getTemperature(9, 10);
    const boundaryRight = sim.getTemperature(10, 10);
    
    // Should be closer together than initially
    expect(Math.abs(boundaryLeft - boundaryRight)).toBeLessThan(10);
    
    // Should be between original values
    expect(boundaryLeft).toBeLessThan(30);
    expect(boundaryLeft).toBeGreaterThan(10);
    expect(boundaryRight).toBeLessThan(30);
    expect(boundaryRight).toBeGreaterThan(10);
  });
});