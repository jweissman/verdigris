import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { SegmentedCreatures } from '../../src/rules/segmented_creatures';

describe('Regular-sized Segmented Worm', () => {
  it('should create a segmented worm that is not huge', () => {
    const sim = new Simulator(32, 24);
    const segmentedRule = new SegmentedCreatures(sim);
    sim.rulebook = [segmentedRule];
    
    // Create the regular segmented worm
    const worm = {
      ...Encyclopaedia.unit('segmented-worm'),
      id: 'worm1',
      pos: { x: 10, y: 10 }
    };
    
    sim.addUnit(worm);
    
    // Verify it's segmented but not huge
    expect(worm.meta.segmented).toBe(true);
    expect(worm.meta.segmentCount).toBe(3);
    expect(worm.meta.huge).toBeUndefined(); // Should NOT be huge
    expect(worm.meta.width).toBeUndefined(); // No special width
    expect(worm.meta.height).toBeUndefined(); // No special height
    
    // Run simulation to create segments
    sim.step();
    
    // Should have segments created
    const segments = sim.units.filter(u => u.tags?.includes('segment'));
    expect(segments.length).toBe(3); // 3 body segments
    
    // Segments should NOT be huge
    segments.forEach(segment => {
      expect(segment.meta.huge).toBeUndefined();
      expect(segment.sprite).toBe('worm'); // Uses regular worm sprite
    });
  });
  
  it('should have different behavior from giant-sandworm', () => {
    const sim = new Simulator(32, 24);
    const segmentedRule = new SegmentedCreatures(sim);
    sim.rulebook = [segmentedRule];
    
    // Create both worms for comparison
    const regularWorm = {
      ...Encyclopaedia.unit('segmented-worm'),
      id: 'regular',
      pos: { x: 5, y: 10 }
    };
    
    const giantWorm = {
      ...Encyclopaedia.unit('giant-sandworm'),
      id: 'giant',
      pos: { x: 15, y: 10 }
    };
    
    sim.addUnit(regularWorm);
    sim.addUnit(giantWorm);
    
    // Compare properties
    expect(regularWorm.sprite).toBe('worm');
    expect(giantWorm.sprite).toBe('big-worm');
    
    expect(regularWorm.meta.huge).toBeUndefined();
    expect(giantWorm.meta.huge).toBe(true);
    
    expect(regularWorm.mass).toBe(3);
    expect(giantWorm.mass).toBe(50);
    
    expect(regularWorm.meta.segmentCount).toBe(3);
    expect(giantWorm.meta.segmentCount).toBe(6);
  });
  
  it('should create segments that follow the head', () => {
    const sim = new Simulator(32, 24);
    const segmentedRule = new SegmentedCreatures(sim);
    sim.rulebook = [segmentedRule];
    
    const worm = {
      ...Encyclopaedia.unit('segmented-worm'),
      id: 'worm1',
      pos: { x: 10, y: 10 }
    };
    
    sim.addUnit(worm);
    
    // Create segments
    sim.step();
    
    const segments = sim.units.filter(u => u.tags?.includes('segment'));
    expect(segments.length).toBe(3); // Should have 3 segments
    
    // Segments should be positioned behind the head
    segments.forEach((segment, i) => {
      // Each segment starts slightly behind the previous
      expect(segment.pos.x).toBeLessThanOrEqual(worm.pos.x);
      expect(segment.sprite).toBe('worm'); // All use regular worm sprite
    });
    
    // Verify segments have parent reference
    segments.forEach(segment => {
      expect(segment.meta.parentId).toBe('worm1');
      expect(segment.meta.segmentIndex).toBeDefined();
    });
  });
  
  it('should be grappable due to lower mass', () => {
    const sim = new Simulator(32, 24);
    
    const worm = {
      ...Encyclopaedia.unit('segmented-worm'),
      id: 'worm1',
      pos: { x: 10, y: 10 }
    };
    
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler1',
      pos: { x: 5, y: 10 }
    };
    
    sim.addUnit(worm);
    sim.addUnit(grappler);
    
    // Regular segmented worm has mass 3, so it should be pullable
    expect(worm.mass).toBeLessThan(30); // Below the immovable threshold
    
    // Apply grapple effect
    worm.meta.grappled = true;
    worm.meta.grappledBy = 'grappler1';
    
    // Worm should be pullable (not pinned like massive creatures)
    expect(worm.meta.pinned).toBeUndefined();
  });
});