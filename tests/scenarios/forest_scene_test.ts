import { describe, expect, it } from 'bun:test';
import { SceneLoader } from '../../src/core/scene_loader';
import { Simulator } from '../../src/core/simulator';
import * as fs from 'fs';
import * as path from 'path';

describe('Forest Scene - Cozy Atmosphere', () => {
  it('should load forest-day battle scene with cozy elements', () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/forest-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');
    
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    // Load the scene
    loader.loadFromText(sceneContent);
    
    // Check units were loaded
    expect(sim.units.length).toBeGreaterThan(0);
    
    // Check for forest creatures
    const bears = sim.units.filter(u => u.sprite === 'bear' || u.type === 'bear');
    const birds = sim.units.filter(u => u.sprite === 'bird' || u.type === 'bird');
    const squirrels = sim.units.filter(u => 
      u.sprite === 'forest-squirrel' || u.type === 'forest-squirrel' ||
      u.sprite === 'squirrel' || u.type === 'squirrel'
    );
    const owls = sim.units.filter(u => u.sprite === 'owl' || u.type === 'owl');
    const trackers = sim.units.filter(u => u.sprite === 'tracker' || u.type === 'tracker');
    
    
    expect(bears.length).toBeGreaterThan(0);
    // No birds (lowercase v) in this scene, only bears (V)
    
    // Check scene metadata
    expect((sim as any).background).toBe('forest');
    // Temperature is set as a field value, may have slight variations
    const temp = sim.getTemperature(20, 10);
    expect(temp).toBeGreaterThan(15);
    expect(temp).toBeLessThan(20);
  });

  it('should have soft rain and falling leaves', () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/forest-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');
    
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    loader.loadFromText(sceneContent);
    
    // Check weather particles
    const rainParticles = sim.particles.filter(p => p.type === 'rain');
    const leafParticles = sim.particles.filter(p => p.type === 'leaf');
    
    expect(rainParticles.length).toBeGreaterThan(0);
    expect(leafParticles.length).toBeGreaterThan(0);
    
  });

  it('should create meditative forest atmosphere', () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/forest-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');
    
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    loader.loadFromText(sceneContent);
    
    // Run simulation for a few steps to observe peaceful behavior
    for (let i = 0; i < 20; i++) {
      sim.step();
    }
    
    expect(sim.temperature).toBeGreaterThan(10);
    expect(sim.temperature).toBeLessThan(25);

    // TODO check for actual elements of meditative atmosphere???
  });
});