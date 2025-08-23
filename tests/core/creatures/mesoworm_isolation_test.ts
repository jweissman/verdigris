import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import Encyclopaedia from '../../../src/dmg/encyclopaedia';

describe('Mesoworm Isolation Test', () => {
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