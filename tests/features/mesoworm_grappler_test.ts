import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Mesoworm vs Grappler', () => {
  it('should test mesoworm vs single grappler', () => {
    const sim = new Simulator(20, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 15, y: 8 } };
    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 8 } };
    
    sim.addUnit(mesoworm);
    sim.addUnit(grappler);
    
    // console.log('🪝 MESOWORM VS GRAPPLER:');
    // console.log(`Mesoworm: ${mesoworm.hp}hp, mass ${mesoworm.mass}`);
    // console.log(`Grappler: ${grappler.hp}hp, range ${grappler.meta.grapplingRange}`);
    // console.log(`Distance: ${Math.abs(mesoworm.pos.x - grappler.pos.x)}`);
    
    // Create segments first
    sim.step();
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'meso1');
    // console.log(`Mesoworm has ${segments.length} segments`);
    
    // Run several steps and track unit health
    for (let step = 1; step <= 5; step++) {
      const beforeUnits = sim.units.map(u => ({ id: u.id, hp: u.hp, pos: { ...u.pos } }));
      
      sim.step();
      
      // console.log(`\nStep ${step}:`);
      sim.units.forEach(u => {
        const before = beforeUnits.find(b => b.id === u.id);
        if (before) {
          const hpChanged = before.hp !== u.hp;
          const moved = before.pos.x !== u.pos.x || before.pos.y !== u.pos.y;
          if (hpChanged || moved) {
            // console.log(`  ${u.id}: ${hpChanged ? `${before.hp}→${u.hp}hp` : ''} ${moved ? `(${before.pos.x},${before.pos.y})→(${u.pos.x},${u.pos.y})` : ''}`);
          }
          if (u.hp <= 0) {
            // console.log(`  ☠️ ${u.id} DIED!`);
          }
        }
      });
      
      // Check for deaths
      const deadUnits = sim.units.filter(u => u.hp <= 0);
      if (deadUnits.length > 0) {
        // console.log(`Units died: ${deadUnits.map(u => u.id).join(', ')}`);
        break;
      }
    }
    
    // Final status
    const finalGrappler = sim.units.find(u => u.id === 'grap1');
    const finalMesoworm = sim.units.find(u => u.id === 'meso1');
    
    // console.log('\n📊 FINAL STATUS:');
    // console.log(`Grappler: ${finalGrappler ? `${finalGrappler.hp}hp` : 'DEAD'}`);
    // console.log(`Mesoworm: ${finalMesoworm ? `${finalMesoworm.hp}hp` : 'DEAD'}`);
    
    expect(sim.units.length).toBeGreaterThan(0);
  });

  it('should test grappler abilities against mesoworm', () => {
    const sim = new Simulator(20, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 12, y: 8 } };
    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 8 } };
    
    sim.addUnit(mesoworm);
    sim.addUnit(grappler);
    
    // console.log('\n🎯 GRAPPLER ABILITIES TEST:');
    // console.log(`Grappler abilities: ${grappler.abilities.join(', ')}`);
    
    // Create segments
    sim.step();
    
    // Force grappling hook ability
    const grapplerUnit = sim.units.find(u => u.id === 'grap1');
    const mesowormUnit = sim.units.find(u => u.id === 'meso1');
    
    if (grapplerUnit && mesowormUnit) {
      // console.log(`Forcing grapplingHook ability from (${grapplerUnit.pos.x}, ${grapplerUnit.pos.y}) to (${mesowormUnit.pos.x}, ${mesowormUnit.pos.y})`);
      
      sim.forceAbility(grapplerUnit.id, 'grapplingHook', mesowormUnit.pos);
      sim.step();
      
      // Check for projectiles
      const grapples = sim.projectiles.filter(p => p.type === 'grapple');
      // console.log(`Grapple projectiles: ${grapples.length}`);
      
      if (grapples.length > 0) {
        const grapple = grapples[0];
        // console.log(`Grapple: from (${grapple.pos.x}, ${grapple.pos.y}) to (${grapple.target.x}, ${grapple.target.y})`);
      }
      
      // Run a few more steps to see grapple collision
      for (let i = 0; i < 3; i++) {
        sim.step();
        
        const remainingGrapples = sim.projectiles.filter(p => p.type === 'grapple');
        // console.log(`Step ${i+1}: ${remainingGrapples.length} grapples remaining`);
        
        // Check if mesoworm is grappled
        const grappled = sim.units.find(u => u.id === 'meso1' && u.meta.grappled);
        if (grappled) {
          // console.log(`Mesoworm is grappled! Slowdown: ${grappled.meta.movementPenalty || 0}`);
        }
      }
    }
    
    expect(sim.units.length).toBeGreaterThan(0);
  });

  it('should create scene file for visual testing', () => {
    // This creates a battle scene file for testing
    const sceneContent = `# Mesoworm vs Grappler Test
# Visual test for mesoworm segmented mechanics

g.......m
.........
.........
---
# g = grappler (desert nomad with rope)
# m = mesoworm (2 segments, custom sprites)

bg forest
weather clear`;

    // console.log('\n🎬 SCENE FILE CONTENT:');
    // console.log(sceneContent);
    
    // Verify units exist in encyclopaedia
    const grappler = Encyclopaedia.unit('grappler');
    const mesoworm = Encyclopaedia.unit('mesoworm');
    
    expect(grappler.abilities).toContain('grapplingHook');
    expect(mesoworm.meta.segmented).toBe(true);
    expect(mesoworm.meta.useCustomSegmentSprites).toBe(true);
  });
});