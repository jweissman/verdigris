import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Desert Test Debug', () => {
  it('should analyze what units are actually created in desert scene', () => {
    console.log('🏜️ DESERT SCENE DEBUG');
    
    const sim = new Simulator(30, 20);
    const sceneLoader = new SceneLoader(sim);
    
    console.log('\n1. Loading desert scene...');
    sceneLoader.loadScenario('desert');
    
    console.log(`Initial units: ${sim.units.length}`);
    
    // List all units
    console.log('\n2. All units in desert scene:');
    const unitCounts = new Map<string, number>();
    sim.units.forEach(unit => {
      const type = unit.sprite || unit.id.split(/\d/)[0];
      unitCounts.set(type, (unitCounts.get(type) || 0) + 1);
      console.log(`   ${unit.id}: sprite="${unit.sprite}", type="${type}"`);
    });
    
    console.log('\n3. Unit counts by type:');
    unitCounts.forEach((count, type) => {
      console.log(`   ${type}: ${count} units`);
    });
    
    // Look specifically for desert-worm
    console.log('\n4. Looking for desert-worm units:');
    const desertWorms = sim.units.filter(u => 
      u.type === 'desert-worm' || 
      u.sprite === 'desert-worm' ||
      u.id.includes('desert-worm')
    );
    console.log(`Found ${desertWorms.length} desert-worm units`);
    
    // Check what worm units exist
    const wormUnits = sim.units.filter(u => 
      u.sprite.includes('worm') || u.id.includes('worm')
    );
    console.log(`\n5. All worm-related units (${wormUnits.length}):`);
    wormUnits.forEach(unit => {
      console.log(`   ${unit.id}: sprite="${unit.sprite}", segmented=${unit.meta.segmented}, segments=${unit.meta.segmentCount}`);
    });
    
    expect(sim.units.length).toBeGreaterThan(0);
  });
  
  it('should test segmented creature creation in desert scene', () => {
    console.log('\n🐛 DESERT SEGMENTED CREATURES TEST');
    
    const sim = new Simulator(30, 20);
    const sceneLoader = new SceneLoader(sim);
    
    sceneLoader.loadScenario('desert');
    console.log(`Before step: ${sim.units.length} units`);
    
    // Run a step to trigger segment creation
    sim.step();
    console.log(`After step: ${sim.units.length} units`);
    
    // Look for segments
    const segments = sim.units.filter(u => u.meta.segment);
    console.log(`\nSegments found: ${segments.length}`);
    
    segments.forEach(segment => {
      console.log(`   ${segment.id}: parent=${segment.meta.parentId}, type=${segment.meta.segmentType}, sprite="${segment.sprite}"`);
    });
    
    // Check which units are supposed to be segmented
    const segmentedUnits = sim.units.filter(u => u.meta.segmented && !u.meta.segment);
    console.log(`\nSegmented parent units: ${segmentedUnits.length}`);
    segmentedUnits.forEach(unit => {
      console.log(`   ${unit.id}: sprite="${unit.sprite}", segmentCount=${unit.meta.segmentCount}`);
    });
    
    expect(sim.units.length).toBeGreaterThan(0);
  });
});