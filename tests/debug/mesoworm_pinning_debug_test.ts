import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Mesoworm Pinning Debug', () => {
  it('should test grappler pinning mechanics against mesoworm segments', () => {
    const sim = new Simulator(20, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 15, y: 8 } };
    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 8 } };
    
    sim.addUnit(mesoworm);
    sim.addUnit(grappler);
    
    console.log('🪝 MESOWORM PINNING DEBUG:');
    console.log(`Mesoworm: ${mesoworm.hp}hp, mass ${mesoworm.mass}, ${mesoworm.meta.segmentCount} segments`);
    console.log(`Grappler: ${grappler.hp}hp, range ${grappler.meta.grapplingRange}`);
    console.log(`Distance: ${Math.abs(mesoworm.pos.x - grappler.pos.x)}`);
    
    // Create segments first
    console.log(`\\nStep 0: Creating segments`);
    sim.step();
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'meso1');
    console.log(`Segments created: ${segments.length}`);
    segments.forEach(s => {
      console.log(`  ${s.id}: type=${s.meta.segmentType}, pos=(${s.pos.x},${s.pos.y})`);
    });
    
    // Force grapple the mesoworm head
    const grapplerUnit = sim.units.find(u => u.id === 'grap1');
    const mesowormUnit = sim.units.find(u => u.id === 'meso1');
    
    if (grapplerUnit && mesowormUnit) {
      console.log(`\\nForcing grapple from (${grapplerUnit.pos.x}, ${grapplerUnit.pos.y}) to (${mesowormUnit.pos.x}, ${mesowormUnit.pos.y})`);
      sim.forceAbility(grapplerUnit.id, 'grapplingHook', mesowormUnit.pos);
      
      // Run steps to let grapple connect
      for (let step = 1; step <= 5; step++) {
        console.log(`\\n--- STEP ${step} ---`);
        
        const beforeState = {
          mesoworm: {
            pos: { ...mesowormUnit.pos },
            grappled: mesowormUnit.meta.grappled || false,
            pinned: mesowormUnit.meta.pinned || false,
            stunned: mesowormUnit.meta.stunned || false,
            moveSpeed: mesowormUnit.meta.moveSpeed
          },
          segments: segments.map(s => ({
            id: s.id,
            pos: { ...s.pos },
            grappled: s.meta.grappled || false,
            pinned: s.meta.pinned || false
          }))
        };
        
        sim.step();
        
        // Check for projectiles
        const grapples = sim.projectiles.filter(p => p.type === 'grapple');
        console.log(`Grapple projectiles: ${grapples.length}`);
        
        // Check mesoworm state changes
        console.log(`Mesoworm head:`);
        console.log(`  Pos: (${beforeState.mesoworm.pos.x}, ${beforeState.mesoworm.pos.y}) → (${mesowormUnit.pos.x}, ${mesowormUnit.pos.y})`);
        console.log(`  Grappled: ${beforeState.mesoworm.grappled} → ${mesowormUnit.meta.grappled || false}`);
        console.log(`  Pinned: ${beforeState.mesoworm.pinned} → ${mesowormUnit.meta.pinned || false}`);
        console.log(`  Stunned: ${beforeState.mesoworm.stunned} → ${mesowormUnit.meta.stunned || false}`);
        console.log(`  Speed: ${beforeState.mesoworm.moveSpeed} → ${mesowormUnit.meta.moveSpeed}`);
        
        // Check segment states
        console.log(`Segments:`);
        segments.forEach((segment, i) => {
          const before = beforeState.segments[i];
          console.log(`  ${segment.id}:`);
          console.log(`    Pos: (${before.pos.x}, ${before.pos.y}) → (${segment.pos.x}, ${segment.pos.y})`);
          console.log(`    Grappled: ${before.grappled} → ${segment.meta.grappled || false}`);
          console.log(`    Pinned: ${before.pinned} → ${segment.meta.pinned || false}`);
        });
        
        // Check overall slowdown
        const grappledSegments = segments.filter(s => s.meta.grappled || s.meta.pinned).length;
        const headGrappled = mesowormUnit.meta.grappled || mesowormUnit.meta.pinned;
        console.log(`Total grappled units: ${grappledSegments + (headGrappled ? 1 : 0)}`);
        
        if (mesowormUnit.meta.stunned) {
          console.log(`🔒 MESOWORM IS STUNNED! (immobilized)`);
          break;
        }
      }
    }
    
    expect(segments.length).toBe(2);
  });
  
  it('should test multiple grapplers against mesoworm to see pinning threshold', () => {
    const sim = new Simulator(25, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 15, y: 8 } };
    const grappler1 = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 7 } };
    const grappler2 = { ...Encyclopaedia.unit('grappler'), id: 'grap2', pos: { x: 5, y: 9 } };
    
    sim.addUnit(mesoworm);
    sim.addUnit(grappler1);
    sim.addUnit(grappler2);
    
    console.log('\\n🪝🪝 MULTIPLE GRAPPLER TEST:');
    console.log(`Testing if multiple grapplers can fully pin mesoworm`);
    
    // Create segments
    sim.step();
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'meso1');
    const mesowormUnit = sim.units.find(u => u.id === 'meso1');
    
    // Force both grapplers to target different parts
    const grapplerUnit1 = sim.units.find(u => u.id === 'grap1');
    const grapplerUnit2 = sim.units.find(u => u.id === 'grap2');
    
    if (grapplerUnit1 && grapplerUnit2 && mesowormUnit && segments.length >= 1) {
      console.log(`Grappler 1 targets head at (${mesowormUnit.pos.x}, ${mesowormUnit.pos.y})`);
      console.log(`Grappler 2 targets segment at (${segments[0].pos.x}, ${segments[0].pos.y})`);
      
      sim.forceAbility(grapplerUnit1.id, 'grapplingHook', mesowormUnit.pos);
      sim.forceAbility(grapplerUnit2.id, 'grapplingHook', segments[0].pos);
      
      // Run several steps
      for (let step = 1; step <= 4; step++) {
        console.log(`\\nMulti-grapple step ${step}:`);
        sim.step();
        
        const grapples = sim.projectiles.filter(p => p.type === 'grapple');
        const grappledUnits = [mesowormUnit, ...segments].filter(u => u.meta.grappled || u.meta.pinned);
        
        console.log(`  Active grapples: ${grapples.length}`);
        console.log(`  Grappled units: ${grappledUnits.length}`);
        console.log(`  Mesoworm stunned: ${mesowormUnit.meta.stunned || false}`);
        
        if (grappledUnits.length > 0) {
          grappledUnits.forEach(u => {
            console.log(`    ${u.id}: grappled=${u.meta.grappled || false}, pinned=${u.meta.pinned || false}`);
          });
        }
        
        if (mesowormUnit.meta.stunned) {
          console.log(`  🎯 SUCCESS! Mesoworm fully immobilized with ${grappledUnits.length} pinned units`);
          break;
        }
      }
    }
    
    expect(segments.length).toBe(2);
  });
});