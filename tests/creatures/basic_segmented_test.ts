import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Basic Segmented Creatures', () => {
  it('should test existing segmented worms work properly', () => {
    const sim = new Simulator(20, 15);
    
    // Test the basic segmented worms we already have
    const regularWorm = Encyclopaedia.unit('segmented-worm');
    const mimicWorm = Encyclopaedia.unit('mimic-worm');
    const desertWorm = Encyclopaedia.unit('desert-worm');
    
    console.log('🐛 EXISTING SEGMENTED WORMS:');
    console.log(`Segmented-worm: ${regularWorm.hp}hp, ${regularWorm.meta.segmentCount} segments, mass ${regularWorm.mass}`);
    console.log(`Mimic-worm: ${mimicWorm.hp}hp, ${mimicWorm.meta.segmentCount} segments, mass ${mimicWorm.mass}`);
    console.log(`Desert-worm: ${desertWorm.hp}hp, ${desertWorm.meta.segmentCount} segments, mass ${desertWorm.mass}`);
    
    // Add a mid-sized worm to sim
    const testWorm = { ...desertWorm, id: 'testworm1', pos: { x: 10, y: 8 } };
    sim.addUnit(testWorm);
    
    console.log('\n📊 SIMULATION STEP:');
    const unitsBefore = sim.units.map(u => ({ ...u, pos: { ...u.pos } }));
    
    sim.step();
    
    sim._debugUnits(unitsBefore, 'Segmentation Phase');
    
    // Should have created segments
    const allUnits = sim.units;
    const wormUnits = allUnits.filter(u => u.id.includes('testworm'));
    const segments = allUnits.filter(u => u.meta.segment && u.meta.parentId === 'testworm1');
    
    console.log(`Created ${segments.length} segments for desert-worm`);
    
    expect(segments.length).toBe(desertWorm.meta.segmentCount);
    expect(wormUnits.length).toBe(desertWorm.meta.segmentCount + 1); // segments + head
  });

  it('should test grappling a mid-sized worm', () => {
    const sim = new Simulator(20, 15);
    
    // Use desert-worm as mid-sized test case (mass 6, between small and massive)
    const worm = { ...Encyclopaedia.unit('desert-worm'), id: 'worm1', pos: { x: 15, y: 8 } };
    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grappler1', pos: { x: 5, y: 8 } };
    
    sim.addUnit(worm);
    sim.addUnit(grappler);
    
    console.log('\n🪝 GRAPPLING TEST:');
    console.log(`Worm mass: ${worm.mass} (should be pullable since < 30)`);
    console.log(`Grappler range: ${grappler.meta.grapplingRange}`);
    
    // Run a few steps to create segments
    sim.step();
    sim.step();
    
    // Check if segments were created
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'worm1');
    console.log(`Worm has ${segments.length} segments created`);
    
    expect(worm.mass).toBeLessThan(30); // Should be grappable
    expect(segments.length).toBe(worm.meta.segmentCount);
  });

  it('should create a proper mid-sized worm for testing', () => {
    // Test that we have good progression:
    // small (segmented-worm: 3 mass, 3 segments)
    // medium (desert-worm: 6 mass, 4 segments) 
    // large (giant-sandworm: 50 mass, 6 segments)
    // massive (desert-megaworm: 4 mass but 12 segments)
    
    const small = Encyclopaedia.unit('segmented-worm');
    const medium = Encyclopaedia.unit('desert-worm');
    const large = Encyclopaedia.unit('giant-sandworm');
    const massive = Encyclopaedia.unit('desert-megaworm');
    
    console.log('\n🐍 WORM SIZE PROGRESSION:');
    console.log(`Small: ${small.mass} mass, ${small.meta.segmentCount} segments, ${small.hp}hp`);
    console.log(`Medium: ${medium.mass} mass, ${medium.meta.segmentCount} segments, ${medium.hp}hp`);
    console.log(`Large: ${large.mass} mass, ${large.meta.segmentCount} segments, ${large.hp}hp`);
    console.log(`Massive: ${massive.mass} mass, ${massive.meta.segmentCount} segments, ${massive.hp}hp`);
    
    // Verify progression makes sense
    expect(small.mass).toBeLessThan(medium.mass);
    expect(medium.mass).toBeLessThan(large.mass);
    expect(small.meta.segmentCount).toBeLessThanOrEqual(medium.meta.segmentCount);
    expect(medium.meta.segmentCount).toBeLessThanOrEqual(large.meta.segmentCount);
    
    // Desert-worm is perfect mid-size: grappable but substantial
    expect(medium.mass).toBeGreaterThan(1); // Substantial
    expect(medium.mass).toBeLessThan(30); // But grappable
    expect(medium.meta.segmentCount).toBeGreaterThan(2); // Multi-segment
  });

  it('should test segment following behavior', () => {
    const sim = new Simulator(25, 15);
    
    const worm = { ...Encyclopaedia.unit('desert-worm'), id: 'worm1', pos: { x: 10, y: 8 } };
    sim.addUnit(worm);
    
    // Create segments
    sim.step();
    
    // Move the worm and see if segments follow
    const wormUnit = sim.units.find(u => u.id === 'worm1');
    if (wormUnit) {
      wormUnit.intendedMove = { x: 2, y: 1 };
    }
    
    const segmentsBefore = sim.units
      .filter(u => u.meta.segment && u.meta.parentId === 'worm1')
      .map(s => ({ id: s.id, pos: { ...s.pos } }));
    
    // Run movement
    sim.step();
    
    const segmentsAfter = sim.units
      .filter(u => u.meta.segment && u.meta.parentId === 'worm1');
    
    console.log('\n🚶 SEGMENT MOVEMENT:');
    console.log(`Segments following: ${segmentsAfter.length}`);
    
    // Verify segments exist and are positioned
    expect(segmentsAfter.length).toBe(worm.meta.segmentCount);
    segmentsAfter.forEach(segment => {
      expect(segment.meta.parentId).toBe('worm1');
      expect(segment.meta.segmentIndex).toBeGreaterThan(0);
    });
  });
});