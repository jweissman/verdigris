import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Basic Segmented Creatures', () => {
  it('should test existing segmented worms work properly', () => {
    const sim = new Simulator(20, 15);
    

    const regularWorm = Encyclopaedia.unit('segmented-worm');
    const mimicWorm = Encyclopaedia.unit('mimic-worm');
    const desertWorm = Encyclopaedia.unit('desert-worm');
    




    

    const testWorm = { ...desertWorm, id: 'testworm1', pos: { x: 10, y: 8 } };
    sim.addUnit(testWorm);
    

    const unitsBefore = sim.units.map(u => ({ ...u, pos: { ...u.pos } }));
    
    sim.step();
    
    sim._debugUnits(unitsBefore, 'Segmentation Phase');
    

    const allUnits = sim.units;
    const wormUnits = allUnits.filter(u => u.id.includes('testworm'));
    const segments = allUnits.filter(u => u.meta.segment && u.meta.parentId === 'testworm1');
    

    
    expect(segments.length).toBe(desertWorm.meta.segmentCount);
    expect(wormUnits.length).toBe(desertWorm.meta.segmentCount + 1);
  });

  it('should test grappling a mid-sized worm', () => {
    const sim = new Simulator(20, 15);
    

    const worm = { ...Encyclopaedia.unit('desert-worm'), id: 'worm1', pos: { x: 15, y: 8 } };
    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grappler1', pos: { x: 5, y: 8 } };
    
    sim.addUnit(worm);
    sim.addUnit(grappler);
    



    

    sim.step();
    sim.step();
    

    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'worm1');

    
    expect(worm.mass).toBeLessThan(30); // Should be grappable
    expect(segments.length).toBe(worm.meta.segmentCount);
  });

  it('should create a proper mid-sized worm for testing', () => {





    
    const small = Encyclopaedia.unit('segmented-worm');
    const medium = Encyclopaedia.unit('desert-worm');
    const large = Encyclopaedia.unit('giant-sandworm');
    const massive = Encyclopaedia.unit('desert-megaworm');
    





    

    expect(small.mass).toBeLessThan(medium.mass);
    expect(medium.mass).toBeLessThan(large.mass);
    expect(small.meta.segmentCount).toBeLessThanOrEqual(medium.meta.segmentCount);
    expect(medium.meta.segmentCount).toBeLessThanOrEqual(large.meta.segmentCount);
    

    expect(medium.mass).toBeGreaterThan(1); // Substantial
    expect(medium.mass).toBeLessThan(30); // But grappable
    expect(medium.meta.segmentCount).toBeGreaterThan(2); // Multi-segment
  });

  it('should test segment following behavior', () => {
    const sim = new Simulator(25, 15);
    
    const worm = { ...Encyclopaedia.unit('desert-worm'), id: 'worm1', pos: { x: 10, y: 8 } };
    sim.addUnit(worm);
    

    sim.step();
    

    const wormUnit = sim.units.find(u => u.id === 'worm1');
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
      .filter(u => u.meta.segment && u.meta.parentId === 'worm1')
      .map(s => ({ id: s.id, pos: { ...s.pos } }));
    

    sim.step();
    
    const segmentsAfter = sim.units
      .filter(u => u.meta.segment && u.meta.parentId === 'worm1');
    


    

    expect(segmentsAfter.length).toBe(worm.meta.segmentCount);
    segmentsAfter.forEach(segment => {
      expect(segment.meta.parentId).toBe('worm1');
      expect(segment.meta.segmentIndex).toBeGreaterThan(0);
    });
  });
});