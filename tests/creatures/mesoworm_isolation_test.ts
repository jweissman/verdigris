import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Mesoworm Isolation Test', () => {
  it('should test mesoworm basic functionality', () => {
    const sim = new Simulator(20, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 10, y: 8 } };
    sim.addUnit(mesoworm);
    
    console.log('🐛 MESOWORM ISOLATION:');
    console.log(`Mesoworm: ${mesoworm.hp}hp, ${mesoworm.meta.segmentCount} segments`);
    console.log(`Custom sprites: ${mesoworm.meta.useCustomSegmentSprites}`);
    console.log(`Move speed: ${mesoworm.meta.moveSpeed}`);
    
    console.log(`\nBefore step: ${sim.units.length} units`);
    
    sim.step();
    
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'meso1');
    console.log(`After step: ${sim.units.length} units, ${segments.length} segments`);
    
    // Check segment properties
    segments.forEach((segment, i) => {
      console.log(`  Segment ${i+1}: sprite=${segment.sprite}, index=${segment.meta.segmentIndex}, type=${segment.meta.segmentType}`);
    });
    
    expect(segments.length).toBe(2);
    expect(segments.every(s => s.sprite.includes('mesoworm'))).toBe(true);
  });

  it('should test mesoworm movement and segment following', () => {
    const sim = new Simulator(20, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 10, y: 8 } };
    sim.addUnit(mesoworm);
    
    // Create segments
    sim.step();
    
    // Move the mesoworm
    const wormUnit = sim.units.find(u => u.id === 'meso1');
    if (wormUnit) {
      wormUnit.intendedMove = { x: 2, y: 1 };
    }
    
    const segmentsBefore = sim.units
      .filter(u => u.meta.segment && u.meta.parentId === 'meso1')
      .map(s => ({ id: s.id, pos: { ...s.pos } }));
    
    console.log('\n🚶 MESOWORM MOVEMENT:');
    console.log(`Before movement: worm at (${wormUnit?.pos.x}, ${wormUnit?.pos.y})`);
    
    sim.step();
    
    const segmentsAfter = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'meso1');
    console.log(`After movement: worm at (${wormUnit?.pos.x}, ${wormUnit?.pos.y})`);
    
    segmentsAfter.forEach((segment, i) => {
      const before = segmentsBefore[i];
      if (before) {
        console.log(`  Segment ${i+1}: (${before.pos.x}, ${before.pos.y}) → (${segment.pos.x}, ${segment.pos.y})`);
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
    
    console.log('\n💖 MESOWORM HEALTH:');
    console.log(`Head HP: ${mesoworm.hp}/${mesoworm.maxHp}`);
    segments.forEach((segment, i) => {
      console.log(`Segment ${i+1} HP: ${segment.hp}/${segment.maxHp}`);
    });
    
    // Damage a segment and see if it propagates
    if (segments.length > 0) {
      const firstSegment = segments[0];
      firstSegment.hp -= 10;
      firstSegment.meta.damageTaken = 10;
      
      console.log(`\nAfter damaging segment 1 by 10:`);
      console.log(`Segment 1 HP: ${firstSegment.hp}/${firstSegment.maxHp}`);
      
      sim.step(); // Process damage propagation
      
      const headUnit = sim.units.find(u => u.id === 'meso1');
      console.log(`Head HP after propagation: ${headUnit?.hp}/${headUnit?.maxHp}`);
    }
    
    expect(segments.length).toBe(2);
  });
});