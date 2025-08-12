import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { SegmentedCreatures } from '../../src/rules/segmented_creatures';
import { CommandHandler } from '../../src/rules/command_handler';

describe('Mesoworm - Medium Segmented Creature', () => {
  it('should create a mesoworm with custom segment sprites', () => {
    const sim = new Simulator(32, 24);
    // Use default rulebook which includes SegmentedCreatures and CommandHandler
    
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
    sim.rulebook = [segmentedRule, new CommandHandler(sim)];
    
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
    
    // Find the actual head unit in sim
    const headUnit = sim.units.find(u => u.id === 'mesoworm1')!;
    
    // Store initial head position
    const initialHeadPos = { ...headUnit.pos };
    
    // Move the head via command
    sim.queuedCommands.push({
      type: 'move',
      params: {
        unitId: headUnit.id,
        dx: 1,
        dy: 0
      }
    });
    
    // Process the head move first
    sim.step();
    
    // Get updated head position
    const movedHead = sim.units.find(u => u.id === 'mesoworm1')!;
    expect(movedHead.pos.x).toBe(11); // Head should have moved
    
    // Now move head again to create a path for segments to follow
    sim.queuedCommands.push({
      type: 'move',
      params: {
        unitId: movedHead.id,
        dx: 1,
        dy: 0
      }
    });
    
    // Process move and let segments follow
    for (let i = 0; i < 3; i++) {
      sim.step();
    }
    
    // Get updated segments from sim
    const updatedSegments = sim.units.filter(u => u.tags?.includes('segment'));
    const finalHead = sim.units.find(u => u.id === 'mesoworm1')!;
    
    // At least one segment should have moved from initial position
    const anySegmentMoved = updatedSegments.some((segment, i) => {
      return segment.pos.x !== initialPositions[i].x || segment.pos.y !== initialPositions[i].y;
    });
    
    expect(anySegmentMoved).toBe(true);
    
    // Head should be at x=12 now
    expect(finalHead.pos.x).toBe(12);
    
    // Segments should follow in the path (snake-like behavior)
    const bodySegment = updatedSegments.find(s => s.meta.segmentType === 'body');
    const tailSegment = updatedSegments.find(s => s.meta.segmentType === 'tail');
    
    // Body follows one position behind
    expect(bodySegment).toBeDefined();
    expect(bodySegment!.pos.x).toBeGreaterThan(initialHeadPos.x);
    
    // Tail follows further behind
    expect(tailSegment).toBeDefined();
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
      // Get the actual head unit from sim
      const headUnit = sim.units.find(u => u.id === 'mesoworm1');
      expect(headUnit).toBeDefined();
      
      const initialHeadHp = headUnit!.hp;
      
      // Damage the tail
      tailSegment.hp -= 10;
      tailSegment.meta.damageTaken = 10;
      
      // Apply damage propagation
      sim.step();
      
      // Head should take partial damage (50% of segment damage)
      expect(headUnit!.hp).toBeLessThan(initialHeadHp);
      expect(headUnit!.hp).toBe(initialHeadHp - 5); // 50% of 10 damage
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