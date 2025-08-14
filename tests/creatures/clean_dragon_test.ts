import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Clean Dragon Test', () => {
  it('should create exactly 1 dragon + 8 segments', () => {
    const sim = new Simulator(20, 15);
    
    // Create ONLY a dragon, no other units
    const dragon = { ...Encyclopaedia.unit('dragon'), id: 'dragon1', pos: { x: 10, y: 8 } };
    sim.addUnit(dragon);
    
    console.log('🐉 CLEAN DRAGON TEST:');
    console.log(`Initial: ${sim.units.length} units`);
    console.log(`Dragon segment count: ${dragon.meta.segmentCount}`);
    
    // Run exactly one step
    sim.step();
    
    const allUnits = sim.units;
    const dragonUnits = allUnits.filter(u => u.id.includes('dragon'));
    const segments = allUnits.filter(u => u.meta.segment && u.meta.parentId === 'dragon1');
    
    console.log(`After 1 step: ${allUnits.length} total units`);
    console.log(`Dragon units: ${dragonUnits.length}`);
    console.log(`Dragon segments: ${segments.length}`);
    
    // List all units for debugging
    console.log('All units:');
    allUnits.forEach(u => {
      console.log(`  ${u.id}: ${u.sprite}, segment=${u.meta.segment || false}, parent=${u.meta.parentId || 'none'}`);
    });
    
    expect(segments.length).toBe(8);
    expect(dragonUnits.length).toBe(12); // 1 head + 3 phantoms + 8 segments
  });

  it('should test the specific multi-creature bug', () => {
    const sim = new Simulator(30, 20);
    
    // Add units one by one and see where it breaks
    const dragon = { ...Encyclopaedia.unit('dragon'), id: 'dragon1', pos: { x: 15, y: 10 } };
    const lancer1 = { ...Encyclopaedia.unit('lancer'), id: 'lancer1', pos: { x: 5, y: 10 } };
    
    sim.addUnit(dragon);
    console.log('\n🔍 MULTI-CREATURE BUG DEBUG:');
    console.log(`After adding dragon: ${sim.units.length} units`);
    
    sim.addUnit(lancer1);
    console.log(`After adding lancer: ${sim.units.length} units`);
    
    // Step once
    sim.step();
    
    const dragonSegments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'dragon1');
    const allDragonUnits = sim.units.filter(u => u.id.includes('dragon'));
    
    console.log(`After step: ${sim.units.length} total units`);
    console.log(`Dragon segments: ${dragonSegments.length}`);
    console.log(`All dragon units: ${allDragonUnits.length}`);
    
    // The issue might be that multiple units have 'dragon' in their ID somehow
    console.log('Units with "dragon" in ID:');
    allDragonUnits.forEach(u => {
      console.log(`  ${u.id}: sprite=${u.sprite}, segment=${u.meta.segment || false}`);
    });
  });
});