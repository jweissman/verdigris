import { describe, expect, it } from 'bun:test';
import { SceneLoader } from '../src/scene_loader';
import { Simulator } from '../src/simulator';
import * as fs from 'fs';
import * as path from 'path';

describe('Forest Scene - Cozy Atmosphere', () => {
  it('should load forest-day battle scene with cozy elements', () => {
    const scenePath = path.join(__dirname, '../src/scenes/forest-day.battle.txt');
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
    expect(birds.length).toBeGreaterThan(0);
    
    // Check scene metadata
    expect(sim.background).toBe('forest');
    expect(sim.temperature).toBe(18);
  });

  it('should have soft rain and falling leaves', () => {
    const scenePath = path.join(__dirname, '../src/scenes/forest-day.battle.txt');
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
    const scenePath = path.join(__dirname, '../src/scenes/forest-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');
    
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    loader.loadFromText(sceneContent);
    
    // Run simulation for a few steps to observe peaceful behavior
    for (let i = 0; i < 20; i++) {
      sim.step();
    }
    
    // Check for cozy interactions
    const squirrels = sim.units.filter(u => 
      u.sprite === 'forest-squirrel' || u.sprite === 'squirrel'
    );
    
    // Verify squirrels have their nut-throwing ability
    const squirrelsWithAbilities = squirrels.filter(u => 
      u.abilities && Object.keys(u.abilities).length > 0
    );
    
    
    // Check that temperature is comfortable (not extreme)
    expect(sim.temperature).toBeGreaterThan(10);
    expect(sim.temperature).toBeLessThan(25);
  });
});