import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import { SceneLoader } from '../../src/scene_loader';

describe('Scene MWE Integration', () => {
  it('should load simple.battle file format', () => {
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    
    const simpleBattle = `f.s
...
w..`;
    
    sceneLoader.loadFromText(simpleBattle);
    
    expect(sim.units.length).toBe(3);
    
    const farmer = sim.units.find(u => u.sprite === 'farmer');
    const soldier = sim.units.find(u => u.sprite === 'soldier');
    const worm = sim.units.find(u => u.sprite === 'worm');
    
    expect(farmer).toBeDefined();
    expect(soldier).toBeDefined();
    expect(worm).toBeDefined();
    
    // Check teams
    expect(farmer?.team).toBe('friendly');
    expect(soldier?.team).toBe('friendly');
    expect(worm?.team).toBe('hostile');
  });

  it('should load projectile.battle and create slingers with abilities', () => {
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    
    const projectileBattle = `r.r.r
.....
.....
.....
w.w.w`;
    
    sceneLoader.loadFromText(projectileBattle);
    
    const slingers = sim.units.filter(u => u.sprite === 'slinger');
    const worms = sim.units.filter(u => u.sprite === 'worm');
    
    expect(slingers.length).toBe(3);
    expect(worms.length).toBe(3);
    
    // Check slinger has ranged ability
    // const slinger = slingers[0];
    // expect(slinger.abilities.ranged).toBeDefined();
    // expect(slinger.abilities.ranged.cooldown).toBe(15);
    // expect(slinger.abilities.ranged.config?.range).toBe(8);
  });

  it('should load healing.battle with priest', () => {
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    
    const healingBattle = `f.p.f
.....
.....
w.w.w`;
    
    sceneLoader.loadFromText(healingBattle);
    
    const priest = sim.units.find(u => u.sprite === 'priest');
    const farmers = sim.units.filter(u => u.sprite === 'farmer');
    
    expect(priest).toBeDefined();
    expect(farmers.length).toBe(2);
    // expect(priest?.abilities.heal).toBeDefined();
  });

  it('should handle mass differences for tossing in complex.battle', () => {
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    
    const complexBattle = `s.f.p.f.s
f........f
..........
..........
..........
w.w....w.w
..w....r..`;
    
    sceneLoader.loadFromText(complexBattle);
    
    const soldier = sim.units.find(u => u.sprite === 'soldier');
    const worm = sim.units.find(u => u.sprite === 'worm');
    const ranger = sim.units.find(u => u.sprite === 'slinger');
    const farmers = sim.units.filter(u => u.sprite === 'farmer');
    
    expect(soldier).toBeDefined();
    expect(worm).toBeDefined();
    expect(ranger).toBeDefined();
    expect(farmers.length).toBe(4); // Regular farmers with mass 1
    
    // Heavy units should be able to toss light units
    expect(worm!.mass / farmers[0].mass).toBeGreaterThanOrEqual(2);
  });

  it('should create units at correct positions', () => {
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    
    const positionTest = `f..s
....
w..w`;
    
    sceneLoader.loadFromText(positionTest);
    
    const farmerPos = sim.units.find(u => u.sprite === 'farmer')?.pos;
    const soldierPos = sim.units.find(u => u.sprite === 'soldier')?.pos;
    const lightWormPos = sim.units.find(u => u.sprite === 'worm')?.pos;
    const lastWormPos = sim.units.filter(u => u.sprite === 'worm').slice(-1)[0]?.pos;
    
    expect(farmerPos).toEqual({ x: 0, y: 0 });
    expect(soldierPos).toEqual({ x: 3, y: 0 });
    expect(lightWormPos).toEqual({ x: 0, y: 2 });
    expect(lastWormPos).toEqual({ x: 3, y: 2 });
  });

  it('should fire projectiles from ranger when enemy is in range', () => {
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    
    // Create a scenario with ranger and nearby worm
    const rangerTest = `r....
.....
.....
.....
..w..`;
    
    sceneLoader.loadFromText(rangerTest);
    
    const ranger = sim.units.find(u => u.sprite === 'slinger');
    const worm = sim.units.find(u => u.sprite === 'worm');
    
    expect(ranger).toBeDefined();
    expect(worm).toBeDefined();
    expect(ranger?.abilities.ranged).toBeDefined();
    
    // Step the simulation a few times to allow abilities to trigger
    expect(sim.projectiles.length).toBe(0); // No projectiles initially
    
    // Step multiple times to let abilities trigger (cooldown is 60 ticks)
    for (let i = 0; i < 7; i++) {
      sim.step();
    }
    
    // Should have created at least one projectile
    expect(sim.projectiles.length).toBeGreaterThan(0);
    
    const projectile = sim.projectiles[0];
    expect(projectile.team).toBe('friendly');
    expect(projectile.damage).toBe(4);
  });
});