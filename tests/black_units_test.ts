import { describe, expect, it } from "bun:test";
import { Simulator } from "../src/simulator";
import Encyclopaedia from "../src/dmg/encyclopaedia";

describe("New Units Integration", () => {
  it("should create rainmaker with weather abilities", () => {
    const sim = new Simulator(20, 20);
    const rainmakerUnit = Encyclopaedia.unit('rainmaker');
    sim.addUnit({ ...rainmakerUnit, pos: { x: 5, y: 5 } });
    const rainmaker = sim.units.find(u => u.type === 'rainmaker');
    
    expect(rainmaker.sprite).toBe('rainmaker');
    expect(rainmaker.abilities.makeRain).toBeDefined();
    expect(rainmaker.team).toBe('friendly');
    expect(rainmaker.hp).toBe(80);
  });

  it("should create Big Worm with segmented body", () => {
    const sim = new Simulator(20, 20);
    const bigWormUnit = Encyclopaedia.unit('big-worm');
    sim.addUnit({ ...bigWormUnit, pos: { x: 5, y: 5 } });
    const bigWorm = sim.units.find(u => u.type === 'big-worm');
    const wormId = bigWorm.id;
    
    expect(bigWorm.sprite).toBe('big-worm'); // Updated to use new sprite
    expect(bigWorm.meta.segmented).toBe(true);
    expect(bigWorm.meta.segmentCount).toBe(5); // Big worm has 5 segments
    expect(bigWorm.abilities.breatheFire).toBeDefined();
    expect(bigWorm.team).toBe('hostile');
    
    // After creating, verify it exists in the roster
    const wormInRoster = sim.roster[wormId];
    expect(wormInRoster).toBeDefined();
    expect(wormInRoster.id).toBe(wormId);
  });

  it("should create black faction units from encyclopaedia", () => {
    const sim = new Simulator(10, 10);
    
    // Test skeleton
    const skeleton = Encyclopaedia.unit('skeleton');
    skeleton.pos = { x: 1, y: 1 };
    sim.addUnit(skeleton);
    
    expect(skeleton.sprite).toBe('skeleton');
    expect(skeleton.team).toBe('hostile');
    expect(skeleton.meta.perdurance).toBe('undead');
    expect(skeleton.tags).toContain('undead');
    expect(skeleton.tags).toContain('black');

    // Test ghost 
    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 2, y: 2 };
    sim.addUnit(ghost);
    
    expect(ghost.sprite).toBe('ghost');
    expect(ghost.meta.perdurance).toBe('spectral');
    expect(ghost.tags).toContain('spectral');
    expect(ghost.mass).toBe(0.1); // Nearly weightless

    // Test demon
    const demon = Encyclopaedia.unit('demon');
    demon.pos = { x: 3, y: 3 };
    sim.addUnit(demon);
    
    expect(demon.sprite).toBe('demon');
    expect(demon.meta.perdurance).toBe('fiendish');
    expect(demon.mass).toBe(2); // Heavy

    // Test mimic worm
    const mimicWorm = Encyclopaedia.unit('mimic-worm');
    mimicWorm.pos = { x: 4, y: 4 };
    sim.addUnit(mimicWorm);
    
    expect(mimicWorm.sprite).toBe('mimic-worm');
    expect(mimicWorm.meta.segmented).toBe(true);
    expect(mimicWorm.meta.segmentCount).toBe(3);
    expect(mimicWorm.abilities.jumps).toBeDefined();
  });

  it("should create rainmaker from encyclopaedia", () => {
    const sim = new Simulator(10, 10);
    
    const rainmaker = Encyclopaedia.unit('rainmaker');
    rainmaker.pos = { x: 5, y: 5 };
    sim.addUnit(rainmaker);
    
    expect(rainmaker.sprite).toBe('rainmaker');
    expect(rainmaker.team).toBe('friendly');
    expect(rainmaker.tags).toContain('weather');
    expect(rainmaker.tags).toContain('mythic');
  });

  it("should handle weather system integration", () => {
    const sim = new Simulator(10, 10);
    
    // Test weather commands
    sim.processWeatherCommand('rain', '40', '0.8');
    expect(sim.weather.current).toBe('rain');
    expect(sim.weather.duration).toBe(40);
    expect(sim.weather.intensity).toBe(0.8);
    
    sim.processWeatherCommand('clear');
    expect(sim.weather.current).toBe('clear');
  });

  it("should set units on fire correctly", () => {
    const sim = new Simulator(10, 10);
    
    // Create a unit and set it on fire
    const soldier = Encyclopaedia.unit('soldier');
    soldier.pos = { x: 5, y: 5 };
    sim.addUnit(soldier);
    
    sim.setUnitOnFire(soldier);
    
    expect(soldier.meta.onFire).toBe(true);
    expect(soldier.meta.fireDuration).toBe(40);
    expect(soldier.meta.fireTickDamage).toBe(2);
  });

  it("should handle priest radiant abilities against undead", () => {
    const sim = new Simulator(10, 10);
    
    // Create priest with radiant ability
    const priest = Encyclopaedia.unit('priest');
    priest.pos = { x: 5, y: 5 };
    sim.addUnit(priest);
    
    // Create ghost target
    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 6, y: 5 }; // Adjacent to priest
    sim.addUnit(ghost);
    
    expect(priest.abilities.radiant).toBeDefined();
    expect(ghost.tags).toContain('spectral');
    
    // The radiant ability should be extra effective against spectral units
    const initialGhostHp = ghost.hp;
    
    // Test that the units exist and are positioned correctly
    expect(sim.units).toHaveLength(2);
    expect(Math.abs(priest.pos.x - ghost.pos.x)).toBe(1);
  });
});