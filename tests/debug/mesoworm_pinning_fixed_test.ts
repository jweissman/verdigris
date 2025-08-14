import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Mesoworm Pinning Fixed Test', () => {
  it('should test grappler pinning mechanics with proper range', () => {
    const sim = new Simulator(20, 15);
    
    // Place units closer together - grappler range is 8
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 12, y: 8 } };
    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 8 } };
    
    sim.addUnit(mesoworm);
    sim.addUnit(grappler);
    
    console.log('🪝 MESOWORM PINNING TEST (PROPER RANGE):');
    console.log(`Mesoworm: ${mesoworm.hp}hp, mass ${mesoworm.mass}, ${mesoworm.meta.segmentCount} segments`);
    console.log(`Grappler: ${grappler.hp}hp, range ${grappler.meta.grapplingRange}`);
    console.log(`Distance: ${Math.abs(mesoworm.pos.x - grappler.pos.x)} (should be <= ${grappler.meta.grapplingRange})`);
    
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
      for (let step = 1; step <= 6; step++) {
        console.log(`\\n--- STEP ${step} ---`);
        
        sim.step();
        
        // Check for projectiles
        const grapples = sim.projectiles.filter(p => p.type === 'grapple');
        console.log(`Grapple projectiles: ${grapples.length}`);
        if (grapples.length > 0) {
          grapples.forEach(g => {
            console.log(`  Grapple from (${g.pos.x.toFixed(1)}, ${g.pos.y.toFixed(1)}) to (${g.target.x}, ${g.target.y})`);
          });
        }
        
        // Check mesoworm state
        console.log(`Mesoworm head:`);
        console.log(`  Pos: (${mesowormUnit.pos.x}, ${mesowormUnit.pos.y})`);
        console.log(`  Grappled: ${mesowormUnit.meta.grappled || false}`);
        console.log(`  Pinned: ${mesowormUnit.meta.pinned || false}`);
        console.log(`  Stunned: ${mesowormUnit.meta.stunned || false}`);
        console.log(`  Speed: ${mesowormUnit.meta.moveSpeed || 'default'}`);
        console.log(`  Slowdown: ${mesowormUnit.meta.segmentSlowdown || 'none'}`);
        
        // Check segment states
        const grappledSegments = segments.filter(s => s.meta.grappled || s.meta.pinned);
        console.log(`Grappled segments: ${grappledSegments.length}/${segments.length}`);
        grappledSegments.forEach(s => {
          console.log(`  ${s.id}: grappled=${s.meta.grappled || false}, pinned=${s.meta.pinned || false}`);
        });
        
        // Check overall effect
        const totalGrappled = (mesowormUnit.meta.grappled || mesowormUnit.meta.pinned ? 1 : 0) + grappledSegments.length;
        console.log(`Total grappled units: ${totalGrappled}`);
        
        if (mesowormUnit.meta.stunned) {
          console.log(`🔒 MESOWORM IS STUNNED! (immobilized)`);
          break;
        }
        
        if (totalGrappled > 0 && !mesowormUnit.meta.stunned) {
          console.log(`⚠️ Mesoworm is partially grappled but not stunned`);
        }
      }
    }
    
    expect(segments.length).toBe(2);
  });
  
  it('should test multiple grapplers needed to fully pin mesoworm', () => {
    const sim = new Simulator(25, 15);
    
    // Multiple grapplers vs mesoworm
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 15, y: 8 } };
    const grappler1 = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 8, y: 8 } };
    const grappler2 = { ...Encyclopaedia.unit('grappler'), id: 'grap2', pos: { x: 8, y: 9 } };
    
    sim.addUnit(mesoworm);
    sim.addUnit(grappler1);
    sim.addUnit(grappler2);
    
    console.log('\\n🪝🪝 MULTIPLE GRAPPLER PINNING TEST:');
    console.log(`Mesoworm: ${mesoworm.meta.segmentCount} segments`);
    console.log(`Testing if multiple grapplers are needed to fully pin mesoworm`);
    
    // Create segments
    sim.step();
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'meso1');
    const mesowormUnit = sim.units.find(u => u.id === 'meso1');
    
    // Force both grapplers to target different parts
    const grapplerUnit1 = sim.units.find(u => u.id === 'grap1');
    const grapplerUnit2 = sim.units.find(u => u.id === 'grap2');
    
    if (grapplerUnit1 && grapplerUnit2 && mesowormUnit && segments.length >= 1) {
      console.log(`\\nGrappler 1 targets head at (${mesowormUnit.pos.x}, ${mesowormUnit.pos.y})`);
      console.log(`Grappler 2 targets segment at (${segments[0].pos.x}, ${segments[0].pos.y})`);
      
      sim.forceAbility(grapplerUnit1.id, 'grapplingHook', mesowormUnit.pos);
      sim.forceAbility(grapplerUnit2.id, 'grapplingHook', segments[0].pos);
      
      // Run several steps
      for (let step = 1; step <= 6; step++) {
        console.log(`\\nMulti-grapple step ${step}:`);
        sim.step();
        
        const grapples = sim.projectiles.filter(p => p.type === 'grapple');
        const grappledHead = mesowormUnit.meta.grappled || mesowormUnit.meta.pinned;
        const grappledSegments = segments.filter(s => s.meta.grappled || s.meta.pinned);
        const totalGrappled = (grappledHead ? 1 : 0) + grappledSegments.length;
        
        console.log(`  Active grapples: ${grapples.length}`);
        console.log(`  Head grappled: ${grappledHead}`);
        console.log(`  Segments grappled: ${grappledSegments.length}/${segments.length}`);
        console.log(`  Total grappled: ${totalGrappled}/${segments.length + 1}`);
        console.log(`  Mesoworm stunned: ${mesowormUnit.meta.stunned || false}`);
        
        if (grappledSegments.length > 0) {
          grappledSegments.forEach(s => {
            console.log(`    ${s.id}: grappled=${s.meta.grappled || false}, pinned=${s.meta.pinned || false}`);
          });
        }
        
        // Check for full immobilization
        if (mesowormUnit.meta.stunned) {
          console.log(`  🎯 SUCCESS! Mesoworm fully immobilized with ${totalGrappled} pinned units`);
          console.log(`  Required ${totalGrappled} grappled units to achieve full pin`);
          break;
        } else if (totalGrappled > 0) {
          console.log(`  ⚡ Partial success: ${totalGrappled} units grappled, but mesoworm not stunned yet`);
        }
      }
      
      // Final analysis
      const finalGrappledHead = mesowormUnit.meta.grappled || mesowormUnit.meta.pinned;
      const finalGrappledSegments = segments.filter(s => s.meta.grappled || s.meta.pinned);
      const finalTotal = (finalGrappledHead ? 1 : 0) + finalGrappledSegments.length;
      
      console.log(`\\n📊 FINAL PINNING ANALYSIS:`);
      console.log(`  Mesoworm segments: ${segments.length}`);
      console.log(`  Units grappled: ${finalTotal}/${segments.length + 1}`);
      console.log(`  Immobilized: ${mesowormUnit.meta.stunned || false}`);
      console.log(`  Conclusion: ${finalTotal >= 2 ? 'Multiple grapplers required ✅' : 'Single grappler sufficient ❌'}`);
    }
    
    expect(segments.length).toBe(2);
  });
});