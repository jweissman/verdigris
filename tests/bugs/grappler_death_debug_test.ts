import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Grappler Death Debug', () => {
  it('should test big-worm vs grappler to find death cause', () => {
    const sim = new Simulator(25, 15);
    
    const bigWorm = { ...Encyclopaedia.unit('big-worm'), id: 'bigworm1', pos: { x: 18, y: 8 } };
    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 8 } };
    
    sim.addUnit(bigWorm);
    sim.addUnit(grappler);
    
    console.log('⚔️ BIG-WORM VS GRAPPLER DEBUG:');
    console.log(`Big-worm: ${bigWorm.hp}hp, mass ${bigWorm.mass}, ${bigWorm.meta.segmentCount} segments`);
    console.log(`Grappler: ${grappler.hp}hp, mass ${grappler.mass}`);
    console.log(`Distance: ${Math.abs(bigWorm.pos.x - grappler.pos.x)}`);
    
    // Track step by step what happens
    for (let step = 1; step <= 8; step++) {
      const beforeUnits = sim.units.map(u => ({ 
        id: u.id, 
        hp: u.hp, 
        pos: { ...u.pos },
        state: u.state,
        grappled: u.meta.grappled || false
      }));
      
      console.log(`\n--- STEP ${step} ---`);
      console.log(`Before: ${beforeUnits.length} units`);
      
      sim.step();
      
      console.log(`After: ${sim.units.length} units`);
      
      // Track all changes
      sim.units.forEach(u => {
        const before = beforeUnits.find(b => b.id === u.id);
        if (before) {
          const hpChanged = before.hp !== u.hp;
          const moved = before.pos.x !== u.pos.x || before.pos.y !== u.pos.y;
          const stateChanged = before.state !== u.state;
          const grappledChanged = before.grappled !== (u.meta.grappled || false);
          
          if (hpChanged || moved || stateChanged || grappledChanged) {
            let changes = [];
            if (hpChanged) changes.push(`${before.hp}→${u.hp}hp`);
            if (moved) changes.push(`(${before.pos.x},${before.pos.y})→(${u.pos.x},${u.pos.y})`);
            if (stateChanged) changes.push(`${before.state}→${u.state}`);
            if (grappledChanged) changes.push(`grappled: ${before.grappled}→${u.meta.grappled || false}`);
            
            console.log(`  ${u.id}: ${changes.join(', ')}`);
          }
          
          if (u.hp <= 0 && before.hp > 0) {
            console.log(`  💀 ${u.id} JUST DIED! (${before.hp}→${u.hp})`);
          }
        } else {
          console.log(`  ➕ ${u.id}: NEW UNIT (${u.hp}hp)`);
        }
      });
      
      // Check for removed units
      beforeUnits.forEach(before => {
        const after = sim.units.find(u => u.id === before.id);
        if (!after) {
          console.log(`  ➖ ${before.id}: REMOVED`);
        }
      });
      
      // Check projectiles
      const grapples = sim.projectiles.filter(p => p.type === 'grapple');
      if (grapples.length > 0) {
        console.log(`  🪝 ${grapples.length} grapple projectiles active`);
      }
      
      // Check for damage events
      const damageEvents = sim.processedEvents?.filter(e => e.kind === 'damage') || [];
      if (damageEvents.length > 0) {
        console.log(`  💥 ${damageEvents.length} damage events processed`);
        damageEvents.forEach(event => {
          console.log(`    → ${event.meta.amount} damage to ${event.targetId || 'unknown'}`);
        });
      }
      
      // Stop if grappler dies
      const grapplerAlive = sim.units.find(u => u.id === 'grap1' && u.hp > 0);
      if (!grapplerAlive) {
        console.log(`\n☠️ GRAPPLER DIED ON STEP ${step}!`);
        break;
      }
    }
    
    const finalGrappler = sim.units.find(u => u.id === 'grap1');
    const finalBigWorm = sim.units.find(u => u.id === 'bigworm1');
    
    console.log('\n📊 FINAL STATUS:');
    console.log(`Grappler: ${finalGrappler ? `${finalGrappler.hp}hp, state=${finalGrappler.state}` : 'REMOVED'}`);
    console.log(`Big-worm: ${finalBigWorm ? `${finalBigWorm.hp}hp, state=${finalBigWorm.state}` : 'REMOVED'}`);
    
    expect(sim.units.length).toBeGreaterThan(0);
  });

  it('should test desert-megaworm vs grappler', () => {
    const sim = new Simulator(30, 20);
    
    const megaWorm = { ...Encyclopaedia.unit('desert-megaworm'), id: 'megaworm1', pos: { x: 20, y: 10 } };
    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grap1', pos: { x: 5, y: 10 } };
    
    sim.addUnit(megaWorm);
    sim.addUnit(grappler);
    
    console.log('\n🏜️ DESERT-MEGAWORM VS GRAPPLER:');
    console.log(`Desert-megaworm: ${megaWorm.hp}hp, mass ${megaWorm.mass}, ${megaWorm.meta.segmentCount} segments`);
    console.log(`Grappler: ${grappler.hp}hp`);
    
    // Run just a few steps to see if grappler survives
    for (let step = 1; step <= 3; step++) {
      console.log(`\nStep ${step}:`);
      const beforeGrapplerHp = sim.units.find(u => u.id === 'grap1')?.hp || 0;
      
      sim.step();
      
      const afterGrapplerHp = sim.units.find(u => u.id === 'grap1')?.hp || 0;
      console.log(`Grappler HP: ${beforeGrapplerHp} → ${afterGrapplerHp}`);
      
      if (afterGrapplerHp <= 0) {
        console.log('☠️ Grappler died!');
        break;
      }
    }
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'megaworm1');
    console.log(`Megaworm created ${segments.length} segments`);
    
    expect(sim.units.length).toBeGreaterThan(0);
  });
});