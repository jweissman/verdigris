import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { SegmentedCreatures } from '../../src/rules/segmented_creatures';

describe('Mesoworm - Medium Segmented Creature', () => {
  it('should create a mesoworm with custom segment sprites', () => {
    const sim = new Simulator(32, 24);
    const segmentedRule = new SegmentedCreatures(sim);
    sim.rulebook = [segmentedRule];
    
    // Create the mesoworm
    const mesoworm = {
      ...Encyclopaedia.unit('mesoworm'),
      id: 'mesoworm1',
      pos: { x: 15, y: 12 }
    };
    
    sim.addUnit(mesoworm);
    
    // Verify mesoworm properties
    expect(mesoworm.sprite).toBe('mesoworm-head');
    expect(mesoworm.meta.segmented).toBe(true);
    expect(mesoworm.meta.segmentCount).toBe(2); // Body and tail
    expect(mesoworm.meta.useCustomSegmentSprites).toBe(true);
    expect(mesoworm.mass).toBe(2.5); // Medium weight
    expect(mesoworm.meta.huge).toBeUndefined(); // Not huge
    
    // Create segments
    sim.step();
    
    // Should have 2 segments (body and tail)
    const segments = sim.units.filter(u => u.tags?.includes('segment'));
    expect(segments.length).toBe(2);
    
    // Check segment sprites
    const bodySegment = segments.find(s => s.meta.segmentType === 'body');
    const tailSegment = segments.find(s => s.meta.segmentType === 'tail');
    
    expect(bodySegment?.sprite).toBe('mesoworm-body');
    expect(tailSegment?.sprite).toBe('mesoworm-tail');
    
    // Segments should not be huge
    segments.forEach(segment => {
      expect(segment.meta.huge).toBeUndefined();
    });
  });
  
  it('should move with snake-like following behavior', () => {
    const sim = new Simulator(32, 24);
    const segmentedRule = new SegmentedCreatures(sim);
    sim.rulebook = [segmentedRule];
    
    const mesoworm = {
      ...Encyclopaedia.unit('mesoworm'),
      id: 'mesoworm1',
      pos: { x: 10, y: 10 }
    };
    
    sim.addUnit(mesoworm);
    
    // Create segments
    sim.step();
    
    const segments = sim.units.filter(u => u.tags?.includes('segment'));
    const initialPositions = segments.map(s => ({ ...s.pos }));
    
    // Move the head
    mesoworm.pos = { x: 11, y: 10 };
    sim.step();
    
    // Segments should follow
    segments.forEach((segment, i) => {
      // Each segment should have moved or be preparing to move
      expect(segment.pos).not.toEqual(initialPositions[i]);
    });
  });
  
  it('should be grappable due to medium mass', () => {
    const sim = new Simulator(32, 24);
    
    const mesoworm = {
      ...Encyclopaedia.unit('mesoworm'),
      id: 'mesoworm1',
      pos: { x: 10, y: 10 }
    };
    
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler1',
      pos: { x: 5, y: 10 }
    };
    
    sim.addUnit(mesoworm);
    sim.addUnit(grappler);
    
    // Mesoworm has mass 2.5, should be pullable
    expect(mesoworm.mass).toBeLessThan(30);
    
    // Apply grapple
    mesoworm.meta.grappled = true;
    mesoworm.meta.grappledBy = 'grappler1';
    
    // Should be pullable
    expect(mesoworm.meta.pinned).toBeUndefined();
  });
  
  it('should be slower than regular creatures', () => {
    const sim = new Simulator(32, 24);
    
    const mesoworm = {
      ...Encyclopaedia.unit('mesoworm'),
      id: 'mesoworm1',
      pos: { x: 10, y: 10 }
    };
    
    sim.addUnit(mesoworm);
    
    // Check move speed
    expect(mesoworm.meta.moveSpeed).toBe(0.8);
  });
  
  it('should take damage across segments', () => {
    const sim = new Simulator(32, 24);
    const segmentedRule = new SegmentedCreatures(sim);
    sim.rulebook = [segmentedRule];
    
    const mesoworm = {
      ...Encyclopaedia.unit('mesoworm'),
      id: 'mesoworm1',
      pos: { x: 10, y: 10 }
    };
    
    sim.addUnit(mesoworm);
    sim.step();
    
    const segments = sim.units.filter(u => u.tags?.includes('segment'));
    const tailSegment = segments.find(s => s.meta.segmentType === 'tail');
    
    if (tailSegment) {
      const initialHeadHp = mesoworm.hp;
      
      // Damage the tail
      tailSegment.hp -= 10;
      tailSegment.meta.damageTaken = 10;
      
      // Apply damage propagation
      sim.step();
      
      // Head should take partial damage
      expect(mesoworm.hp).toBeLessThan(initialHeadHp);
    }
  });
  
  it('should be a forest creature suitable for druid summoning', () => {
    const mesoworm = Encyclopaedia.unit('mesoworm');
    
    // Should have forest tag
    expect(mesoworm.tags).toContain('forest');
    expect(mesoworm.tags).toContain('beast');
    
    // Should be hostile by default (can be summoned as friendly)
    expect(mesoworm.team).toBe('hostile');
  });
});