import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import Encyclopaedia from '../../../src/dmg/encyclopaedia';
import { SegmentedCreatures } from '../../../src/rules/segmented_creatures';
import { CommandHandler } from '../../../src/core/command_handler';

describe('Mesoworm - Medium Segmented Creature', () => {
  it('should create a mesoworm with custom segment sprites', () => {
    const sim = new Simulator(32, 24);

    

    const mesoworm = {
      ...Encyclopaedia.unit('mesoworm'),
      id: 'mesoworm1',
      pos: { x: 15, y: 12 }
    };
    
    sim.addUnit(mesoworm);
    

    expect(mesoworm.sprite).toBe('mesoworm-head');
    expect(mesoworm.meta.segmented).toBe(true);
    expect(mesoworm.meta.segmentCount).toBe(2); // Body and tail
    expect(mesoworm.meta.useCustomSegmentSprites).toBe(true);
    expect(mesoworm.mass).toBe(2.5); // Medium weight
    expect(mesoworm.meta.huge).toBeUndefined(); // Not huge
    

    sim.step();
    

    const segments = sim.units.filter(u => u.tags?.includes('segment'));
    expect(segments.length).toBe(2);
    

    const bodySegment = segments.find(s => s.meta.segmentType === 'body');
    const tailSegment = segments.find(s => s.meta.segmentType === 'tail');
    
    expect(bodySegment?.sprite).toBe('mesoworm-body');
    expect(tailSegment?.sprite).toBe('mesoworm-tail');
    

    segments.forEach(segment => {
      expect(segment.meta.huge).toBeUndefined();
    });
  });
  
  it('should move with snake-like following behavior', () => {
    const sim = new Simulator(32, 24);
    const segmentedRule = new SegmentedCreatures();
    
    const mesoworm = {
      ...Encyclopaedia.unit('mesoworm'),
      id: 'mesoworm1',
      pos: { x: 10, y: 10 }
    };
    
    sim.addUnit(mesoworm);
    

    sim.step();
    
    const segments = sim.units.filter(u => u.tags?.includes('segment'));
    const initialPositions = segments.map(s => ({ ...s.pos }));
    

    const headUnit = sim.units.find(u => u.id === 'mesoworm1')!;
    

    const initialHeadPos = { ...headUnit.pos };
    

    sim.queuedCommands.push({
      type: 'move',
      params: {
        unitId: headUnit.id,
        dx: 1,
        dy: 0
      }
    });
    

    sim.step();
    

    const movedHead = sim.units.find(u => u.id === 'mesoworm1')!;
    expect(movedHead.pos.x).toBe(11); // Head should have moved
    

    sim.queuedCommands.push({
      type: 'move',
      params: {
        unitId: movedHead.id,
        dx: 1,
        dy: 0
      }
    });
    

    for (let i = 0; i < 3; i++) {
      sim.step();
    }
    

    const updatedSegments = sim.units.filter(u => u.tags?.includes('segment'));
    const finalHead = sim.units.find(u => u.id === 'mesoworm1')!;
    

    const anySegmentMoved = updatedSegments.some((segment, i) => {
      return segment.pos.x !== initialPositions[i].x || segment.pos.y !== initialPositions[i].y;
    });
    
    expect(anySegmentMoved).toBe(true);
    

    expect(finalHead.pos.x).toBe(12);
    

    const bodySegment = updatedSegments.find(s => s.meta.segmentType === 'body');
    const tailSegment = updatedSegments.find(s => s.meta.segmentType === 'tail');
    

    expect(bodySegment).toBeDefined();
    expect(bodySegment!.pos.x).toBeGreaterThan(initialHeadPos.x);
    

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
    

    expect(mesoworm.mass).toBeLessThan(30);
    

    mesoworm.meta.grappled = true;
    mesoworm.meta.grappledBy = 'grappler1';
    

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
    

    expect(mesoworm.meta.moveSpeed).toBe(0.8);
  });
  
  it('should take damage across segments', () => {
    const sim = new Simulator(32, 24);
    const segmentedRule = new SegmentedCreatures();
    
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

      const headUnit = sim.units.find(u => u.id === 'mesoworm1');
      expect(headUnit).toBeDefined();
      
      const initialHeadHp = headUnit!.hp;
      


      sim.queuedCommands.push({
        type: 'damage',
        params: {
          targetId: tailSegment.id,
          amount: 10,
          aspect: 'physical',
          sourceId: 'test'
        }
      });
      

      sim.step(); // Process damage event and set damageTaken
      sim.step(); // Process damage transfer from segment to parent
      
      const headAfter = sim.units.find(u => u.id === 'mesoworm1');
      

      expect(headAfter!.hp).toBeLessThan(initialHeadHp);
      expect(headAfter!.hp).toBe(initialHeadHp - 5); // 50% of 10 damage
    }
  });
  
  it('should be a forest creature suitable for druid summoning', () => {
    const mesoworm = Encyclopaedia.unit('mesoworm');
    

    expect(mesoworm.tags).toContain('forest');
    expect(mesoworm.tags).toContain('beast');
    

    expect(mesoworm.team).toBe('hostile');
  });

  it('should test mesoworm basic functionality', () => {
    const sim = new Simulator(20, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 10, y: 8 } };
    sim.addUnit(mesoworm);
    




    

    
    sim.step();
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'meso1');

    

    segments.forEach((segment, i) => {

    });
    
    expect(segments.length).toBe(2);
    expect(segments.every(s => s.sprite.includes('mesoworm'))).toBe(true);
  });

  it('should test mesoworm movement and segment following', () => {
    const sim = new Simulator(20, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 10, y: 8 } };
    sim.addUnit(mesoworm);
    

    sim.step();
    

    const wormUnit = sim.units.find(u => u.id === 'meso1');
    if (wormUnit) {
      sim.queuedCommands.push({
        type: 'meta',
        params: {
          unitId: wormUnit.id,
          intendedMove: { x: 2, y: 1 }
        }
      });
    }
    
    const segmentsBefore = sim.units
      .filter(u => u.meta.segment && u.meta.parentId === 'meso1')
      .map(s => ({ id: s.id, pos: { ...s.pos } }));
    


    
    sim.step();
    
    const segmentsAfter = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'meso1');

    
    segmentsAfter.forEach((segment, i) => {
      const before = segmentsBefore[i];
      if (before) {

      }
    });
    
    expect(segmentsAfter.length).toBe(2);
  });

  it('should test mesoworm health and damage', () => {
    const sim = new Simulator(20, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 10, y: 8 } };
    sim.addUnit(mesoworm);
    
    sim.step(); // Create segments
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'meso1');
    


    segments.forEach((segment, i) => {

    });
    

    if (segments.length > 0) {
      const firstSegment = segments[0];
      sim.queuedCommands.push({
        type: 'damage',
        params: {
          unitId: firstSegment.id,
          amount: 10,
          aspect: 'physical'
        }
      });
      


      
      sim.step(); // Process damage propagation
      
      const headUnit = sim.units.find(u => u.id === 'meso1');

    }
    
    expect(segments.length).toBe(2);
  });
});