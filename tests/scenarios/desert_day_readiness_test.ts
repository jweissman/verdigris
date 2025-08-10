import { describe, expect, it } from 'bun:test';
import { SceneLoader } from '../../src/scene_loader';
import { Simulator } from '../../src/simulator';
import * as fs from 'fs';
import * as path from 'path';
import { SegmentedCreatures } from '../../src/rules/segmented_creatures';
import { GrapplingPhysics } from '../../src/rules/grappling_physics';

describe('Desert Day Visual Readiness Checklist', () => {
  const setupDesertScene = () => {
    const scenePath = path.join(__dirname, '../../src/scenes/desert-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    // Add segmented creatures rule BEFORE loading
    sim.rulebook.push(new SegmentedCreatures(sim));
    
    // Add grappling physics
    sim.rulebook.push(new GrapplingPhysics(sim));
    
    loader.loadFromText(sceneContent);
    
    // Run one step to initialize segments
    sim.step();
    
    return { sim, loader };
  };

  it('Desert environment loaded', () => {
    const { sim } = setupDesertScene();
    expect(sim.background).toBe('desert');
    expect(sim.temperature).toBe(35);
  });

  it('Key desert units present', () => {
    const { sim } = setupDesertScene();
    const grapplers = sim.units.filter(u => u.sprite === 'grappler');
    const wormHunters = sim.units.filter(u => u.sprite === 'wormrider');
    const waterbearers = sim.units.filter(u => u.sprite === 'waterpriest');
    
    expect(grapplers.length).toBeGreaterThan(0);
    expect(wormHunters.length).toBeGreaterThan(0);
    expect(waterbearers.length).toBeGreaterThan(0);
    
  });

  it('Segmented worms have segments', () => {
    const { sim } = setupDesertScene();
    const segmentedUnits = sim.units.filter(u => 
      u.meta?.segmented || u.segments?.length > 0
    );
    
    
    segmentedUnits.forEach(unit => {
      if (unit.segments) {
      }
    });
    
    expect(segmentedUnits.length).toBeGreaterThan(0);
  });

  it('Grappling hook projectiles work', () => {
    const { sim } = setupDesertScene();
    
    // Find a grappler that hasn't used their hook yet
    const grappler = sim.units.find(u => 
      u.sprite === 'grappler' && 
      (!u.lastAbilityTick || !u.lastAbilityTick.grapplingHook || 
       sim.ticks - u.lastAbilityTick.grapplingHook > 30)
    );
    
    if (grappler && grappler.abilities.grapplingHook) {
      const target = { x: grappler.pos.x + 5, y: grappler.pos.y };
      
      // Clear the projectiles array to make sure we're only counting new ones
      sim.projectiles = [];
      
      // Use the compatibility .effect() method
      grappler.abilities.grapplingHook.effect(grappler, target, sim);
      
      // Process the queued command
      sim.step();
      
      const grapples = sim.projectiles.filter(p => p.type === 'grapple');
      expect(grapples.length).toBeGreaterThan(0);
    }
  });

  it('combat', () => {
    const { sim } = setupDesertScene();
    
    // Run combat simulation
    for (let i = 0; i < 30; i++) {
      sim.step();
    }
    
    const survivingUnits = sim.units.filter(u => u.hp > 0).length;
    
    expect(survivingUnits).toBeGreaterThan(0);
  });
});