import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Segment Creation Bug Debug', () => {
  it('should create exactly the right number of segments', () => {
    const sim = new Simulator(20, 15);
    
    // Test with mesoworm that has custom sprites
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'mesoworm1', pos: { x: 10, y: 8 } };
    
    console.log('🐛 MESOWORM TEST:');
    console.log(`Mesoworm: ${mesoworm.hp}hp, ${mesoworm.meta.segmentCount} segments`);
    console.log(`Custom sprites: ${mesoworm.meta.useCustomSegmentSprites}`);
    console.log(`Sprite: ${mesoworm.sprite}`);
    
    sim.addUnit(mesoworm);
    
    console.log(`\nBefore step: ${sim.units.length} units`);
    console.log(`Queued commands: ${sim.queuedCommands.length}`);
    
    // Run ONE step and track exactly what happens
    sim.step();
    
    console.log(`\nAfter step 1: ${sim.units.length} units`);
    const segments1 = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'mesoworm1');
    console.log(`Segments created: ${segments1.length}`);
    console.log(`Queued commands: ${sim.queuedCommands.length}`);
    
    // Run another step - should NOT create more segments
    sim.step();
    
    console.log(`\nAfter step 2: ${sim.units.length} units`);
    const segments2 = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'mesoworm1');
    console.log(`Segments after step 2: ${segments2.length}`);
    
    // Should have exactly segmentCount segments, no more
    expect(segments2.length).toBe(mesoworm.meta.segmentCount);
    
    // Run one more step to be sure
    sim.step();
    
    console.log(`\nAfter step 3: ${sim.units.length} units`);
    const segments3 = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'mesoworm1');
    console.log(`Segments after step 3: ${segments3.length}`);
    
    expect(segments3.length).toBe(mesoworm.meta.segmentCount);
  });

  it('should test hasSegments check works properly', () => {
    const sim = new Simulator(20, 15);
    
    const worm = { ...Encyclopaedia.unit('desert-worm'), id: 'testworm', pos: { x: 10, y: 8 } };
    sim.addUnit(worm);
    
    // Get the segmented creatures rule
    const segmentedRule = sim.rulebook.find(r => r.constructor.name === 'SegmentedCreatures');
    
    if (segmentedRule) {
      console.log('\n🔍 HASSEGMENTS CHECK:');
      
      // Before any segments are created
      const hasSegmentsBefore = (segmentedRule as any).hasSegments(worm);
      console.log(`Before creation: hasSegments = ${hasSegmentsBefore}`);
      
      // Create segments manually
      (segmentedRule as any).createSegments(worm);
      
      // Check if hasSegments now returns true
      const hasSegmentsAfter = (segmentedRule as any).hasSegments(worm);
      console.log(`After creation (queued): hasSegments = ${hasSegmentsAfter}`);
      console.log(`Queued commands: ${sim.queuedCommands.length}`);
      
      // Process the queued commands
      sim.step();
      
      const hasSegmentsFinal = (segmentedRule as any).hasSegments(worm);
      console.log(`After processing: hasSegments = ${hasSegmentsFinal}`);
      
      const actualSegments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'testworm');
      console.log(`Actual segments: ${actualSegments.length}`);
      
      expect(hasSegmentsFinal).toBe(true);
      expect(actualSegments.length).toBe(worm.meta.segmentCount);
    }
  });

  it('should test the exact dragon bug reproduction', () => {
    const sim = new Simulator(20, 15);
    
    const dragon = { ...Encyclopaedia.unit('dragon'), id: 'dragon1', pos: { x: 10, y: 8 } };
    sim.addUnit(dragon);
    
    console.log('\n🐉 DRAGON BUG REPRODUCTION:');
    console.log(`Dragon segment count: ${dragon.meta.segmentCount}`);
    console.log(`Initial units: ${sim.units.length}`);
    
    // Run just one step and see what happens
    sim.step();
    
    const allUnits = sim.units;
    const dragonSegments = allUnits.filter(u => u.meta.segment && u.meta.parentId === 'dragon1');
    console.log(`After 1 step: ${allUnits.length} total units, ${dragonSegments.length} dragon segments`);
    
    // Check for duplicate segments with same index
    const segmentIndices = dragonSegments.map(s => s.meta.segmentIndex);
    const uniqueIndices = new Set(segmentIndices);
    console.log(`Segment indices: [${segmentIndices.join(', ')}]`);
    console.log(`Unique indices: ${uniqueIndices.size}, Expected: ${dragon.meta.segmentCount}`);
    
    if (uniqueIndices.size !== segmentIndices.length) {
      console.log('❌ DUPLICATE SEGMENTS DETECTED!');
      // Find duplicates
      const seen = new Set();
      const duplicates = segmentIndices.filter(x => seen.size === seen.add(x).size);
      console.log(`Duplicate indices: [${[...new Set(duplicates)].join(', ')}]`);
    }
    
    expect(dragonSegments.length).toBeLessThanOrEqual(dragon.meta.segmentCount);
  });
});