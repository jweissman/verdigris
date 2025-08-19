import { describe, expect, it } from "bun:test";
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from "../../src/dmg/encyclopaedia";
import { addEffectsToUnit } from "../../src/test_helpers/ability_compat";

describe("Rainmaker Integration", () => {
  it("should trigger rain when rainmaker uses makeRain ability", () => {
    const sim = new Simulator(10, 10);
    const rainmakerUnit = Encyclopaedia.unit('rainmaker');
    sim.addUnit({ ...rainmakerUnit, pos: { x: 5, y: 5 } });
    const rainmaker = sim.units.find(u => u.type === 'rainmaker');
    

    expect(sim.weather.current).toBe('clear');
    expect(sim.weather.duration).toBe(0);
    

    expect(rainmaker.abilities).toContain('makeRain');
    

    sim.forceAbility(rainmaker.id, 'makeRain');
    

    sim.step();
    

    expect(sim.weather.current).toBe('rain');
    expect(sim.weather.duration).toBeGreaterThanOrEqual(79); // ~10 seconds at 8fps (may be 79 or 80)
    expect(sim.weather.intensity).toBe(0.8);
  });

  it("should spawn rain particles with correct velocity", () => {
    const sim = new Simulator(10, 10);
    

    sim.spawnRainParticle();
    

    const rainParticles = sim.particles.filter(p => p.type === 'rain');
    expect(rainParticles.length).toBe(1);
    

    const rainDrop = rainParticles[0];
    expect(rainDrop.vel.x).toBeGreaterThan(0.2); // Minimum diagonal movement
    expect(rainDrop.vel.y).toBeGreaterThan(0.8); // Minimum downward movement

  });

  it("should increase humidity field during rain", () => {
    const sim = new Simulator(10, 10);
    

    const initialHumidity = sim.getHumidity(5, 5);
    

    sim.setWeather('rain', 20, 1.0); // Max intensity
    

    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    

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
    

    const soldier = { 
      id: 'test_soldier',
      pos: { x: 5, y: 5 },
      hp: 30,
      maxHp: 30,
      team: 'friendly' as const,
      sprite: 'soldier',
      state: 'idle' as const,
      mass: 1,
      dmg: 5,
      abilities: [],
      tags: [],
      intendedMove: { x: 0, y: 0 },
      meta: {}
    };
    sim.addUnit(soldier);
    sim.setUnitOnFire(soldier);
    

    sim.step();
    

    const burningUnit = sim.units.find(u => u.id === soldier.id);
    expect(burningUnit?.meta.onFire).toBe(true);
    

    sim.setWeather('rain', 100, 1.0);
    sim.addMoisture(soldier.pos.x, soldier.pos.y, 1.0, 2); // Max humidity
    sim.addHeat(soldier.pos.x, soldier.pos.y, -15, 2); // Cool area significantly
    

    let extinguished = false;
    for (let i = 0; i < 5; i++) {
      sim.step();
      

      const freshSoldier = sim.units.find(u => u.id === soldier.id);
      if (freshSoldier && !freshSoldier.meta.onFire) {
        extinguished = true;
        break;
      }
    }
    

    expect(extinguished).toBe(true);
  });
});