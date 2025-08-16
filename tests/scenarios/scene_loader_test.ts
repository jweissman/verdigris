import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Scene Loader', () => {
  it('should load simple text format scene', () => {
    const sim = new Simulator(128, 128);
    const loader = new SceneLoader(sim);
    
    const sceneText = `
f.s
...
w.w`;
    
    loader.loadFromText(sceneText.trim());
    

    expect(sim.units.length).toBe(4);
    

    const farmer = sim.units.find(u => u.sprite === 'farmer');
    expect(farmer).toBeDefined();
    expect(farmer?.pos).toEqual({ x: 0, y: 0 });
    expect(farmer?.team).toBe('friendly');
    
    const soldier = sim.units.find(u => u.sprite === 'soldier');
    expect(soldier).toBeDefined();
    expect(soldier?.pos).toEqual({ x: 2, y: 0 });
    
    const worms = sim.units.filter(u => u.sprite === 'worm');
    expect(worms.length).toBe(2);
    



  });

  it('should load predefined battle formations', () => {
    const sim = new Simulator(128, 128);
    const loader = new SceneLoader(sim);
    
    loader.loadScenario('simple');

    
    expect(sim.units.length).toBeGreaterThan(0);
    

    const friendlyUnits = sim.units.filter(u => u.team === 'friendly');
    const hostileUnits = sim.units.filter(u => u.team === 'hostile');
    
    expect(friendlyUnits.length).toBeGreaterThan(0);
    expect(hostileUnits.length).toBeGreaterThan(0);
  });

  it('should handle empty spaces correctly', () => {
    const sim = new Simulator(128, 128);
    const loader = new SceneLoader(sim);
    
    const sceneText = `
f...s
.....
w...w`;
    
    loader.loadFromText(sceneText.trim());
    

    expect(sim.units.length).toBe(4);
    

    const leftFarmer = sim.units.find(u => u.pos.x === 0 && u.pos.y === 0);
    const rightSoldier = sim.units.find(u => u.pos.x === 4 && u.pos.y === 0);
    
    expect(leftFarmer).toBeDefined();
    expect(rightSoldier).toBeDefined();
  });

  it('should create units with proper abilities', () => {
    const sim = new Simulator(128, 128);
    const loader = new SceneLoader(sim);
    
    const sceneText = `w`;
    loader.loadFromText(sceneText.trim());
    
    const worm = sim.units[0];
    expect(worm.abilities.includes('jumps')).toBe(true);
    expect(Encyclopaedia.abilities.jumps.cooldown).toBe(100);
    expect(Encyclopaedia.abilities.jumps.config?.impact.radius).toBe(3);
  });

  it('should parse metadata commands after --- separator', () => {
    const sim = new Simulator(128, 128);
    const loader = new SceneLoader(sim);
    
    const sceneText = `
s..
---
bg desert
temperature 35`;
    
    loader.loadFromText(sceneText.trim());
    

    expect((sim as any).sceneBackground).toBe('desert');
    

    expect(sim.temperature).toBe(35);
  });

  it('should parse commands with arguments', () => {
    const sim = new Simulator(128, 128);
    const loader = new SceneLoader(sim);
    
    const sceneText = `
s..
---
weather rain 100
weather sand 120 0.8`;
    
    loader.loadFromText(sceneText.trim());
    


    const rainParticles = sim.particles.filter(p => p.type === 'rain');
    const sandParticles = sim.particles.filter(p => p.type === 'sand');
    
    expect(rainParticles.length).toBeGreaterThan(0);
    expect(sandParticles.length).toBeGreaterThan(0);
  });

  it('should handle background command specially', () => {
    const sim = new Simulator(128, 128);
    const loader = new SceneLoader(sim);
    
    const sceneText = `
s..
---
bg lake`;
    
    loader.loadFromText(sceneText.trim());
    

    expect((sim as any).sceneBackground).toBe('lake');
    expect(sim.queuedCommands?.length || 0).toBe(0);
  });




    


    



    


    



});