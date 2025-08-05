import { describe, expect, it } from "bun:test";
import { Simulator } from "../src/simulator";

describe("Rainmaker Integration", () => {
  it("should trigger rain when rainmaker uses makeRain ability", () => {
    const sim = new Simulator(10, 10);
    const rainmaker = sim.createRainmaker({ x: 5, y: 5 });
    
    // Verify initial weather is clear
    expect(sim.weather.current).toBe('clear');
    expect(sim.weather.duration).toBe(0);
    
    // Manually trigger the rain ability
    const makeRainAbility = rainmaker.abilities.makeRain;
    expect(makeRainAbility).toBeDefined();
    
    // Execute the ability effect directly
    makeRainAbility.effect(rainmaker, undefined, sim);
    
    // Verify weather changed to rain
    expect(sim.weather.current).toBe('rain');
    expect(sim.weather.duration).toBe(80); // 10 seconds at 8fps
    expect(sim.weather.intensity).toBe(0.8);
  });

  it("should spawn rain particles with correct velocity", () => {
    const sim = new Simulator(10, 10);
    
    // Directly spawn a rain particle to test its properties
    sim.spawnRainParticle();
    
    // Should have spawned exactly one rain particle
    const rainParticles = sim.particles.filter(p => p.type === 'rain');
    expect(rainParticles.length).toBe(1);
    
    // Rain particles should have diagonal movement
    const rainDrop = rainParticles[0];
    expect(rainDrop.vel.x).toBeGreaterThan(0.2); // Minimum diagonal movement
    expect(rainDrop.vel.y).toBeGreaterThan(0.8); // Minimum downward movement
    expect(rainDrop.color).toBe('#4A90E2'); // Blue rain color
  });

  it("should increase humidity field during rain", () => {
    const sim = new Simulator(10, 10);
    
    // Get initial humidity at center
    const initialHumidity = sim.getHumidity(5, 5);
    
    // Set rain weather and run simulation
    sim.setWeather('rain', 20, 1.0); // Max intensity
    
    // Run several steps to let rain affect humidity
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    // Humidity should have increased somewhere on the field
    let foundIncreasedHumidity = false;
    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        if (sim.getHumidity(x, y) > initialHumidity + 0.01) {
          foundIncreasedHumidity = true;
          break;
        }
      }
      if (foundIncreasedHumidity) break;
    }
    
    expect(foundIncreasedHumidity).toBe(true);
  });

  it("should extinguish fires with rain", () => {
    const sim = new Simulator(10, 10);
    
    // Create a unit and set it on fire
    const soldier = { 
      id: 'test_soldier',
      pos: { x: 5, y: 5 },
      hp: 30,
      maxHp: 30,
      team: 'friendly' as const,
      sprite: 'soldier',
      state: 'idle' as const,
      mass: 1,
      abilities: {},
      intendedMove: { x: 0, y: 0 },
      meta: {}
    };
    sim.addUnit(soldier);
    sim.setUnitOnFire(soldier);
    
    expect(soldier.meta.onFire).toBe(true);
    
    // Start heavy rain and create ideal extinguishing conditions
    sim.setWeather('rain', 100, 1.0);
    sim.addMoisture(soldier.pos.x, soldier.pos.y, 1.0, 2); // Max humidity
    sim.addHeat(soldier.pos.x, soldier.pos.y, -15, 2); // Cool area significantly
    
    // Run multiple steps to let rain extinguish the fire
    let extinguished = false;
    for (let i = 0; i < 5; i++) {
      sim.step();
      
      // Get fresh soldier reference since sim.units gets replaced
      const freshSoldier = sim.units.find(u => u.id === soldier.id);
      if (freshSoldier && !freshSoldier.meta.onFire) {
        extinguished = true;
        break;
      }
    }
    
    // Fire should eventually be extinguished by rain conditions
    expect(extinguished).toBe(true);
  });
});