import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Scene Loader Segment Bug', () => {
  it('should test scene loading with segmented creatures', () => {
    const sim = new Simulator(20, 15);
    const loader = new SceneLoader(sim);
    
    // Create a minimal scene with one segmented creature
    const testScene = `
w.........
..........
---
`;
    
    console.log('🎬 SCENE LOADER TEST:');
    console.log(`Initial units: ${sim.units.length}`);
    console.log(`Initial queued commands: ${sim.queuedCommands.length}`);
    
    // Load the scene
    loader.loadFromText(testScene);
    
    console.log(`After scene load: ${sim.units.length} units`);
    console.log(`Queued commands: ${sim.queuedCommands.length}`);
    
    // Process one step - this should create the unit and its segments
    sim.step();
    
    console.log(`After step 1: ${sim.units.length} units`);
    const worms = sim.units.filter(u => u.sprite === 'worm' || u.id.includes('worm'));
    const segments = sim.units.filter(u => u.meta.segment);
    console.log(`Worm units: ${worms.length}, Segments: ${segments.length}`);
    
    // Check for the specific segmented-worm
    const segmentedWorms = sim.units.filter(u => u.id.includes('segmented-worm'));
    console.log(`Segmented-worm units: ${segmentedWorms.length}`);
    
    if (segmentedWorms.length > 0) {
      const mainWorm = segmentedWorms[0];
      const wormSegments = sim.units.filter(u => u.meta.segment && u.meta.parentId === mainWorm.id);
      console.log(`Segments for ${mainWorm.id}: ${wormSegments.length}`);
      
      expect(wormSegments.length).toBe(3); // segmented-worm has 3 segments
    }
  });

  it('should test the exact multi-creature scenario that fails', () => {
    const sim = new Simulator(30, 20);
    const loader = new SceneLoader(sim);
    
    // Reproduce the dragon encounter that creates too many segments
    const dragonScene = `
L.......D
w........
---
`;
    
    console.log('\n🐉 DRAGON ENCOUNTER REPRODUCTION:');
    
    loader.loadFromText(dragonScene);
    console.log(`After scene load: ${sim.queuedCommands.length} queued commands`);
    
    // Process step by step and track what happens
    for (let step = 1; step <= 3; step++) {
      const beforeUnits = sim.units.length;
      const beforeCommands = sim.queuedCommands.length;
      
      sim.step();
      
      const afterUnits = sim.units.length;
      const afterCommands = sim.queuedCommands.length;
      
      console.log(`Step ${step}: ${beforeUnits}→${afterUnits} units, ${beforeCommands}→${afterCommands} commands`);
      
      // Check for specific creatures
      const lancers = sim.units.filter(u => u.id.includes('lancer'));
      const dragons = sim.units.filter(u => u.id.includes('dragon'));
      const worms = sim.units.filter(u => u.id.includes('worm'));
      
      console.log(`  Lancers: ${lancers.length}, Dragons: ${dragons.length}, Worms: ${worms.length}`);
      
      if (dragons.length > 0) {
        const dragonSegments = sim.units.filter(u => u.meta.segment && u.meta.parentId.includes('dragon'));
        console.log(`  Dragon segments: ${dragonSegments.length}`);
      }
    }
  });

  it('should test if the spawn command type conflicts', () => {
    const sim = new Simulator(20, 15);
    
    console.log('\n🔧 SPAWN COMMAND CONFLICT TEST:');
    
    // Manually create a dragon and see what happens
    const dragon = { ...require('../../src/dmg/encyclopaedia').default.unit('dragon'), id: 'dragon1', pos: { x: 10, y: 10 } };
    
    // Queue spawn command like scene loader does
    sim.queuedCommands.push({
      type: 'spawn',
      params: { unit: dragon }
    });
    
    console.log(`Queued spawn command: ${sim.queuedCommands.length} commands`);
    
    // Process - this should create dragon AND trigger segment creation
    sim.step();
    
    const allUnits = sim.units;
    const dragonUnits = allUnits.filter(u => u.id.includes('dragon'));
    const segments = allUnits.filter(u => u.meta.segment && u.meta.parentId === 'dragon1');
    
    console.log(`Total units: ${allUnits.length}`);
    console.log(`Dragon units: ${dragonUnits.length}`);
    console.log(`Dragon segments: ${segments.length}`);
    console.log(`Expected segments: 8`);
    
    // The bug might be here - spawn commands processed multiple times?
    expect(segments.length).toBeLessThanOrEqual(8);
  });
});