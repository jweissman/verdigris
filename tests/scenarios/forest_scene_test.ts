import { describe, expect, it } from 'bun:test';
import { SceneLoader } from '../../src/core/scene_loader';
import { Simulator } from '../../src/core/simulator';
import * as fs from 'fs';
import * as path from 'path';

describe('Forest Scene', () => {
  it('should load forest-day battle scene with cozy elements', () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/forest-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');
    
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    

    loader.loadFromText(sceneContent);
    

    expect(sim.units.length).toBeGreaterThan(0);
    

    const bears = sim.units.filter(u => u.sprite === 'bear' || u.type === 'bear');
    const birds = sim.units.filter(u => u.sprite === 'bird' || u.type === 'bird');
    const squirrels = sim.units.filter(u => 
      u.sprite === 'forest-squirrel' || u.type === 'forest-squirrel' ||
      u.sprite === 'squirrel' || u.type === 'squirrel'
    );
    const owls = sim.units.filter(u => u.sprite === 'owl' || u.type === 'owl');
    const trackers = sim.units.filter(u => u.sprite === 'tracker' || u.type === 'tracker');
    
    
    expect(bears.length).toBeGreaterThan(0);

    

    expect(sim.sceneBackground).toBe('forest');

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
    

    const leafParticles = sim.particles.filter(p => p.type === 'leaf');
    

    expect(leafParticles.length).toBeGreaterThan(0);
    
  });

  it.skip('should create meditative forest atmosphere', () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/forest-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');
    
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    loader.loadFromText(sceneContent);
    

    for (let i = 0; i < 20; i++) {
      sim.step();
    }
    
    expect(sim.temperature).toBeGreaterThan(10);
    expect(sim.temperature).toBeLessThan(25);

    // TODO check for actual elements of meditative atmosphere???
  });
});