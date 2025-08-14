import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { GrapplingPhysics } from '../../src/rules/grappling_physics';

describe('Dynamic Grappling Scenarios', () => {
  it('should create kinematic chain scenarios with multiple grapplers', () => {
    const sim = new Simulator(30, 20);
    sim.rulebook = [new GrapplingPhysics(sim)];
    
    // Create a kinematic chain: Grappler1 -> MediumWorm -> Grappler2 -> LargeWorm
    const mediumWorm = { ...Encyclopaedia.unit('desert-worm'), id: 'medworm', pos: { x: 15, y: 10 } };
    const largeWorm = { ...Encyclopaedia.unit('giant-sandworm'), id: 'bigworm', pos: { x: 25, y: 10 } };
    const grappler1 = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 10 } };
    const grappler2 = { ...Encyclopaedia.unit('grappler'), id: 'grap2', pos: { x: 20, y: 10 } };
    
    [mediumWorm, largeWorm, grappler1, grappler2].forEach(u => sim.addUnit(u));
    
    console.log('🔗 KINEMATIC CHAIN SETUP:');
    console.log(`Medium worm: ${mediumWorm.mass} mass (grappable)`);
    console.log(`Large worm: ${largeWorm.mass} mass (pinnable only)`);
    console.log(`Distance grap1->medworm: ${Math.abs(grappler1.pos.x - mediumWorm.pos.x)}`);
    console.log(`Distance grap2->bigworm: ${Math.abs(grappler2.pos.x - largeWorm.pos.x)}`);
    
    // Create grapple lines manually for testing
    const grapplingPhysics = sim.rulebook[0] as GrapplingPhysics;
    
    // Chain 1: Grappler1 grapples medium worm (should pull it)
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
    
    // Chain 2: Grappler2 grapples large worm (should pin it)
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
    
    // Mark targets as grappled
    mediumWorm.meta.grappled = true;
    mediumWorm.meta.grappledBy = 'grap1';
    largeWorm.meta.grappled = true;
    largeWorm.meta.grappledBy = 'grap2';
    
    // Run physics
    console.log('\n⚡ PHYSICS SIMULATION:');
    for (let step = 0; step < 3; step++) {
      const beforePos = sim.units.map(u => ({ id: u.id, pos: { ...u.pos }, mass: u.mass }));
      
      grapplingPhysics.apply();
      
      console.log(`\nStep ${step + 1}:`);
      sim.units.forEach(u => {
        const before = beforePos.find(b => b.id === u.id);
        if (before) {
          const moved = before.pos.x !== u.pos.x || before.pos.y !== u.pos.y;
          if (moved) {
            console.log(`  ${u.id} (${u.mass}mass): (${before.pos.x},${before.pos.y}) → (${u.pos.x},${u.pos.y})`);
          }
          if (u.meta.pinned) {
            console.log(`  ${u.id}: PINNED`);
          }
        }
      });
    }
    
    expect(sim.units.length).toBe(4);
  });

  it('should test worm segment grappling creates interesting dynamics', () => {
    const sim = new Simulator(25, 15);
    
    // Create a medium worm with segments
    const worm = { ...Encyclopaedia.unit('desert-worm'), id: 'worm1', pos: { x: 15, y: 8 } };
    const grappler1 = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 8 } };
    const grappler2 = { ...Encyclopaedia.unit('grappler'), id: 'grap2', pos: { x: 12, y: 8 } };
    
    sim.addUnit(worm);
    sim.addUnit(grappler1);
    sim.addUnit(grappler2);
    
    // Create segments
    sim.step();
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'worm1');
    console.log(`\n🐍 WORM SEGMENT DYNAMICS:`);
    console.log(`Created ${segments.length} segments for worm`);
    
    // Try grappling different segments
    if (segments.length >= 2) {
      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];
      
      console.log(`Grappling segment ${firstSegment.meta.segmentIndex} and ${lastSegment.meta.segmentIndex}`);
      
      // Apply grappling to segments
      firstSegment.meta.grappled = true;
      firstSegment.meta.grappledBy = 'grap1';
      lastSegment.meta.grappled = true; 
      lastSegment.meta.grappledBy = 'grap2';
      
      // Run a few steps to see segment slowdown effects
      for (let i = 0; i < 3; i++) {
        sim.step();
      }
      
      // Check if worm movement is affected
      const wormUnit = sim.units.find(u => u.id === 'worm1');
      console.log(`Worm slowdown: ${wormUnit?.meta.segmentSlowdown || 0}`);
      console.log(`Worm move speed: ${wormUnit?.meta.moveSpeed || 1.0}`);
    }
    
    expect(segments.length).toBe(worm.meta.segmentCount);
  });

  it('should test multi-grappler coordinated takedown', () => {
    const sim = new Simulator(30, 20);
    
    // Create a challenging target - something between small and massive  
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
    
    console.log('\n🎯 COORDINATED TAKEDOWN:');
    console.log(`Target: ${target.hp}hp, ${target.mass} mass`);
    console.log(`Grapplers: ${grapplers.length} units surrounding target`);
    
    // Create segments first
    sim.step();
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'target');
    console.log(`Target has ${segments.length} segments`);
    
    // Simulate multiple grapples hitting different segments
    segments.forEach((segment, i) => {
      if (i < grapplers.length) {
        segment.meta.grappled = true;
        segment.meta.grappledBy = grapplers[i].id;
        console.log(`Segment ${segment.meta.segmentIndex} grappled by ${grapplers[i].id}`);
      }
    });
    
    // Run simulation to see compound effects
    for (let step = 0; step < 5; step++) {
      sim.step();
      
      const targetUnit = sim.units.find(u => u.id === 'target');
      if (targetUnit?.meta.segmentSlowdown) {
        console.log(`Step ${step + 1}: Target slowdown = ${targetUnit.meta.segmentSlowdown}`);
      }
    }
    
    const finalTarget = sim.units.find(u => u.id === 'target');
    expect(finalTarget?.meta.segmentSlowdown).toBeGreaterThan(0);
  });
});