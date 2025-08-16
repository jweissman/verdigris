import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { GrapplingPhysics } from '../../src/rules/grappling_physics';

describe('Dynamic Grappling Scenarios', () => {
  it('should create kinematic chain scenarios with multiple grapplers', () => {
    const sim = new Simulator(30, 20);
    

    const mediumWorm = { ...Encyclopaedia.unit('desert-worm'), id: 'medworm', pos: { x: 15, y: 10 } };
    const largeWorm = { ...Encyclopaedia.unit('giant-sandworm'), id: 'bigworm', pos: { x: 25, y: 10 } };
    const grappler1 = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 10 } };
    const grappler2 = { ...Encyclopaedia.unit('grappler'), id: 'grap2', pos: { x: 20, y: 10 } };
    
    [mediumWorm, largeWorm, grappler1, grappler2].forEach(u => sim.addUnit(u));
    

    const grapplingPhysics = sim.rulebook.find(r => r instanceof GrapplingPhysics) as GrapplingPhysics;
    if (!grapplingPhysics) {
      throw new Error('GrapplingPhysics rule not found in rulebook');
    }
    

    (grapplingPhysics as any).grappleLines.set('grap1_medworm', {
      grapplerID: 'grap1',
      targetID: 'medworm',
      startPos: { ...grappler1.pos },
      endPos: { ...mediumWorm.pos },
      length: 10,
      taut: true,
      pinned: false,
      duration: 60
    });
    

    (grapplingPhysics as any).grappleLines.set('grap2_bigworm', {
      grapplerID: 'grap2', 
      targetID: 'bigworm',
      startPos: { ...grappler2.pos },
      endPos: { ...largeWorm.pos },
      length: 5,
      taut: true,
      pinned: false,
      duration: 60
    });
    

    mediumWorm.meta.grappled = true;
    mediumWorm.meta.grappledBy = 'grap1';
    largeWorm.meta.grappled = true;
    largeWorm.meta.grappledBy = 'grap2';
    


    for (let step = 0; step < 3; step++) {
      const beforePos = sim.units.map(u => ({ id: u.id, pos: { ...u.pos }, mass: u.mass }));
      
      const context = sim.getTickContext();
      grapplingPhysics.execute(context);
      

      sim.units.forEach(u => {
        const before = beforePos.find(b => b.id === u.id);
        if (before) {
          const moved = before.pos.x !== u.pos.x || before.pos.y !== u.pos.y;
          if (moved) {

          }
          if (u.meta.pinned) {

          }
        }
      });
    }
    
    expect(sim.units.length).toBe(4);
  });

  it('should test worm segment grappling creates interesting dynamics', () => {
    const sim = new Simulator(25, 15);
    

    const worm = { ...Encyclopaedia.unit('desert-worm'), id: 'worm1', pos: { x: 15, y: 8 } };
    const grappler1 = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 8 } };
    const grappler2 = { ...Encyclopaedia.unit('grappler'), id: 'grap2', pos: { x: 12, y: 8 } };
    
    sim.addUnit(worm);
    sim.addUnit(grappler1);
    sim.addUnit(grappler2);
    

    sim.step();
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'worm1');


    

    if (segments.length >= 2) {
      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];
      

      

      firstSegment.meta.grappled = true;
      firstSegment.meta.grappledBy = 'grap1';
      lastSegment.meta.grappled = true; 
      lastSegment.meta.grappledBy = 'grap2';
      

      for (let i = 0; i < 3; i++) {
        sim.step();
      }
      

      const wormUnit = sim.units.find(u => u.id === 'worm1');


    }
    
    expect(segments.length).toBe(worm.meta.segmentCount);
  });

  it('should test multi-grappler coordinated takedown', () => {
    const sim = new Simulator(30, 20);
    

    const target = { ...Encyclopaedia.unit('desert-worm'), id: 'target', pos: { x: 15, y: 10 } };
    target.hp = 80;
    target.mass = 15; // Tough but not impossible
    
    const grapplers = [
      { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 8 } },
      { ...Encyclopaedia.unit('grappler'), id: 'grap2', pos: { x: 25, y: 8 } },
      { ...Encyclopaedia.unit('grappler'), id: 'grap3', pos: { x: 15, y: 5 } },
      { ...Encyclopaedia.unit('grappler'), id: 'grap4', pos: { x: 15, y: 15 } }
    ];
    
    sim.addUnit(target);
    grapplers.forEach(g => sim.addUnit(g));
    



    

    sim.step();
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'target');

    

    segments.forEach((segment, i) => {
      if (i < grapplers.length) {
        segment.meta.grappled = true;
        segment.meta.grappledBy = grapplers[i].id;

      }
    });
    

    for (let step = 0; step < 5; step++) {
      sim.step();
      
      const targetUnit = sim.units.find(u => u.id === 'target');
      if (targetUnit?.meta.segmentSlowdown) {

      }
    }
    
    const finalTarget = sim.units.find(u => u.id === 'target');
    expect(finalTarget?.meta.segmentSlowdown).toBeGreaterThan(0);
  });
});